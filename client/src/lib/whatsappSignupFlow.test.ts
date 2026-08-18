import { describe, expect, it } from "vitest";
import { canCompleteMetaSignup, getMetaSignupCancellationMessage, getMetaSignupFailureMessage, isMetaSignupReadyForPin } from "./whatsappSignupFlow";

describe("WhatsApp embedded signup flow", () => {
  const assets = { phone_number_id: "1234567890", waba_id: "9876543210" };

  it("does not request the security PIN before Meta returns both the code and phone assets", () => {
    expect(isMetaSignupReadyForPin(null, null)).toBe(false);
    expect(isMetaSignupReadyForPin("meta-code", null)).toBe(false);
    expect(isMetaSignupReadyForPin(null, assets)).toBe(false);
    expect(isMetaSignupReadyForPin("meta-code", assets)).toBe(true);
  });

  it("completes only after Meta is ready and a six-digit PIN is supplied", () => {
    expect(canCompleteMetaSignup("meta-code", assets, "12345")).toBe(false);
    expect(canCompleteMetaSignup("meta-code", assets, "123456")).toBe(true);
  });

  it("explains cancellation without exposing credentials", () => {
    expect(getMetaSignupCancellationMessage()).toContain("تم إلغاء ربط WhatsApp");
    expect(getMetaSignupCancellationMessage("رفض العميل الإذن")).toBe("رفض العميل الإذن");
  });

  it("returns a recoverable message when the Meta session cannot start", () => {
    expect(getMetaSignupFailureMessage(new Error("App not active"))).toBe("App not active");
    expect(getMetaSignupFailureMessage()).toContain("تعذر بدء ربط Meta");
  });
});
