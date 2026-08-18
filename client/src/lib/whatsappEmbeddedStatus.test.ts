import { describe, expect, it } from "vitest";
import { getWhatsAppEmbeddedStatus } from "./whatsappEmbeddedStatus";

describe("WhatsApp embedded connection status", () => {
  it("shows the verified number, billing requirement, and the correct next step", () => {
    const status = getWhatsAppEmbeddedStatus({
      displayPhoneNumber: "+968 7519 2909",
      verifiedName: "Neon Marketing",
      qualityRating: "GREEN",
      codeVerificationStatus: "VERIFIED",
      setupStatus: "awaiting_customer_billing",
    }, true);
    expect(status).toMatchObject({
      cardStatus: "أضف وسيلة دفع",
      verificationStatus: "تم تأكيد الرقم في Meta",
      qualityStatus: "تقييم جودة الرقم: GREEN",
      billingStatus: "أضف وسيلة دفع في WhatsApp Manager",
    });
  });

  it("keeps the next step clear when Meta has not confirmed the phone yet", () => {
    const status = getWhatsAppEmbeddedStatus({ phoneNumberId: "123456", setupStatus: "pending_webhook_verification" }, false);
    expect(status.cardStatus).toBe("قيد الإعداد");
    expect(status.verificationStatus).toBe("بانتظار تأكيد Meta");
  });
});
