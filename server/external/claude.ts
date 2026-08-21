import Anthropic from "@anthropic-ai/sdk";

export type IndependentClaudeConfig = {
  apiKey: string;
  model: string;
};

export function getIndependentClaudeConfig(env: NodeJS.ProcessEnv = process.env): IndependentClaudeConfig | undefined {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return undefined;
  return {
    apiKey,
    model: env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5",
  };
}

export type IndependentClaudeMessage = {
  role: "user" | "assistant";
  content: string;
};

export type IndependentClaudeRequest = {
  system: string;
  messages: IndependentClaudeMessage[];
  maxTokens?: number;
};

/**
 * Calls Claude only from the external server runtime. The browser never reads
 * ANTHROPIC_API_KEY, and the current managed Forge path remains unchanged.
 */
export async function completeWithIndependentClaude(
  request: IndependentClaudeRequest,
  config: IndependentClaudeConfig | undefined = getIndependentClaudeConfig(),
  createMessage?: (input: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>,
): Promise<string> {
  if (!config) throw new Error("Independent Claude is not configured");
  const create = createMessage ?? ((input) => new Anthropic({ apiKey: config.apiKey }).messages.create(input));
  const response = await create({
    model: config.model,
    max_tokens: Math.min(Math.max(request.maxTokens ?? 800, 1), 4096),
    system: request.system,
    messages: request.messages,
  });
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
