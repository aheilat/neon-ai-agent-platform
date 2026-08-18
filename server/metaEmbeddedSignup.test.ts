import { afterEach, describe, expect, it, vi } from "vitest";
import { completeMetaEmbeddedSignup, decryptBusinessToken, encryptBusinessToken, getEmbeddedSignupPublicConfig } from "./metaEmbeddedSignup";

const previousEnv = { ...process.env };

afterEach(() => {
  process.env = { ...previousEnv };
  vi.unstubAllGlobals();
});

describe("Meta Embedded Signup", () => {
  it("encrypts a customer business token without retaining it in plaintext", () => {
    process.env.JWT_SECRET = "test-jwt-secret";
    const token = "customer-business-token-that-must-not-be-exposed";
    const encrypted = encryptBusinessToken(token);
    expect(encrypted).not.toContain(token);
    expect(decryptBusinessToken(encrypted)).toBe(token);
  });

  it("only reports signup readiness when both Meta app and configuration IDs exist", () => {
    process.env.META_APP_ID = "123456";
    delete process.env.META_EMBEDDED_SIGNUP_CONFIG_ID;
    expect(getEmbeddedSignupPublicConfig().enabled).toBe(false);
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = "654321";
    expect(getEmbeddedSignupPublicConfig()).toMatchObject({ enabled: true, appId: "123456", configId: "654321" });
  });

  it("exchanges the short-lived code, subscribes the WABA, registers the phone, and encrypts the resulting token", async () => {
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.META_APP_ID = "123456";
    process.env.WHATSAPP_APP_SECRET = "test-meta-app-secret";
    const calls: Array<{ url: string; method: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method || "GET" });
      if (url.includes("/oauth/access_token")) return new Response(JSON.stringify({ access_token: "business-token-from-meta" }), { status: 200 });
      if (url.includes("/subscribed_apps")) return new Response(JSON.stringify({ success: true }), { status: 200 });
      if (url.includes("/register")) return new Response(JSON.stringify({ success: true }), { status: 200 });
      return new Response(JSON.stringify({ display_phone_number: "+968 7519 2909", verified_name: "Neon Marketing", quality_rating: "GREEN", code_verification_status: "VERIFIED" }), { status: 200 });
    }));

    const result = await completeMetaEmbeddedSignup({
      code: "code-returned-from-meta-after-finish",
      phoneNumberId: "1234567890",
      whatsappBusinessAccountId: "9876543210",
      businessPortfolioId: "5678901234",
      pin: "123456",
    });

    expect(calls.map(call => call.method)).toEqual(["GET", "POST", "POST", "GET"]);
    expect(calls[1].url).toContain("/9876543210/subscribed_apps");
    expect(calls[2].url).toContain("/1234567890/register");
    expect(result.displayPhoneNumber).toBe("+968 7519 2909");
    expect(decryptBusinessToken(result.encryptedBusinessToken)).toBe("business-token-from-meta");
  });
});
