import { invokeLLM, type InvokeParams, type InvokeResult } from "./_core/llm";
import { normalizeLlmContent } from "./agentEngine";
import { getChatModelCandidates } from "./chatModels";

export type ChatLlmMessage = { role: "system" | "user" | "assistant"; content: string };
type LlmInvoker = (params: InvokeParams) => Promise<InvokeResult>;

export async function generateFastChatReply(
  preferredModel: string | null | undefined,
  messages: ChatLlmMessage[],
  invoke: LlmInvoker = invokeLLM
) {
  let lastError: unknown;
  for (const model of getChatModelCandidates(preferredModel)) {
    const startedAt = Date.now();
    try {
      const response = await invoke({ model, messages, maxTokens: 600 });
      const content = normalizeLlmContent(response.choices?.[0]?.message?.content);
      if (!content) throw new Error("LLM returned empty content");
      console.info("[AI Agent] Chat response", { model, durationMs: Date.now() - startedAt });
      return { content, model };
    } catch (error) {
      lastError = error;
      console.warn("[AI Agent] Model unavailable, trying fallback", { model, durationMs: Date.now() - startedAt });
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No chat model is available");
}
