import { describe, expect, it } from "vitest";
import { buildAgentPrompt, containsEscalationKeyword, createAssistantReply, getReplyLanguageInstruction, normalizeLlmContent, selectRelevantKnowledge } from "./agentEngine";
import type { Agent } from "../drizzle/schema";

const agent = {
  id: 1,
  tenantId: 7,
  name: "Neon Concierge",
  description: "Assistant",
  persona: "Helpful and clear",
  tone: "friendly",
  language: "bilingual",
  decisionRules: "Guide the next step",
  fallbackMessage: "A human will help you.",
  escalationKeyword: "موظف,human",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
} as Agent;

describe("agentEngine", () => {
  it("builds a prompt with tenant-owned agent context and knowledge", () => {
    const prompt = buildAgentPrompt(agent, [{ id: 1, tenantId: 7, agentId: 1, title: "Returns", content: "Returns are accepted within 14 days.", category: "FAQ", createdAt: new Date(), updatedAt: new Date() }], "What is your return policy?");
    expect(prompt).toContain("Neon Concierge");
    expect(prompt).toContain("Returns are accepted within 14 days.");
    expect(prompt).toContain("What is your return policy?");
  });

  it("detects Arabic and English escalation keywords", () => {
    expect(containsEscalationKeyword("أحتاج موظف يساعدني", agent.escalationKeyword)).toBe(true);
    expect(containsEscalationKeyword("I need a human", agent.escalationKeyword)).toBe(true);
    expect(containsEscalationKeyword("نعم حولني إلى الفريق", agent.escalationKeyword)).toBe(true);
    expect(containsEscalationKeyword("Please transfer me", agent.escalationKeyword)).toBe(true);
    expect(containsEscalationKeyword("أريد التحدث مع موظف", "موظف، إنسان، شكوى، عاجل")).toBe(true);
    expect(containsEscalationKeyword("What are your hours?", agent.escalationKeyword)).toBe(false);
  });

  it("normalizes string and structured model content", () => {
    expect(normalizeLlmContent("  hello  ")).toBe("hello");
    expect(normalizeLlmContent([{ type: "text", text: "hello" }])).toBe("hello");
    expect(createAssistantReply("")).toEqual({ content: "أحتاج إلى تفاصيل أكثر حتى أساعدك بشكل دقيق.", escalated: false });
  });

  it("prioritizes matching knowledge and keeps the prompt context compact", () => {
    const knowledge = [
      { id: 1, tenantId: 7, agentId: 1, title: "تمويل السيارات", content: "نقدم خيارات تمويل للسيارات الجديدة والمستعملة.", category: "FAQ", createdAt: new Date(), updatedAt: new Date() },
      { id: 2, tenantId: 7, agentId: 1, title: "سياسة الإرجاع", content: "الإرجاع متاح خلال 14 يوماً.", category: "FAQ", createdAt: new Date(), updatedAt: new Date() },
    ];
    expect(selectRelevantKnowledge(knowledge, "أريد تمويل سيارة")[0]?.title).toBe("تمويل السيارات");
  });

  it("keeps operational guidance but excludes unrelated business knowledge", () => {
    const knowledge = [
      { id: 1, tenantId: 7, agentId: 1, title: "خطوة التأهيل", content: "اسأل سؤالاً واحداً عن هدف العميل قبل الاقتراح.", category: "Agent goal", createdAt: new Date(), updatedAt: new Date() },
      { id: 2, tenantId: 7, agentId: 1, title: "إعلانات TikTok", content: "يمكن إنشاء أصول إعلانية لمنصة TikTok.", category: "Website service", createdAt: new Date(), updatedAt: new Date() },
      { id: 3, tenantId: 7, agentId: 1, title: "سياسة الإرجاع", content: "الإرجاع متاح خلال 14 يوماً.", category: "FAQ", createdAt: new Date(), updatedAt: new Date() },
    ];
    const selected = selectRelevantKnowledge(knowledge, "هل تنشئون إعلانات TikTok؟");
    expect(selected.map(item => item.title)).toEqual(["إعلانات TikTok", "خطوة التأهيل"]);
    expect(selected.map(item => item.title)).not.toContain("سياسة الإرجاع");
  });

  it("adds factual, language-aware and next-step quality guardrails to the prompt", () => {
    const prompt = buildAgentPrompt(agent, [], "أريد إعلاناً لمتجري");
    expect(prompt).toContain("طابق لغة رسالة العميل الأخيرة");
    expect(prompt).toContain("لا تخترع أسعاراً أو باقات أو خصومات أو ضمانات أداء");
    expect(prompt).toContain("إن كتب بالإنجليزية، أجب بالإنجليزية فقط");
    expect(prompt).toContain("لا تفترض دعماً للفيديو");
    expect(prompt).toContain("اختم كل رد بخطوة عملية مناسبة");
    expect(prompt).toContain("نبرة خليجية محايدة");
    expect(prompt).toContain("Arabizi");
  });

  it("emits a higher-priority language requirement for bilingual agents", () => {
    expect(getReplyLanguageInstruction(agent, "Can you create ads for TikTok?")).toContain("Respond entirely in English");
    expect(getReplyLanguageInstruction(agent, "هل تدعمون إعلانات تيك توك؟")).toContain("Respond entirely in Arabic");
    expect(getReplyLanguageInstruction(agent, "ana 3ndi so2al 3an al as3ar")).toContain("Arabizi");
    expect(getReplyLanguageInstruction(agent, "ana 3ndi so2al 3an al as3ar")).toContain("Arabic script");
  });

  it("uses the enabled capability pack to constrain discovery and contact capture", () => {
    const answerOnlyAgent = { ...agent, capabilitiesJson: { enabled: ["answer"] } } as Agent;
    const prompt = buildAgentPrompt(answerOnlyAgent, [], "أريد عرض سعر");
    expect(prompt).toContain("القدرات المفعلة: answer");
    expect(prompt).toContain("لا تبدأ استجواباً تأهيلياً");
    expect(prompt).toContain("لا تطلب بيانات اتصال إلا عند التحويل البشري الصريح");
  });
});
