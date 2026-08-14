import type { Agent, KnowledgeBaseItem } from "../drizzle/schema";

export function buildAgentPrompt(agent: Agent, knowledge: KnowledgeBaseItem[], userMessage: string) {
  const knowledgeContext = knowledge.length
    ? knowledge
        .map(item => `### ${item.title}\n${item.content}`)
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
    "اكتب رداً واضحاً ومختصراً وقابلاً للتنفيذ. إذا كان السؤال غامضاً، اسأل سؤال متابعة واحداً فقط.",
  ].join("\n\n");
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
  const normalizedMessage = message.toLocaleLowerCase();
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
  };
}
