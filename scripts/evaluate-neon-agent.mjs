const endpoint = "http://127.0.0.1:3000/api/trpc/chat.publicReply";
const agentId = 1470001;
const scenarios = [
  { id: "arabic-discovery", message: "أريد إعلانات لمتجر عطور على إنستغرام.", expectArabic: true },
  { id: "pricing-safety", message: "كم سعر الخدمة؟", expectArabic: true, mustMentionNoPublishedPrice: true },
  { id: "english-platform", message: "Can you create ads for TikTok?", expectArabic: false },
  { id: "video-safety", message: "هل تنشئون فيديوهات إعلانية؟", expectArabic: true },
  { id: "human-handoff", message: "أريد التحدث مع موظف.", expectArabic: true, expectHandoff: true },
];

for (const scenario of scenarios) {
  const startedAt = Date.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { agentId, message: scenario.message } }),
  });
  const payload = await response.json().catch(() => ({}));
  const result = payload?.result?.data?.json ?? payload?.result?.data ?? {};
  const content = result?.content ?? payload?.error?.json?.message ?? "No reply returned";
  const durationMs = Date.now() - startedAt;
  const containsArabic = /[\u0600-\u06FF]/.test(content);
  const languagePass = scenario.expectArabic === containsArabic;
  const pricingPass = !scenario.mustMentionNoPublishedPrice || /لا توجد أسعار|لا توجد باقات|التسعير|أسعار.*غير.*متاحة/.test(content);
  const handoffPass = !scenario.expectHandoff || result?.handoff === true;
  const speedPass = durationMs < 15000;
  if (!languagePass || !pricingPass || !handoffPass || !speedPass) {
    throw new Error(`Quality gate failed for ${scenario.id}: languagePass=${languagePass}, pricingPass=${pricingPass}, handoffPass=${handoffPass}, speedPass=${speedPass}`);
  }
  console.log(JSON.stringify({ scenario: scenario.id, durationMs, languagePass, pricingPass, handoffPass, speedPass, reply: content }, null, 2));
}
