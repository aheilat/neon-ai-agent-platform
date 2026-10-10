import { describe, expect, it, vi } from "vitest";
import { completeWithIndependentClaude, extractKnowledgeFromIndependentImage, getIndependentClaudeConfig, getIndependentGeminiConfig, shouldFallbackToGemini } from "./claude";

describe("independent Claude adapter", () => {
  it("stays disabled until an encrypted server key exists", () => {
    expect(getIndependentClaudeConfig({})).toBeUndefined();
  });

  it("uses the fast Claude alias by default and never exposes the key in the request", async () => {
    const create = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "أهلاً، كيف أساعدك؟" }],
    });
    const answer = await completeWithIndependentClaude(
      { system: "ساعد العميل", messages: [{ role: "user", content: "مرحبا" }] },
      { apiKey: "secret-key", model: "claude-haiku-4-5" },
      create,
    );

    expect(answer).toBe("أهلاً، كيف أساعدك؟");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-haiku-4-5", max_tokens: 800 }));
    expect(JSON.stringify(create.mock.calls)).not.toContain("secret-key");
  });

  it("uses a bounded per-request timeout for slower workflows", async () => {
    vi.useFakeTimers();
    try {
      const create = vi.fn().mockReturnValue(new Promise<never>(() => undefined));
      const pending = completeWithIndependentClaude(
        { system: "حلل الموقع", messages: [{ role: "user", content: "المحتوى" }], timeoutMs: 1_000 },
        { apiKey: "secret-key", model: "claude-haiku-4-5" },
        create,
      );
      const assertion = expect(pending).rejects.toThrow("Independent Claude request timed out");
      await vi.advanceTimersByTimeAsync(1_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("extracts image knowledge only through the server-side Claude client", async () => {
    const create = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "الخدمة: تأجير شاحنات مبردة" }] });
    const result = await extractKnowledgeFromIndependentImage(
      { fileName: "services.png", mediaType: "image/png", data: "aW1hZ2U=" },
      { apiKey: "secret-key", model: "claude-haiku-4-5" },
      create,
    );
    expect(result).toContain("شاحنات مبردة");
    expect(create.mock.calls[0]?.[0]?.messages[0]?.content[0]).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/png" } });
    expect(JSON.stringify(create.mock.calls)).not.toContain("secret-key");
  });
});

describe("Gemini backup provider", () => {
  const claude = { apiKey: "claude-key", model: "claude-haiku-4-5" };
  const gemini = { apiKey: "gemini-key", model: "gemini-2.5-flash" };
  const request = { system: "ساعد العميل", messages: [{ role: "user" as const, content: "مرحبا" }, { role: "assistant" as const, content: "أهلاً" }, { role: "user" as const, content: "السعر؟" }] };
  const geminiOk = () => vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: "من Gemini" }] } }] }) });

  it("is disabled without GEMINI_API_KEY and defaults to a flash model", () => {
    expect(getIndependentGeminiConfig({})).toBeUndefined();
    expect(getIndependentGeminiConfig({ GEMINI_API_KEY: " k " })).toEqual({ apiKey: "k", model: "gemini-2.5-flash" });
  });

  it("only falls back for credit, auth, rate-limit and outage errors", () => {
    expect(shouldFallbackToGemini(Object.assign(new Error("Your credit balance is too low"), { status: 400 }))).toBe(true);
    expect(shouldFallbackToGemini(Object.assign(new Error("x"), { status: 401 }))).toBe(true);
    expect(shouldFallbackToGemini(Object.assign(new Error("x"), { status: 429 }))).toBe(true);
    expect(shouldFallbackToGemini(Object.assign(new Error("x"), { status: 529 }))).toBe(true);
    expect(shouldFallbackToGemini(Object.assign(new Error("invalid request"), { status: 400 }))).toBe(false);
    expect(shouldFallbackToGemini(new Error("Independent Claude request timed out"))).toBe(false);
  });

  it("uses Gemini when Claude credit is exhausted, mapping roles and keeping the key in a header", async () => {
    const create = vi.fn().mockRejectedValue(Object.assign(new Error("Your credit balance is too low to access the Anthropic API"), { status: 400 }));
    const fetchImpl = geminiOk();
    const answer = await completeWithIndependentClaude(request, claude, create, gemini, fetchImpl);
    expect(answer).toBe("من Gemini");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain("gemini-2.5-flash:generateContent");
    expect(url).not.toContain("gemini-key");
    expect(init.headers["x-goog-api-key"]).toBe("gemini-key");
    expect(JSON.parse(init.body).contents.map((c: { role: string }) => c.role)).toEqual(["user", "model", "user"]);
  });

  it("does not call Gemini when Claude succeeds", async () => {
    const create = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "من Claude" }] });
    const fetchImpl = geminiOk();
    expect(await completeWithIndependentClaude(request, claude, create, gemini, fetchImpl)).toBe("من Claude");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not hide non-billing errors behind Gemini", async () => {
    const create = vi.fn().mockRejectedValue(Object.assign(new Error("invalid request"), { status: 400 }));
    const fetchImpl = geminiOk();
    await expect(completeWithIndependentClaude(request, claude, create, gemini, fetchImpl)).rejects.toThrow("invalid request");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses Gemini alone when no Claude key is set, and still fails clearly when neither exists", async () => {
    expect(await completeWithIndependentClaude(request, undefined, undefined, gemini, geminiOk())).toBe("من Gemini");
    await expect(completeWithIndependentClaude(request, undefined, undefined, undefined, geminiOk())).rejects.toThrow("not configured");
  });

  it("falls back for image knowledge extraction too", async () => {
    const create = vi.fn().mockRejectedValue(Object.assign(new Error("x"), { status: 402 }));
    const fetchImpl = geminiOk();
    const out = await extractKnowledgeFromIndependentImage({ fileName: "a.png", mediaType: "image/png", data: "aW1n" }, claude, create, gemini, fetchImpl);
    expect(out).toBe("من Gemini");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).contents[0].parts[0].inline_data.mime_type).toBe("image/png");
  });
});
