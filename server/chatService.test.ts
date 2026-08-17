import { describe, expect, it, vi } from "vitest";
import { generateFastChatReply } from "./chatService";
import { buildAgentPrompt } from "./agentEngine";

describe("generateFastChatReply", () => {
  it("falls back to a second provider when the primary model fails", async () => {
    const invoke = vi.fn()
      .mockRejectedValueOnce(new Error("primary unavailable"))
      .mockResolvedValueOnce({ choices: [{ message: { content: "رد بديل جاهز" } }] });

    const result = await generateFastChatReply("auto", [{ role: "user", content: "مرحبا" }], invoke as any);

    expect(result).toEqual({ content: "رد بديل جاهز", model: "gemini-3-flash-preview" });
    expect(invoke.mock.calls.map(call => call[0].model)).toEqual(["claude-haiku-4-5", "gemini-3-flash-preview"]);
  });

  it("keeps model routing inside a fixed local performance budget", async () => {
    const invoke = vi.fn(async () => ({ choices: [{ message: { content: "رد سريع" } }] }));
    const startedAt = performance.now();
    const result = await generateFastChatReply("auto", [{ role: "user", content: "مرحبا" }], invoke as any);
    const elapsedMs = performance.now() - startedAt;

    expect(result.model).toBe("claude-haiku-4-5");
    expect(elapsedMs).toBeLessThan(50);
  });

  it("keeps local prompt construction and model routing within one budget", async () => {
    const agent = { id: 1, tenantId: 1, name: "Oman Drive", persona: "مساعد عملي", tone: "professional", language: "ar", decisionRules: "أجب باختصار", fallbackMessage: "يتابع الفريق", escalationKeyword: "موظف" } as any;
    const knowledge = Array.from({ length: 120 }, (_, index) => ({ id: index + 1, tenantId: 1, agentId: 1, title: `معلومة ${index}`, content: index === 40 ? "تمويل الشاحنات متاح ضمن الخيارات." : `تفاصيل عامة ثابتة ${index}`, category: "FAQ", createdAt: new Date(0), updatedAt: new Date(0) }));
    const invoke = vi.fn(async () => ({ choices: [{ message: { content: "نستطيع مساعدتك بخيارات التمويل." } }] }));
    const startedAt = performance.now();
    const prompt = buildAgentPrompt(agent, knowledge, "أريد تمويل شاحنة");
    const result = await generateFastChatReply("auto", [{ role: "user", content: prompt }], invoke as any);
    const elapsedMs = performance.now() - startedAt;

    expect(prompt).toContain("تمويل الشاحنات");
    expect(result.content).toContain("التمويل");
    expect(elapsedMs).toBeLessThan(150);
  });
});
