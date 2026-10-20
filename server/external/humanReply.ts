import type { Pool } from "pg";
import { sendWhatsAppText } from "../whatsappService";
import { addIndependentConversationMessage } from "./agentRepository";

/**
 * A team member answers a customer from the platform inbox.
 *
 * Only WhatsApp conversations can be answered for now: the reply is sent through the same
 * WhatsApp Cloud API helper the agent uses, then stored with sender "human". WhatsApp allows
 * free-form text only within 24 hours of the customer's last message, so an older conversation is
 * refused up front with a clear reason instead of failing silently at Meta.
 */

export const WHATSAPP_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const HUMAN_REPLY_MAX_LENGTH = 1_000;

export type HumanReplyFailure = { ok: false; status: 400 | 404 | 409 | 502; code: "not_found" | "resolved" | "unsupported_channel" | "no_phone" | "no_integration" | "window_closed" | "send_failed"; error: string };
export type HumanReplyResult = { ok: true; status: "escalated"; sentAt: string } | HumanReplyFailure;

type ReplyContext = {
  channel: string;
  status: "active" | "escalated" | "resolved";
  customerPhone: string | null;
  lastCustomerMessageAt: Date | string | null;
  phoneNumberId: string | null;
};

const fail = (status: HumanReplyFailure["status"], code: HumanReplyFailure["code"], error: string): HumanReplyFailure => ({ ok: false, status, code, error });

async function loadReplyContext(pool: Pool, tenantId: number, agentId: number, conversationId: number) {
  const result = await pool.query<ReplyContext>(
    `select c.channel, c.status, c."customerPhone",
       (select max(m."createdAt") from public.messages m where m."conversationId" = c.id and m.sender = 'customer') as "lastCustomerMessageAt",
       (select i."configJson"->>'phoneNumberId' from public.channel_integrations i
         where i."tenantId" = c."tenantId" and i."agentId" = c."agentId" and i.channel = 'whatsapp' and i."isActive" = true
         order by i.id desc limit 1) as "phoneNumberId"
     from public.conversations c
     where c."tenantId" = $1 and c."agentId" = $2 and c.id = $3`,
    [tenantId, agentId, conversationId],
  );
  return result.rows[0];
}

export async function sendIndependentHumanReply(
  pool: Pool,
  input: { tenantId: number; agentId: number; conversationId: number; message: string },
  send: typeof sendWhatsAppText = sendWhatsAppText,
  now: () => number = Date.now,
): Promise<HumanReplyResult> {
  const context = await loadReplyContext(pool, input.tenantId, input.agentId, input.conversationId);
  if (!context) return fail(404, "not_found", "Conversation not found");
  if (context.status === "resolved") return fail(409, "resolved", "المحادثة مغلقة. لا يمكن الرد عليها.");
  if (context.channel !== "whatsapp") return fail(400, "unsupported_channel", "الرد من المنصة متاح حالياً لمحادثات واتساب فقط.");
  if (!context.customerPhone) return fail(400, "no_phone", "لا يوجد رقم هاتف لهذا العميل.");
  if (!context.phoneNumberId) return fail(409, "no_integration", "قناة واتساب غير مفعّلة لهذا الوكيل.");
  const lastCustomerMessageAt = context.lastCustomerMessageAt ? new Date(context.lastCustomerMessageAt).getTime() : 0;
  if (!lastCustomerMessageAt || now() - lastCustomerMessageAt > WHATSAPP_REPLY_WINDOW_MS) {
    return fail(409, "window_closed", "مرّت أكثر من 24 ساعة على آخر رسالة من العميل، وواتساب لا يسمح بالرد الحر بعدها. انتظر رسالة جديدة منه.");
  }

  try {
    await send({ phoneNumberId: context.phoneNumberId, to: context.customerPhone, body: input.message });
  } catch (error) {
    console.error("[Human reply] WhatsApp send failed", error instanceof Error ? error.message : "unknown");
    return fail(502, "send_failed", "تعذر إرسال الرد عبر واتساب. لم يُحفظ الرد، حاول مرة أخرى.");
  }

  await addIndependentConversationMessage(pool, input.conversationId, "human", input.message);
  // A person is now handling this customer: the automatic agent must stay silent until it is handed back.
  await pool.query(
    `update public.conversations set status = 'escalated', "updatedAt" = now()
     where "tenantId" = $1 and "agentId" = $2 and id = $3 and status = 'active'`,
    [input.tenantId, input.agentId, input.conversationId],
  );
  return { ok: true, status: "escalated", sentAt: new Date(now()).toISOString() };
}

/** Hand an escalated conversation back to the automatic agent. */
export async function reactivateIndependentConversation(pool: Pool, tenantId: number, agentId: number, conversationId: number) {
  const result = await pool.query<{ id: number; status: "active" }>(
    `update public.conversations set status = 'active', "updatedAt" = now()
     where "tenantId" = $1 and "agentId" = $2 and id = $3 and status = 'escalated'
     returning id, status`,
    [tenantId, agentId, conversationId],
  );
  const conversation = result.rows[0];
  if (conversation) await addIndependentConversationMessage(pool, conversation.id, "system", "أعاد الفريق المحادثة إلى الوكيل الآلي.");
  return conversation;
}
