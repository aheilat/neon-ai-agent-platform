import type { Agent, KnowledgeBaseItem } from "../drizzle/schema";

export function buildAgentPrompt(agent: Agent, knowledge: KnowledgeBaseItem[], userMessage: string) {
  const relevantKnowledge = selectRelevantKnowledge(knowledge, userMessage);
  const knowledgeContext = relevantKnowledge.length
    ? relevantKnowledge
        .map(item => `### ${item.title}\n${item.content.slice(0, 1200)}${item.sourceUrl ? `\nالمصدر: ${item.sourceUrl}` : ""}`)
        .join("\n\n")
    : "لا توجد مواد معرفة إضافية متاحة حالياً.";

  return [
    `أنت الوكيل ${agent.name} لمنصة Neon AI Agent.`,
    `الشخصية: ${agent.persona || "مساعد ذكي ودود وعملي."}`,
    `النبرة: ${agent.tone}.`,
    `لغة الرد المفضلة: ${agent.language === "bilingual" ? "العربية أو الإنجليزية حسب لغة العميل" : agent.language === "en" ? "الإنجليزية" : "العربية"}.`,
    `ملخص العمل: ${agent.description || "خدمة العملاء والمبيعات."}`,
    `قواعد اتخاذ القرار: ${agent.decisionRules || "افهم الاحتياج، اقترح الخطوة الأنسب، واطلب بيانات التواصل عند الحاجة."}`,
    `رسالة التحويل للبشر عند الحاجة: ${agent.fallbackMessage || "سأحوّل محادثتك إلى أحد أعضاء الفريق لمساعدتك بشكل أدق."}`,
    "منهجية جودة الرد: طابق لغة رسالة العميل الأخيرة حرفياً: إن كتب بالإنجليزية، أجب بالإنجليزية فقط؛ وإن كتب بالعربية، أجب بالعربية فقط. قدّم حقيقة مدعومة فقط عند الحديث عن الخدمة أو السعر أو النتائج. لا تخترع أسعاراً أو باقات أو خصومات أو ضمانات أداء، ولا تفترض دعماً للفيديو أو أي صيغة أو ميزة لا تذكرها المعرفة صراحة. إذا لم تؤكد المعرفة الإجابة، اذكر ذلك بوضوح واسأل سؤال متابعة واحداً أو اعرض التحويل للفريق. عند استكشاف احتياج تسويقي، ابدأ بأهم تفصيل ناقص فقط، مثل المنصة أو الهدف أو المجال أو نوع الأصل الإعلاني. اختم كل رد بخطوة عملية مناسبة ولا تكرر سؤالاً أجاب عنه العميل.",
    `قاعدة المعرفة:\n${knowledgeContext}`,
    `رسالة العميل:\n${userMessage}`,
    "اكتب رداً واضحاً ومختصراً وقابلاً للتنفيذ في 3 فقرات قصيرة كحد أقصى. لا تضف مقدمات عامة أو ادعاءات تسويقية فارغة. إذا كان السؤال غامضاً، اسأل سؤال متابعة واحداً فقط.",
  ].join("\n\n");
}

export function getReplyLanguageInstruction(agent: Agent, userMessage: string) {
  if (agent.language === "ar") return "LANGUAGE REQUIREMENT: Respond entirely in Arabic. Do not add an English translation unless the customer asks for one.";
  if (agent.language === "en") return "LANGUAGE REQUIREMENT: Respond entirely in English. Do not add an Arabic translation unless the customer asks for one.";
  const containsArabic = /[\u0600-\u06FF]/.test(userMessage);
  return containsArabic
    ? "LANGUAGE REQUIREMENT: The customer's latest message is Arabic. Respond entirely in Arabic, even if the knowledge source is English. Do not add an English translation unless asked."
    : "LANGUAGE REQUIREMENT: The customer's latest message is English. Respond entirely in English, even if the knowledge source is Arabic. Do not add an Arabic translation unless asked.";
}

export function selectRelevantKnowledge(knowledge: KnowledgeBaseItem[], userMessage: string, limit = 6) {
  const terms = userMessage.toLocaleLowerCase().replace(/[ًٌٍَُِّْـ]/g, "").split(/\s+/).filter(term => term.length >= 3);
  const scoredKnowledge = [...knowledge]
    .map((item, index) => {
      const searchable = `${item.title} ${item.content}`.toLocaleLowerCase().replace(/[ًٌٍَُِّْـ]/g, "");
      const score = terms.reduce((total, term) => total + (searchable.includes(term) ? 1 : 0), 0);
      const isOperationalGuidance = item.category === "Agent goal";
      return { item, index, score, isOperationalGuidance };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const operationalGuidance = scoredKnowledge.filter(result => result.isOperationalGuidance);
  const matchedKnowledge = scoredKnowledge.filter(result => result.score > 0 && !result.isOperationalGuidance);
  const fallbackKnowledge = matchedKnowledge.length === 0
    ? scoredKnowledge.filter(result => !result.isOperationalGuidance).slice(0, 1)
    : [];
  return [...matchedKnowledge, ...operationalGuidance, ...fallbackKnowledge].slice(0, limit).map(result => result.item);
}

export function normalizeLlmContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String((part as { text?: unknown }).text ?? "");
        return "";
      })
      .join(" ")
      .trim();
  }
  return "";
}

export function containsEscalationKeyword(message: string, keywords: string | null | undefined) {
  const normalizedMessage = message.toLocaleLowerCase().replace(/[ًٌٍَُِّْـ]/g, "").trim();
  const explicitTransferRequest = [
    /(^|\s)(نعم\s+)?حو[لّ]ني(\s|$)/,
    /(?:اريد|أريد)\s+(?:ال)?تحويل/,
    /(?:نعم|yes)[,،\s]+(?:حو[لّ]ني|transfer)/,
    /\btransfer me\b/i,
    /\bconnect me to (?:a )?(?:human|agent|team)\b/i,
  ].some(pattern => pattern.test(normalizedMessage));
  if (explicitTransferRequest) return true;
  return (keywords || "human,موظف,موظفة").split(/[,،]/).some(keyword => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase();
    return normalizedKeyword.length > 0 && normalizedMessage.includes(normalizedKeyword);
  });
}
// Keeps this module framework-agnostic so the prompt and escalation rules are easy to test.
export type AgentReply = {
  content: string;
  escalated: boolean;
};

export function fallbackReply(agent: Agent): AgentReply {
  return {
    content: agent.fallbackMessage || "أفهم طلبك. سأحوّل المحادثة إلى أحد أعضاء الفريق لمساعدتك.",
    escalated: true,
  };
}

export function createAssistantReply(content: string, escalated = false): AgentReply {
  return { content: content || "أحتاج إلى تفاصيل أكثر حتى أساعدك بشكل دقيق.", escalated };
}

export function toSafeAgentSettings(agent: Agent) {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    tone: agent.tone,
    language: agent.language,
    status: agent.status,
    sourceWebsiteUrl: agent.sourceWebsiteUrl,
    lastWebsiteSyncAt: agent.lastWebsiteSyncAt,
    syncIntervalHours: agent.syncIntervalHours,
    syncCronTaskUid: agent.syncCronTaskUid,
    llmModel: agent.llmModel,
  };
}
