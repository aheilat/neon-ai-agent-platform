import { describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async (params) => {
    return {
      choices: [
        {
          message: {
            content: `Model used: ${params.model}`,
          },
        },
      ],
    };
  }),
  listLLMModels: vi.fn(async () => ({ data: [] })),
}));

import { invokeLLM } from "./_core/llm";

describe("Chat Routing Integration Test", () => {
  it("ensures agent.llmModel is correctly passed to invokeLLM during agent chat execution", async () => {
    const agent = {
      id: 10,
      tenantId: 1,
      name: "Claude Specialist",
      llmModel: "claude-3-5-sonnet",
      status: "active",
      escalationKeyword: "موظف",
      fallbackMessage: "متاح",
      persona: "Assistant",
      tone: "professional",
      language: "ar",
    };

    const userMessage = "مرحباً";
    const modelToUse = agent.llmModel;

    await invokeLLM({
      model: modelToUse,
      messages: [
        { role: "system", content: "System prompt with knowledge sources." },
        { role: "user", content: userMessage },
      ],
    });

    expect(vi.mocked(invokeLLM)).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-3-5-sonnet",
      })
    );
  });
});
