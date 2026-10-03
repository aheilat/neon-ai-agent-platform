import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { extractWhatsAppInboundMessages, verifyWhatsAppSignature, verifyWhatsAppWebhook } from "./whatsappService";

describe("WhatsApp Cloud API webhook helpers", () => {
  it("returns Meta's challenge only for a valid verification request", () => {
    expect(verifyWhatsAppWebhook({ "hub.mode": "subscribe", "hub.verify_token": "secure-token", "hub.challenge": "12345" }, "secure-token")).toBe("12345");
    expect(verifyWhatsAppWebhook({ "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "12345" }, "secure-token")).toBeUndefined();
  });

  it("accepts only a valid HMAC signature", () => {
    const body = Buffer.from('{"object":"whatsapp_business_account"}');
    const secret = "meta-app-secret";
    const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(verifyWhatsAppSignature(body, signature, secret)).toBe(true);
    expect(verifyWhatsAppSignature(body, "sha256=invalid", secret)).toBe(false);
  });

  it("extracts a customer message and preserves the channel phone number id", () => {
    const messages = extractWhatsAppInboundMessages({
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          field: "messages",
          value: {
            metadata: { phone_number_id: "123456789" },
            contacts: [{ wa_id: "96875192909", profile: { name: "عبدالله" } }],
            messages: [{ id: "wamid.abc", from: "96875192909", timestamp: "1786799000", type: "text", text: { body: "أريد شاحنة مبردة" } }],
          },
        }],
      }],
    });
    expect(messages).toEqual([{ messageId: "wamid.abc", phoneNumberId: "123456789", senderPhone: "96875192909", customerName: "عبدالله", content: "أريد شاحنة مبردة", timestamp: 1786799000 }]);
  });

  it("extracts a voice message with its media id and a transient placeholder", () => {
    const messages = extractWhatsAppInboundMessages({
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          field: "messages",
          value: {
            metadata: { phone_number_id: "123456789" },
            contacts: [{ wa_id: "96875192909", profile: { name: "عبدالله" } }],
            messages: [{ id: "wamid.voice", from: "96875192909", timestamp: "1786799000", type: "audio", audio: { id: "media-1", mime_type: "audio/ogg; codecs=opus" } }],
          },
        }],
      }],
    });
    expect(messages).toEqual([{ messageId: "wamid.voice", phoneNumberId: "123456789", senderPhone: "96875192909", customerName: "عبدالله", content: "[رسالة صوتية قيد التفريغ]", timestamp: 1786799000, audioMediaId: "media-1" }]);
  });

  it("still falls back to a generic placeholder for other unsupported attachment types", () => {
    const messages = extractWhatsAppInboundMessages({
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          field: "messages",
          value: {
            metadata: { phone_number_id: "123456789" },
            messages: [{ id: "wamid.img", from: "96875192909", timestamp: "1786799000", type: "image", image: { id: "media-2" } }],
          },
        }],
      }],
    });
    expect(messages[0].content).toBe("[مرفق واتساب من النوع: image]");
    expect(messages[0].audioMediaId).toBeUndefined();
  });
});
