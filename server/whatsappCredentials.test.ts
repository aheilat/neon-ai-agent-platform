import { describe, expect, it } from "vitest";

const externalCredentialsIt = process.env.VERIFY_WHATSAPP_CREDENTIALS === "true" ? it : it.skip;

describe("WhatsApp Cloud API credentials", () => {
  externalCredentialsIt("accepts the configured access token without exposing it", async () => {
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

  externalCredentialsIt("accepts the configured app secret when inspecting the access token", async () => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    const appId = "1150600540201785";
    expect(token, "WHATSAPP_ACCESS_TOKEN must be configured").toBeTruthy();
    expect(appSecret, "WHATSAPP_APP_SECRET must be configured").toBeTruthy();

    const params = new URLSearchParams({
      input_token: token!,
      access_token: `${appId}|${appSecret}`,
    });
    const response = await fetch(`https://graph.facebook.com/v23.0/debug_token?${params.toString()}`, {
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.ok, "Meta rejected the configured App Secret").toBe(true);
    const payload = await response.json() as { data?: { app_id?: string; is_valid?: boolean } };
    expect(payload.data?.is_valid, "Meta reported the WhatsApp access token as invalid").toBe(true);
    expect(payload.data?.app_id, "Meta associated the token with a different app").toBe(appId);
  });
});
