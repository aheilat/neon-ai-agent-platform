import { sendEmail } from "../_core/email";
import type { EscalationReason } from "./escalationDetection";

/**
 * Customer-facing wording and the owner e-mail for escalations to a human.
 * The e-mail goes to the agent's configured handoff contact (the same address
 * the widget handoff form already notifies) and is best-effort: a missing
 * address or a failed send never blocks the conversation.
 */

type Language = "ar" | "en";

function pickLanguage(agentLanguage: string | null | undefined, customerMessage: string): Language {
  if (agentLanguage === "ar") return "ar";
  if (agentLanguage === "en") return "en";
  return /[؀-ۿ]/.test(customerMessage) ? "ar" : "en";
}

/** Reply sent on WhatsApp once the conversation has been handed to the team. */
export function escalationAcknowledgement(agentLanguage: string | null | undefined, customerMessage: string) {
  return pickLanguage(agentLanguage, customerMessage) === "ar"
    ? "تم تحويل طلبك إلى فريقنا، وسيتواصل معك أحد المختصين في أقرب وقت. شكراً لصبرك."
    : "I've passed your request to our team, and someone will get back to you shortly. Thank you for your patience.";
}

/** Widget reply: the visitor is anonymous, so we ask for contact details (with consent) instead of escalating silently. */
export function widgetHandoffPrompt(agentLanguage: string | null | undefined, customerMessage: string) {
  return pickLanguage(agentLanguage, customerMessage) === "ar"
    ? "بالتأكيد. اترك بياناتك في النموذج وسيتواصل معك فريقنا قريباً."
    : "Of course. Please leave your details in the form and our team will get in touch shortly.";
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const REASON_LABELS: Record<EscalationReason, string> = {
  human_request: "عميل يطلب التحدث مع موظف",
  sales_request: "عميل يطلب التواصل مع المبيعات",
  complaint: "عميل لديه شكوى",
};

const CHANNEL_LABELS: Record<string, string> = { whatsapp: "واتساب", widget: "ودجت الموقع" };

export type EscalationDetails = {
  conversationId: number;
  channel: "whatsapp" | "widget";
  reason: EscalationReason;
  customerName?: string | null;
  customerPhone?: string | null;
  customerMessage: string;
};

const oneLine = (value: string) => value.replace(/[\u0000-\u001F\u007F]+/g, " ").trim();

export function buildEscalationEmail(agentName: string, details: EscalationDetails) {
  const subject = oneLine(`${REASON_LABELS[details.reason]} — ${agentName}`).slice(0, 200);
  const message = details.customerMessage.length > 500 ? `${details.customerMessage.slice(0, 500)}…` : details.customerMessage;
  const html = `
    <div dir="rtl" style="font-family: sans-serif;">
      <h2>${escapeHtml(REASON_LABELS[details.reason])}</h2>
      <p><strong>القناة:</strong> ${escapeHtml(CHANNEL_LABELS[details.channel] ?? details.channel)}</p>
      ${details.customerName ? `<p><strong>الاسم:</strong> ${escapeHtml(details.customerName)}</p>` : ""}
      ${details.customerPhone ? `<p><strong>الهاتف:</strong> <span dir="ltr">${escapeHtml(details.customerPhone)}</span></p>` : ""}
      <p><strong>رسالة العميل:</strong></p>
      <blockquote style="margin:0 0 12px;padding:8px 12px;border-right:3px solid #ccc;white-space:pre-wrap;">${escapeHtml(message)}</blockquote>
      <p>المحادثة رقم ${details.conversationId}. توقف الوكيل عن الرد التلقائي على هذه المحادثة حتى تتم معالجتها.</p>
      <p style="color:#888;font-size:12px;">أرسلت هذه الرسالة تلقائيًا من وكيل ${escapeHtml(agentName)} على Neon AI Agents.</p>
    </div>
  `;
  return { subject, html };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function handoffEmailFor(agent: { capabilitiesJson: Record<string, unknown> | null }) {
  const contact = (agent.capabilitiesJson?.handoffContact ?? {}) as Record<string, unknown>;
  const email = typeof contact.email === "string" ? contact.email.trim() : "";
  return EMAIL_PATTERN.test(email) ? email : null;
}

export async function notifyOwnerOfEscalation(
  agent: { name: string; capabilitiesJson: Record<string, unknown> | null },
  details: EscalationDetails,
  send: typeof sendEmail = sendEmail,
) {
  const to = handoffEmailFor(agent);
  if (!to) {
    console.warn("[Escalation] No handoff e-mail configured for this agent; owner was not notified");
    return false;
  }
  try {
    const { subject, html } = buildEscalationEmail(agent.name, details);
    return await send({ to, subject, html });
  } catch (error) {
    console.error("[Escalation] Owner notification failed", error instanceof Error ? error.name : "unknown");
    return false;
  }
}
