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
    `قواعد اتخاذ القرار: ${agent.decisionRules || "افهم الاحتياج، اقترح الخطوة الأنسب، واطلب بيانات التواصل عند الحاجة."}`,
    `رسالة التحويل للبشر عند الحاجة: ${agent.fallbackMessage || "سأحوّل محادثتك إلى أحد أعضاء الفريق لمساعدتك بشكل أدق."}`,
    "اعتمد على قاعدة المعرفة أدناه فقط عند ذكر معلومات خاصة بالعمل، ولا تخترع أسعاراً أو وعوداً غير مذكورة.",
    `قاعدة المعرفة:\n${knowledgeContext}`,
    `رسالة العميل:\n${userMessage}`,
    "اكتب رداً واضحاً ومختصراً وقابلاً للتنفيذ في 3 فقرات قصيرة كحد أقصى. لا تكرر السؤال ولا تضف مقدمات عامة. إذا كان السؤال غامضاً، اسأل سؤال متابعة واحداً فقط.",
  ].join("\n\n");
}

export function selectRelevantKnowledge(knowledge: KnowledgeBaseItem[], userMessage: string, limit = 6) {
  const terms = userMessage.toLocaleLowerCase().replace(/[ًٌٍَُِّْـ]/g, "").split(/\s+/).filter(term => term.length >= 3);
  return [...knowledge]
    .map((item, index) => {
      const searchable = `${item.title} ${item.content}`.toLocaleLowerCase().replace(/[ًٌٍَُِّْـ]/g, "");
      const score = terms.reduce((total, term) => total + (searchable.includes(term) ? 1 : 0), 0);
      return { item, index, score };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map(result => result.item);
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
  return (keywords || "human,موظف,موظفة").split(",").some(keyword => {
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
