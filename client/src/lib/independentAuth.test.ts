import { describe, expect, it } from "vitest";
import { getIndependentEmailRedirectUrl, getRecoveryRedirectTarget, readPasswordRecoveryLink } from "./independentAuth";

describe("independent authentication", () => {
  it("keeps the confirmation redirect on the exact independently hosted origin", () => {
    expect(getIndependentEmailRedirectUrl("https://neon-ai-staging.onrender.com")).toBe(
      "https://neon-ai-staging.onrender.com/external",
    );
  });

  it("recognises a valid password-reset link in the hash", () => {
    expect(readPasswordRecoveryLink("#access_token=abc&refresh_token=def&expires_in=3600&type=recovery")).toEqual({ kind: "ready" });
  });

  it("recognises a PKCE-style reset link in the query string", () => {
    expect(readPasswordRecoveryLink("", "?type=recovery&code=xyz")).toEqual({ kind: "ready" });
  });

  it("reports an expired or used reset link instead of showing the email form again", () => {
    const result = readPasswordRecoveryLink("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
    expect(result.kind).toBe("error");
  });

  it("ignores ordinary pages, sign-up confirmations and unrelated errors", () => {
    expect(readPasswordRecoveryLink("")).toEqual({ kind: "none" });
    expect(readPasswordRecoveryLink("#access_token=abc&type=signup")).toEqual({ kind: "none" });
    expect(readPasswordRecoveryLink("#error=access_denied&error_code=provider_email_needs_verification")).toEqual({ kind: "none" });
    expect(readPasswordRecoveryLink("#type=recovery")).toEqual({ kind: "none" });
  });

  it("forwards a reset link that landed on /login (or any page) to /reset-password with its token", () => {
    expect(getRecoveryRedirectTarget("/login", "", "#access_token=abc&type=recovery")).toBe("/reset-password#access_token=abc&type=recovery");
    expect(getRecoveryRedirectTarget("/", "", "#error_code=otp_expired")).toBe("/reset-password#error_code=otp_expired");
  });

  it("does not redirect from /reset-password itself or for normal visits", () => {
    expect(getRecoveryRedirectTarget("/reset-password", "", "#access_token=abc&type=recovery")).toBeNull();
    expect(getRecoveryRedirectTarget("/login", "", "")).toBeNull();
    expect(getRecoveryRedirectTarget("/external", "", "#access_token=abc&type=signup")).toBeNull();
  });
});
