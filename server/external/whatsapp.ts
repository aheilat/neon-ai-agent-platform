import express, { type Express } from "express";
import type { Pool } from "pg";
import {
  extractWhatsAppInboundMessages,
  fetchWhatsAppMediaUrl,
  sendWhatsAppText,
  verifyWhatsAppSignature,
  verifyWhatsAppWebhook,
  type WhatsAppInboundMessage,
} from "../whatsappService";
import { transcribeAudio } from "../_core/voiceTranscription";
import { addIndependentConversationMessage, getIndependentAgentInTenant } from "./agentRepository";
import { generateIndependentAgentReplyForTenant } from "./chat";
import { getIndependentPostgresPool } from "./postgres";
import { resolveIndependentWorkspaceSession } from "./runtime";

/**
 * WhatsApp Cloud API support for the independent (Supabase) runtime.
 *
 * Isolation guarantees:
 *  - It is registered only by `createIndependentNeonApp`; the managed app and its
 *    MySQL-backed WhatsApp handler (`server/whatsappInbound.ts`) are untouched.
 *  - It uses only existing tables (`channel_integrations`, `conversations`, `messages`).
 *    A phone number that is not registered in `channel_integrations` is ignored.
 */

const VOICE_FALLBACK = "وصلتني رسالتك الصوتية لكن تعذر تفريغها الآن. من فضلك أرسل سؤالك كتابةً وسأساعدك فوراً.";
const MAX_REMEMBERED_MESSAGE_IDS = 1000;
const seenMessageIds = new Set<string>();

function rememberMessageId(id: string) {
  if (seenMessageIds.has(id)) return false;
  seenMessageIds.add(id);
  if (seenMessageIds.size > MAX_REMEMBERED_MESSAGE_IDS) {
    const oldest = seenMessageIds.values().next().value;
    if (oldest) seenMessageIds.delete(oldest);
  }
  return true;
}

type Integration = { id: number; tenantId: number; agentId: number };

export async function findIndependentWhatsAppIntegration(pool: Pool, phoneNumberId: string): Promise<Integration | undefined> {
  const result = await pool.query<Integration>(
    `select id, "tenantId", "agentId"
     from public.channel_integrations
     where channel = 'whatsapp' and "isActive" = true and "configJson"->>'phoneNumberId' = $1
     limit 1`,
    [phoneNumberId],
  );
  return result.rows[0];
}

async function findOrCreateWhatsAppConversation(pool: Pool, integration: Integration, input: WhatsAppInboundMessage) {
  const existing = await pool.query<{ id: number; status: "active" | "escalated" | "resolved" }>(
    `select id, status from public.conversations
     where "tenantId" = $1 and "agentId" = $2 and channel = 'whatsapp' and "customerPhone" = $3 and status <> 'resolved'
     order by "updatedAt" desc limit 1`,
    [integration.tenantId, integration.agentId, input.senderPhone],
  );
  if (existing.rows[0]) return existing.rows[0];
  const created = await pool.query<{ id: number; status: "active" | "escalated" | "resolved" }>(
    `insert into public.conversations ("tenantId", "agentId", channel, "customerPhone", "customerName")
     values ($1, $2, 'whatsapp', $3, $4)
     returning id, status`,
    [integration.tenantId, integration.agentId, input.senderPhone, input.customerName ?? null],
  );
  return created.rows[0];
}

async function loadHistory(pool: Pool, conversationId: number) {
  const result = await pool.query<{ sender: string; content: string }>(
    `select sender, content from public.messages where "conversationId" = $1 order by id desc limit 10`,
    [conversationId],
  );
  return result.rows
    .reverse()
    .filter(row => row.sender === "customer" || row.sender === "agent")
    .map(row => ({ role: row.sender === "customer" ? ("user" as const) : ("assistant" as const), content: row.content }));
}

async function resolveContent(input: WhatsAppInboundMessage): Promise<{ content: string; transcriptionFailed: boolean }> {
  if (!input.audioMediaId) return { content: input.content, transcriptionFailed: false };
  try {
    const media = await fetchWhatsAppMediaUrl({ mediaId: input.audioMediaId });
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const result = await transcribeAudio({ audioUrl: media.url, authorizationHeader: accessToken ? `Bearer ${accessToken}` : undefined });
    if ("error" in result || !result.text.trim()) return { content: input.content, transcriptionFailed: true };
    return { content: result.text.trim(), transcriptionFailed: false };
  } catch (error) {
    console.error("[Independent WhatsApp] Voice handling failed", error instanceof Error ? error.message : "unknown");
    return { content: input.content, transcriptionFailed: true };
  }
}

export type IndependentWhatsAppDependencies = {
  getPool: () => Pool | undefined;
  send: typeof sendWhatsAppText;
};

const defaultDependencies: IndependentWhatsAppDependencies = { getPool: getIndependentPostgresPool, send: sendWhatsAppText };

