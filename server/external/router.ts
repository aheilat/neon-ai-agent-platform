import type { Pool } from "pg";
import { addIndependentConversationMessage } from "./agentRepository";
import { completeWithIndependentClaude } from "./claude";
import { normalizeEscalationText } from "./escalationDetection";

/**
 * Multi-agent routing: a "reception" agent hands each customer message to a specialist agent
 * (sales / support / orders) of the same workspace.
 *
 * - The routing table lives in the reception agent's `capabilitiesJson.routing.specialists`.
 *   An agent without it behaves exactly as before.
 * - The intent comes from fixed keywords (Arabic and English) first. Only when a message points at
 *   more than one specialist is the AI asked to choose, so ordinary messages cost no extra AI call.
 * - A follow-up with no clear intent ("كم السعر؟") stays with the current specialist; the conversation
 *   remembers it in `conversations."activeAgentId"`.
 * - Escalation to a human is decided before this runs and always wins.
 */

export const SPECIALIST_ROLES = ["sales", "support", "orders"] as const;
export type SpecialistRole = (typeof SPECIALIST_ROLES)[number];
export type Specialist = { role: SpecialistRole; agentId: number };

export const ROLE_LABELS: Record<SpecialistRole, string> = { sales: "المبيعات", support: "الدعم", orders: "الطلبات" };

const isRole = (value: unknown): value is SpecialistRole => typeof value === "string" && (SPECIALIST_ROLES as readonly string[]).includes(value);

export function parseRoutingConfig(capabilitiesJson: Record<string, unknown> | null | undefined): Specialist[] {
  const routing = capabilitiesJson?.routing;
  const list = routing && typeof routing === "object" ? (routing as { specialists?: unknown }).specialists : undefined;
  if (!Array.isArray(list)) return [];
  const seen = new Set<SpecialistRole>();
  const result: Specialist[] = [];
  for (const item of list) {
    const role = (item as { role?: unknown })?.role;
    const agentId = Number((item as { agentId?: unknown })?.agentId);
    if (!isRole(role) || seen.has(role) || !Number.isSafeInteger(agentId) || agentId <= 0) continue;
    seen.add(role);
    result.push({ role, agentId });
  }
  return result;
}

// Keyword detection ---------------------------------------------------------------
const norm = (list: string[]) => new Set(list.map(normalizeEscalationText));

const WORDS: Record<SpecialistRole, Set<string>> = {
  sales: norm(["سعر", "اسعار", "تسعير", "باقه", "باقات", "اشتراك", "اشتراكات", "خصم", "خصومات", "عرض", "عروض", "تكلفه", "تكاليف", "تجربه", "شراء", "اشتري", "price", "prices", "pricing", "plan", "plans", "subscription", "subscribe", "discount", "quote", "cost", "trial", "buy", "purchase", "demo"]),
  support: norm(["مشكله", "مشاكل", "خطا", "اخطاء", "عطل", "تعطل", "معطل", "problem", "problems", "issue", "issues", "error", "errors", "bug", "broken", "crash", "crashed"]),
  orders: norm(["طلب", "طلبي", "طلبات", "طلبك", "تتبع", "شحن", "شحنه", "توصيل", "فاتوره", "فواتير", "استرجاع", "ارجاع", "الغاء", "استرداد", "order", "orders", "tracking", "track", "shipping", "shipment", "delivery", "refund", "invoice", "cancel", "return"]),
};

const PHRASES: Record<SpecialistRole, string[]> = {
  sales: [],
  support: ["لا يعمل", "لا يشتغل", "ما يشتغل", "ما يعمل", "مش شغال", "دعم فني", "not working", "doesn't work", "does not work", "technical support"].map(normalizeEscalationText),
  orders: [],
};

function stems(token: string) {
  const out = new Set<string>([token]);
  const base = /^[وفبلك]/.test(token) && token.length > 3 ? token.slice(1) : token;
  out.add(base);
  if (token.startsWith("لل") && token.length > 4) out.add(token.slice(2));
  for (const stem of Array.from(out)) if (stem.startsWith("ال") && stem.length > 4) out.add(stem.slice(2));
  return Array.from(out);
}

/** Roles (among `available`) whose keywords appear in the message. */
export function detectRoles(message: string, available: SpecialistRole[]): SpecialistRole[] {
  if (typeof message !== "string" || !message.trim() || message.length > 1_000) return [];
  const normalized = normalizeEscalationText(message);
  const padded = ` ${normalized} `;
  const tokens = normalized.split(" ").filter(Boolean);
  return available.filter(role => PHRASES[role].some(phrase => padded.includes(` ${phrase} `)) || tokens.some(token => stems(token).some(stem => WORDS[role].has(stem))));
}

type Complete = (request: { system: string; messages: Array<{ role: "user"; content: string }>; maxTokens: number; timeoutMs: number }) => Promise<string>;

