export const CHAT_MODEL_OPTIONS = [
  { id: "auto", label: "ذكي وسريع — Claude Haiku", provider: "Anthropic" },
  { id: "gpt-5-mini", label: "GPT-5 mini — سريع", provider: "OpenAI" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 — جودة عالية", provider: "Anthropic" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash — سياق طويل", provider: "Google" },
] as const;

const legacyModelAliases: Record<string, string> = {
  "gpt-4o": "auto",
  "claude-3-5-sonnet": "claude-sonnet-4-6",
  claude: "claude-sonnet-4-6",
  gemini: "gemini-3-flash-preview",
};

export function normalizeChatModel(preferred: string | null | undefined) {
  const candidate = (preferred || "auto").trim();
  const normalized = legacyModelAliases[candidate] || candidate;
  return CHAT_MODEL_OPTIONS.some(option => option.id === normalized) ? normalized : "auto";
}

export function getChatModelCandidates(preferred: string | null | undefined) {
  const selected = normalizeChatModel(preferred);
  const primary = selected === "auto" ? "claude-haiku-4-5" : selected;
  return Array.from(new Set([primary, "gemini-3-flash-preview", "gpt-5-mini"]));
}
