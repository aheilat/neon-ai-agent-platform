export function isTemporaryLlmQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("usage exhausted") ||
    normalized.includes("quota exceeded") ||
    normalized.includes("rate limit") ||
    normalized.includes("status 412") ||
    normalized.includes("precondition failed")
  );
}

export function temporaryLlmQuotaResponse() {
  return {
    ok: true,
    deferred: true,
    reason: "llm-unavailable",
    message: "تم تأجيل مزامنة الموقع مؤقتاً لأن خدمة الذكاء الاصطناعي غير متاحة الآن. ستتم المحاولة لاحقاً.",
  } as const;
}
