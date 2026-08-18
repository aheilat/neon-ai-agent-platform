export type MetaSignupAssets = {
  phone_number_id?: string;
  waba_id?: string;
  business_id?: string;
};

export function isMetaSignupReadyForPin(signupCode: string | null, assets: MetaSignupAssets | null) {
  return Boolean(signupCode && assets?.phone_number_id && assets.waba_id);
}

export function canCompleteMetaSignup(signupCode: string | null, assets: MetaSignupAssets | null, pin: string) {
  return isMetaSignupReadyForPin(signupCode, assets) && /^\d{6}$/.test(pin);
}

export function getMetaSignupCancellationMessage(message?: string) {
  return message || "تم إلغاء ربط WhatsApp. يمكنك المحاولة في أي وقت دون فقدان إعداد الوكيل.";
}

export function getMetaSignupFailureMessage(error?: unknown) {
  return error instanceof Error && error.message ? error.message : "تعذر بدء ربط Meta. تأكد من حالة التطبيق ثم حاول مجدداً.";
}
