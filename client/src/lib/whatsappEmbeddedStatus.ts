export type WhatsAppEmbeddedConnectionInfo = {
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  codeVerificationStatus?: string;
  setupStatus?: "pending_webhook_verification" | "connected" | "awaiting_customer_billing";
};

export function getWhatsAppEmbeddedStatus(config: WhatsAppEmbeddedConnectionInfo, isActive: boolean) {
  const verificationStatus = config.codeVerificationStatus === "VERIFIED"
    ? "تم تأكيد الرقم في Meta"
    : config.codeVerificationStatus
      ? `حالة تأكيد Meta: ${config.codeVerificationStatus}`
      : "بانتظار تأكيد Meta";
  const qualityStatus = config.qualityRating
    ? `تقييم جودة الرقم: ${config.qualityRating}`
    : undefined;
  const billingStatus = config.setupStatus === "awaiting_customer_billing"
    ? "أضف وسيلة دفع في WhatsApp Manager"
    : undefined;
  const cardStatus = config.setupStatus === "awaiting_customer_billing"
    ? "أضف وسيلة دفع"
    : isActive && config.setupStatus === "connected"
      ? "متصل"
      : config.phoneNumberId
        ? "قيد الإعداد"
        : "غير متصل";
  return { verificationStatus, qualityStatus, billingStatus, cardStatus };
}
