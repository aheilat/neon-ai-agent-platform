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

export type IndependentGeminiConfig = {
  apiKey: string;
  model: string;
};

/** Optional backup provider, used only when Claude is unavailable (see shouldFallbackToGemini). */
export function getIndependentGeminiConfig(env: NodeJS.ProcessEnv = process.env): IndependentGeminiConfig | undefined {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) return undefined;
  return { apiKey, model: env.GEMINI_MODEL?.trim() || "gemini-2.5-flash" };
}

type FetchLike = (input: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/**
 * Claude errors that Gemini can safely cover: exhausted credit/billing, bad or revoked key,
 * rate limits and provider outages. Timeouts and request-shape errors are NOT covered, so a
 * slow request is never doubled and a bug is never hidden behind the backup provider.
 */
export function shouldFallbackToGemini(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = (error as { status?: number }).status;
  const message = error instanceof Error ? error.message : "";
  if (/timed out|timeout/i.test(message)) return false;
  if (typeof status === "number") {
    if ([401, 402, 403, 429, 529].includes(status) || status >= 500) return true;
    if (status === 400 && /credit|billing|balance/i.test(message)) return true;
    return false;
  }
  return /credit|billing|balance|not configured/i.test(message);
}

async function callGemini(
  config: IndependentGeminiConfig,
  body: Record<string, unknown>,
  timeoutMs: number,
  fetchImpl: FetchLike,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
      { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey }, body: JSON.stringify(body), signal: controller.signal },
    );
    if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}`);
    const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("\n").trim();
    if (!text) throw new Error("Gemini returned an empty response");
    return text;
  } finally {
    clearTimeout(timer);
  }
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
  gemini: IndependentGeminiConfig | undefined = getIndependentGeminiConfig(),
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<string> {
  const timeoutMs = Math.min(Math.max(request.timeoutMs ?? 15_000, 1_000), 20_000);
  const viaGemini = () => callGemini(gemini!, {
    systemInstruction: { parts: [{ text: request.system }] },
    contents: request.messages.map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
    generationConfig: { maxOutputTokens: Math.min(Math.max(request.maxTokens ?? 800, 1), 4096) },
  }, timeoutMs, fetchImpl);
  if (!config) {
    if (gemini) return viaGemini();
    throw new Error("Independent Claude is not configured");
  }
  try {
    return await completeWithClaudeOnly(request, config, createMessage);
  } catch (error) {
    if (gemini && shouldFallbackToGemini(error)) {
      console.warn("[independent-ai] Claude unavailable, using Gemini fallback:", error instanceof Error ? error.message : "unknown error");
      return viaGemini();
    }
    throw error;
  }
}

async function completeWithClaudeOnly(
  request: IndependentClaudeRequest,
  config: IndependentClaudeConfig,
  createMessage?: (input: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>,
): Promise<string> {
  const create = createMessage ?? ((input) => new Anthropic({ apiKey: config.apiKey }).messages.create(input));
  const completion = create({
    model: config.model,
    max_tokens: Math.min(Math.max(request.maxTokens ?? 800, 1), 4096),
    system: request.system,
    messages: request.messages,
  });
  const timeoutMs = Math.min(Math.max(request.timeoutMs ?? 15_000, 1_000), 20_000);
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
  gemini: IndependentGeminiConfig | undefined = getIndependentGeminiConfig(),
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<string> {
  const systemPrompt = IMAGE_SYSTEM_PROMPT;
  const viaGemini = () => callGemini(gemini!, {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ inline_data: { mime_type: input.mediaType, data: input.data } }, { text: `استخرج المعرفة التجارية المعتمدة من الصورة المرفوعة باسم ${input.fileName}.` }] }],
    generationConfig: { maxOutputTokens: 1_200 },
  }, 20_000, fetchImpl);
  if (!config) {
    if (gemini) return viaGemini();
    throw new Error("Independent Claude is not configured");
  }
  try {
    return await extractImageWithClaude(input, config, createMessage);
  } catch (error) {
    if (gemini && shouldFallbackToGemini(error)) return viaGemini();
    throw error;
  }
}

const IMAGE_SYSTEM_PROMPT = "أنت تستخرج معرفة تجارية من صورة يرفعها مالك الشركة إلى وكيله. اكتب فقط النص والحقائق المرئية القابلة للقراءة: أسماء خدمات أو منتجات، أسعار، تفاصيل، عناوين، وشروط. لا تخترع أي معلومة، ولا تفسر بيانات شخصية أو حساسة. أعد نصاً عربياً منظماً قابلاً للحفظ في قاعدة معرفة الوكيل.";

async function extractImageWithClaude(
  input: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; fileName: string },
  config: IndependentClaudeConfig,
  createMessage?: (input: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>,
): Promise<string> {
  const create = createMessage ?? ((request) => new Anthropic({ apiKey: config.apiKey }).messages.create(request));
  const response = await create({
    model: config.model,
    max_tokens: 1_200,
    system: IMAGE_SYSTEM_PROMPT,
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
