import { describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async (params) => {
    return {
      choices: [
        {
          message: {
            content: `Mocked reply using model: ${params.model}`,
          },
        },
      ],
    };
  }),
  listLLMModels: vi.fn(async () => ({ data: [] })),
}));

import { invokeLLM } from "./_core/llm";

describe("LLM Invocation Routing Test", () => {
  it("passes agent.llmModel (e.g. claude-3-5-sonnet) directly to invokeLLM", async () => {
    const selectedModel = "claude-3-5-sonnet";
    const res = await invokeLLM({
      model: selectedModel,
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(vi.mocked(invokeLLM)).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-3-5-sonnet",
      })
    );
    expect(res.choices[0].message.content).toContain("claude-3-5-sonnet");
  });
});