/** Asked only when a message matches several specialists. Returns undefined on any doubt. */
export async function classifyWithAi(message: string, candidates: SpecialistRole[], complete: Complete = completeWithIndependentClaude): Promise<SpecialistRole | undefined> {
  try {
    const answer = await complete({
      system: `Classify the customer's message into exactly one of: ${candidates.join(", ")}, none. Answer with that single word only.`,
      messages: [{ role: "user", content: message.slice(0, 1_000) }],
      maxTokens: 10,
      timeoutMs: 8_000,
    });
    const word = answer.trim().toLowerCase().replace(/[^a-z]/g, "");
    return candidates.find(role => role === word);
  } catch (error) {
    console.warn("[Router] AI classification failed", error instanceof Error ? error.name : "unknown");
    return undefined;
  }
}

export type RouteResult = { agentId: number; switched: boolean };

type ReceptionAgent = { id: number; tenantId: number; capabilitiesJson?: Record<string, unknown> | null };

/**
 * Decides which agent answers this message, and records a change of specialist on the conversation.
 * Always resolves: on any failure the reception agent answers.
 */
export async function routeIndependentConversation(
  pool: Pool,
  input: { agent: ReceptionAgent; conversationId: number; message: string; classify?: typeof classifyWithAi },
): Promise<RouteResult> {
  const reception: RouteResult = { agentId: input.agent.id, switched: false };
  const configured = parseRoutingConfig(input.agent.capabilitiesJson);
  if (!configured.length) return reception;
  try {
    const activeAgents = await pool.query<{ id: number; name: string }>(
      `select id, name from public.agents where "tenantId" = $1 and id = any($2::int[]) and status = 'active'`,
      [input.agent.tenantId, configured.map(item => item.agentId)],
    );
    const names = new Map(activeAgents.rows.map(row => [row.id, row.name]));
    const specialists = configured.filter(item => names.has(item.agentId));
    if (!specialists.length) return reception;

    const roles = detectRoles(input.message, specialists.map(item => item.role));
    const role = roles.length === 1 ? roles[0] : roles.length > 1 ? await (input.classify ?? classifyWithAi)(input.message, roles) : undefined;

    const current = await pool.query<{ activeAgentId: number | null }>(`select "activeAgentId" from public.conversations where id = $1`, [input.conversationId]);
    const activeId = current.rows[0]?.activeAgentId ?? null;
    const sticky = activeId !== null && specialists.some(item => item.agentId === activeId) ? activeId : null;

    const targetId = role ? specialists.find(item => item.role === role)!.agentId : sticky ?? input.agent.id;
    const previousId = sticky ?? input.agent.id;
    if (targetId !== previousId) {
      await pool.query(`update public.conversations set "activeAgentId" = $2 where id = $1`, [input.conversationId, targetId === input.agent.id ? null : targetId]);
      await addIndependentConversationMessage(pool, input.conversationId, "system", `تم توجيه المحادثة إلى الوكيل «${names.get(targetId)}».`);
    }
    return { agentId: targetId, switched: targetId !== previousId };
  } catch (error) {
    console.error("[Router] Routing failed; the reception agent will answer", error instanceof Error ? error.name : "unknown");
    return reception;
  }
}

export type SaveRoutingResult = { ok: true; specialists: Specialist[] } | { ok: false; status: 400 | 404; error: string };

/** Stores the routing table on the reception agent after checking every specialist belongs to the workspace. */
export async function saveRoutingConfig(pool: Pool, tenantId: number, receptionAgentId: number, specialists: unknown): Promise<SaveRoutingResult> {
  if (!Array.isArray(specialists) || specialists.length > SPECIALIST_ROLES.length) return { ok: false, status: 400, error: "قائمة المتخصصين غير صالحة." };
  const parsed = parseRoutingConfig({ routing: { specialists } });
  if (parsed.length !== specialists.length) return { ok: false, status: 400, error: "اختر دوراً صحيحاً ووكيلاً صحيحاً لكل بند، دون تكرار الدور." };
  if (new Set(parsed.map(item => item.agentId)).size !== parsed.length) return { ok: false, status: 400, error: "لا يمكن تعيين الوكيل نفسه لأكثر من دور." };
  if (parsed.some(item => item.agentId === receptionAgentId)) return { ok: false, status: 400, error: "وكيل الاستقبال لا يمكن أن يكون متخصصاً لنفسه." };
  if (parsed.length) {
    const found = await pool.query<{ id: number }>(`select id from public.agents where "tenantId" = $1 and id = any($2::int[]) and status = 'active'`, [tenantId, parsed.map(item => item.agentId)]);
    if (found.rows.length !== parsed.length) return { ok: false, status: 400, error: "أحد الوكلاء المختارين غير موجود أو غير نشط." };
  }
  const updated = await pool.query<{ id: number }>(
    `update public.agents
     set "capabilitiesJson" = coalesce("capabilitiesJson", '{}'::jsonb) || jsonb_build_object('routing', jsonb_build_object('specialists', $3::jsonb)), "updatedAt" = now()
     where "tenantId" = $1 and id = $2
     returning id`,
    [tenantId, receptionAgentId, JSON.stringify(parsed)],
  );
  if (!updated.rows[0]) return { ok: false, status: 404, error: "Agent not found" };
  return { ok: true, specialists: parsed };
}
