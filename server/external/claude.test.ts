import { describe, expect, it, vi } from "vitest";
import { completeWithIndependentClaude, extractKnowledgeFromIndependentImage, getIndependentClaudeConfig } from "./claude";

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
