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
  /** Allows slower, bounded workflows such as website analysis to use a larger budget. */
  timeoutMs?: number;
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
  const completion = create({
    model: config.model,
    max_tokens: Math.min(Math.max(request.maxTokens ?? 800, 1), 4096),
    system: request.system,
    messages: request.messages,
  });
  const timeoutMs = Math.min(Math.max(request.timeoutMs ?? 3_500, 1_000), 20_000);
  const response = await new Promise<Anthropic.Message>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Independent Claude request timed out")), timeoutMs);
    completion.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export async function extractKnowledgeFromIndependentImage(
  input: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; fileName: string },
  config: IndependentClaudeConfig | undefined = getIndependentClaudeConfig(),
  createMessage?: (input: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>,
): Promise<string> {
  if (!config) throw new Error("Independent Claude is not configured");
  const create = createMessage ?? ((request) => new Anthropic({ apiKey: config.apiKey }).messages.create(request));
  const response = await create({
    model: config.model,
    max_tokens: 1_200,
    system: "أنت تستخرج معرفة تجارية من صورة يرفعها مالك الشركة إلى وكيله. اكتب فقط النص والحقائق المرئية القابلة للقراءة: أسماء خدمات أو منتجات، أسعار، تفاصيل، عناوين، وشروط. لا تخترع أي معلومة، ولا تفسر بيانات شخصية أو حساسة. أعد نصاً عربياً منظماً قابلاً للحفظ في قاعدة معرفة الوكيل.",
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: input.mediaType, data: input.data } },
        { type: "text", text: `استخرج المعرفة التجارية المعتمدة من الصورة المرفوعة باسم ${input.fileName}.` },
      ],
    }],
  });
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
