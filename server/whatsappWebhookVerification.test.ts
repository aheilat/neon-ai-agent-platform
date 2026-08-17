import { describe, expect, it } from "vitest";

const webhookUrl = "http://127.0.0.1:3000/api/webhooks/whatsapp";

describe("WhatsApp webhook verification endpoint", () => {
  it("returns Meta's challenge only when the configured Verify Token matches", async () => {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    expect(verifyToken, "WHATSAPP_WEBHOOK_VERIFY_TOKEN must be configured").toBeTruthy();

    const acceptedParams = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": verifyToken!,
      "hub.challenge": "neon-webhook-verification-test",
    });
    const accepted = await fetch(`${webhookUrl}?${acceptedParams.toString()}`, {
      signal: AbortSignal.timeout(15_000),
    });
    expect(accepted.status, "Webhook did not accept the configured Verify Token").toBe(200);
    expect(await accepted.text()).toBe("neon-webhook-verification-test");

    const rejectedParams = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "deliberately-wrong-token",
      "hub.challenge": "must-not-be-returned",
    });
    const rejected = await fetch(`${webhookUrl}?${rejectedParams.toString()}`, {
      signal: AbortSignal.timeout(15_000),
    });
    expect(rejected.status, "Webhook accepted an invalid Verify Token").toBe(403);
  }, 20_000);
});
