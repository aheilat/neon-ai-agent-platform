import type { Pool } from "pg";
import { ensureConversationLead } from "./leadRepository";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩]/g, digit => String(ARABIC_DIGITS.indexOf(digit)));
}

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/i;
const PHONE_PATTERN = /\+?\d[\d\s\-().]{6,18}\d/g;

/** Deterministic contact detection (no AI call): returns the first plausible phone number and email in a message. */
export function extractContactFromText(input: string) {
  const textValue = normalizeDigits(input).slice(0, 8_000);
  const email = textValue.match(EMAIL_PATTERN)?.[0]?.toLowerCase();
  let phone: string | undefined;
  for (const candidate of textValue.replace(EMAIL_PATTERN, " ").match(PHONE_PATTERN) ?? []) {
    const digits = candidate.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15 || /^(\d)\1+$/.test(digits)) continue;
    phone = candidate.trim().startsWith("+") ? `+${digits}` : digits;
    break;
  }
  return { phone, email: email && email.length <= 320 ? email : undefined };
}

/** Best effort only: a CRM failure must never break the customer's chat. */
export async function captureLeadFromWidgetMessage(pool: Pick<Pool, "query">, input: { tenantId: number; agentId: number; conversationId: number; message: string }) {
  try {
    const { phone, email } = extractContactFromText(input.message);
    if (!phone && !email) return;
    await ensureConversationLead(pool, { tenantId: input.tenantId, agentId: input.agentId, conversationId: input.conversationId, name: "عميل من الموقع", phone: phone ?? null, email: email ?? null });
  } catch (error) {
    console.warn("[Independent CRM] Widget lead capture skipped", error instanceof Error ? error.name : "unknown");
  }
}

/** Best effort only: every WhatsApp conversation becomes a lead on its first message. */
export async function captureLeadFromWhatsAppConversation(pool: Pick<Pool, "query">, input: { tenantId: number; agentId: number; conversationId: number; senderPhone: string; customerName?: string | null; message: string }) {
  try {
    const { email } = extractContactFromText(input.message);
    await ensureConversationLead(pool, {
      tenantId: input.tenantId,
      agentId: input.agentId,
      conversationId: input.conversationId,
      name: input.customerName?.trim() || input.senderPhone,
      phone: input.senderPhone.slice(0, 50),
      email: email ?? null,
    });
  } catch (error) {
    console.warn("[Independent CRM] WhatsApp lead capture skipped", error instanceof Error ? error.name : "unknown");
  }
}
