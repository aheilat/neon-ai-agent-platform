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
});