export async function processIndependentWhatsAppMessage(message: WhatsAppInboundMessage, deps: IndependentWhatsAppDependencies = defaultDependencies) {
  const pool = deps.getPool();
  if (!pool) return { accepted: false as const, reason: "independent_database_unavailable" };
  if (!rememberMessageId(message.messageId)) return { accepted: false as const, reason: "duplicate_message" };

  const integration = await findIndependentWhatsAppIntegration(pool, message.phoneNumberId);
  if (!integration) return { accepted: false as const, reason: "unrecognized_phone_number" };
  const agent = await getIndependentAgentInTenant(pool, integration.tenantId, integration.agentId);
  if (!agent || agent.status !== "active") return { accepted: false as const, reason: "inactive_agent" };

  const { content, transcriptionFailed } = await resolveContent(message);
  const conversation = await findOrCreateWhatsAppConversation(pool, integration, message);
  const history = await loadHistory(pool, conversation.id);
  await addIndependentConversationMessage(pool, conversation.id, "customer", content);

  // A human has taken over: keep the customer's message visible in the inbox, but do not auto-reply.
  if (conversation.status === "escalated") return { accepted: true as const, reply: undefined, reason: "escalated_to_human" };

  let reply: string;
  if (transcriptionFailed) {
    reply = VOICE_FALLBACK;
  } else {
    const result = await generateIndependentAgentReplyForTenant(integration.tenantId, { agentId: agent.id, message: content, history });
    if (result.kind !== "success" || !result.reply.trim()) return { accepted: true as const, reply: undefined, reason: "no_reply_generated" };
    reply = result.reply;
  }
  await addIndependentConversationMessage(pool, conversation.id, "agent", reply);
  await deps.send({ phoneNumberId: message.phoneNumberId, to: message.senderPhone, body: reply });
  return { accepted: true as const, reply };
}

function authorizationFromRequest(headers: { authorization?: string | string[] }) {
  const value = headers.authorization;
  return Array.isArray(value) ? value[0] : value;
}

/** Registered BEFORE express.json(): Meta's HMAC signature is computed over the raw request body. */
export function registerIndependentWhatsAppRoutes(app: Express) {
  app.get("/api/webhooks/whatsapp", (req, res) => {
    const challenge = verifyWhatsAppWebhook(req.query as Record<string, string | string[] | undefined>, process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN);
    if (!challenge) return res.status(403).json({ error: "Webhook verification failed" });
    return res.status(200).send(challenge);
  });

  app.post("/api/webhooks/whatsapp", express.raw({ type: "application/json", limit: "3mb" }), (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    if (!verifyWhatsAppSignature(rawBody, req.get("x-hub-signature-256") || undefined, process.env.WHATSAPP_APP_SECRET)) {
      console.warn("[Independent WhatsApp] Rejected event with an invalid signature");
      return res.status(401).json({ error: "Invalid WhatsApp signature" });
    }
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }
    const messages = extractWhatsAppInboundMessages(payload);
    res.status(200).send("EVENT_RECEIVED");
    for (const message of messages) {
      void processIndependentWhatsAppMessage(message)
        .then(result => console.info("[Independent WhatsApp] Processed", { accepted: result.accepted, reason: "reason" in result ? result.reason : undefined, hasReply: "reply" in result && Boolean(result.reply) }))
        .catch(error => console.error("[Independent WhatsApp] Failed to process message", error instanceof Error ? `${error.name}: ${error.message}` : String(error)));
    }
  });

  // Links one WhatsApp phone number to one agent of the signed-in workspace (stored in channel_integrations).
  app.post("/api/external/agents/:agentId/whatsapp", express.json({ limit: "10kb" }), async (req, res) => {
    const agentId = Number(req.params.agentId);
    const phoneNumberId = typeof req.body?.phoneNumberId === "string" ? req.body.phoneNumberId.trim() : "";
    if (!Number.isSafeInteger(agentId) || agentId <= 0) return res.status(400).json({ error: "Invalid agent ID" });
    if (!/^\d{5,32}$/.test(phoneNumberId)) return res.status(400).json({ error: "A numeric WhatsApp phoneNumberId is required" });
    const session = await resolveIndependentWorkspaceSession(authorizationFromRequest(req.headers));
    const pool = getIndependentPostgresPool();
    if (!session || !pool) return res.status(401).json({ error: "Supabase authentication or independent database configuration is required" });
    const agent = await getIndependentAgentInTenant(pool, session.workspace.id, agentId);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    const taken = await findIndependentWhatsAppIntegration(pool, phoneNumberId);
    if (taken && taken.agentId !== agent.id) return res.status(409).json({ error: "This WhatsApp number is already linked to another agent" });
    await pool.query(
      `insert into public.channel_integrations ("tenantId", "agentId", channel, "isActive", "configJson")
       values ($1, $2, 'whatsapp', true, $3::jsonb)
       on conflict ("agentId", channel) do update set "isActive" = true, "configJson" = excluded."configJson", "updatedAt" = now()`,
      [session.workspace.id, agent.id, JSON.stringify({ phoneNumberId })],
    );
    return res.json({ ok: true, agentId: agent.id, phoneNumberId });
  });
}
