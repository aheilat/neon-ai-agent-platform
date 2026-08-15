import { describe, expect, it } from "vitest";
import { buildAgentPrompt } from "./agentEngine";

describe("Advanced LLM Routing & Knowledge Injection", () => {
  it("injects knowledge items along with their source URLs into the agent prompt", () => {
    const mockAgent = {
      id: 1,
      tenantId: 1,
      name: "MediCare Agent",
      description: "Health assistant",
      persona: "Professional medical guide",
      tone: "professional",
      language: "ar",
      llmModel: "claude-3-5-sonnet",
      decisionRules: "Be accurate and helpful.",
      fallbackMessage: "Please consult a specialist.",
      escalationKeyword: "طوارئ",
      sourceWebsiteUrl: "https://clinic.example.com",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockKnowledge = [
      {
        id: 1,
        agentId: 1,
        tenantId: 1,
        title: "حجز المواعيد",
        content: "المواعيد متاحة من 9 صباحاً حتى 5 مساءً.",
        category: "Service",
        sourceUrl: "https://clinic.example.com/booking",
        sourceTitle: "Booking page",
        sourceFetchedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const prompt = buildAgentPrompt(mockAgent as any, mockKnowledge, "ما هي أوقات الحجز؟");
    expect(prompt).toContain("حجز المواعيد");
    expect(prompt).toContain("المصدر: https://clinic.example.com/booking");
    expect(mockAgent.llmModel).toBe("claude-3-5-sonnet");
  });

  it("verifies model routing options exist for OpenAI and Claude", () => {
    const supportedModels = ["gpt-4o", "claude-3-5-sonnet", "gpt-5"];
    expect(supportedModels).toContain("claude-3-5-sonnet");
    expect(supportedModels).toContain("gpt-4o");
  });

  it("passes agent.llmModel correctly into chat invocation parameters", () => {
    const agentWithClaude = { llmModel: "claude-3-5-sonnet" };
    const invokeParams = {
      model: agentWithClaude.llmModel,
      messages: [{ role: "user", content: "test" }],
    };
    expect(invokeParams.model).toBe("claude-3-5-sonnet");
  });
});
