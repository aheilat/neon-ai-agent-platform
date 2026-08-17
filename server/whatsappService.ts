import { createHmac, timingSafeEqual } from "node:crypto";

export type WhatsAppInboundMessage = {
  messageId: string;
  phoneNumberId: string;
  senderPhone: string;
  customerName?: string;
  content: string;
  timestamp?: number;
};

type MetaWebhookQuery = Record<string, string | string[] | undefined>;

export function verifyWhatsAppWebhook(query: MetaWebhookQuery, verifyToken: string | undefined) {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];
  if (mode !== "subscribe" || !verifyToken || token !== verifyToken || typeof challenge !== "string") return undefined;
  return challenge;
}

export function verifyWhatsAppSignature(rawBody: Buffer, signature: string | undefined, appSecret: string | undefined) {
  if (!signature || !appSecret || !signature.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function extractWhatsAppInboundMessages(payload: unknown): WhatsAppInboundMessage[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as { object?: string; entry?: Array<{ changes?: Array<{ field?: string; value?: any }> }> };
  if (root.object !== "whatsapp_business_account") return [];
  const incoming: WhatsAppInboundMessage[] = [];

  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      const contactById = new Map<string, string>((value?.contacts ?? [])
        .filter((contact: any) => typeof contact?.wa_id === "string" && typeof contact?.profile?.name === "string")
        .map((contact: any) => [contact.wa_id, contact.profile.name] as [string, string]));
      for (const message of value?.messages ?? []) {
        if (!phoneNumberId || !message?.from || !message?.id) continue;
        const content = message.type === "text" ? message.text?.body?.trim() : `[مرفق واتساب من النوع: ${message.type || "غير معروف"}]`;
        if (!content) continue;
        incoming.push({
          messageId: message.id,
          phoneNumberId,
          senderPhone: message.from,
          customerName: contactById.get(message.from),
          content,
          timestamp: Number(message.timestamp || 0) || undefined,
        });
      }
    }
  }
  return incoming;
}

export async function sendWhatsAppText(input: { phoneNumberId: string; to: string; body: string; accessToken?: string; graphApiVersion?: string }) {
  const accessToken = input.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("WhatsApp access token is not configured");
  const apiVersion = input.graphApiVersion || process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${input.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.to.replace(/\D/g, ""),
      type: "text",
      text: { body: input.body },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "WhatsApp Cloud API request failed");
  return data as { messages?: Array<{ id: string }> };
}
