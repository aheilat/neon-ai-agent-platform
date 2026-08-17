import { describe, expect, it } from "vitest";
import { buildAgentPrompt } from "./agentEngine";

describe("agent prompt performance", () => {
  it("selects relevant context and builds a bounded prompt within a practical local budget", () => {
    const agent = {
      id: 1,
      tenantId: 1,
      name: "Oman Drive Assistant",
      persona: "مساعد مبيعات عملي",
      tone: "professional",
      language: "ar",
      decisionRules: "أجب بدقة وباختصار",
      fallbackMessage: "سيكمل الفريق معك",
    } as any;
    const knowledge = Array.from({ length: 750 }, (_, index) => ({
      id: index + 1,
      tenantId: 1,
      agentId: 1,
      title: index === 420 ? "تمويل الشاحنات" : `خدمة رقم ${index + 1}`,
      content: index === 420 ? "نوفّر خيارات تمويل وتأجير للشاحنات مع فريق مختص للمتابعة." : `تفاصيل معرفة مرجعية ثابتة للخدمة رقم ${index + 1}.`,
      category: "FAQ",
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }));

    const startedAt = performance.now();
    const prompt = buildAgentPrompt(agent, knowledge, "أريد تمويل شاحنة");
    const elapsedMs = performance.now() - startedAt;

    expect(prompt).toContain("تمويل الشاحنات");
    expect(prompt.length).toBeLessThan(10_000);
    expect(elapsedMs).toBeLessThan(250);
  });
});
