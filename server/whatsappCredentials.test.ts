import { describe, expect, it } from "vitest";

describe("WhatsApp Cloud API credentials", () => {
  it("accepts the configured access token without exposing it", async () => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    expect(token, "WHATSAPP_ACCESS_TOKEN must be configured").toBeTruthy();

    const response = await fetch("https://graph.facebook.com/v23.0/me?fields=id", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.ok, "Meta rejected the configured WhatsApp access token").toBe(true);
    const payload = await response.json() as { id?: string };
    expect(payload.id, "Meta response did not identify the authorized account").toBeTruthy();
  });
});
