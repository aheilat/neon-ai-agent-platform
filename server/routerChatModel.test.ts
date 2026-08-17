import { describe, expect, it, vi } from "vitest";

const mockInvokeLLM = vi.fn(async (params) => {
  return {
    choices: [
      {
        message: {
          content: `Executed with model: ${params.model}`,
        },
      },
    ],
  };
});

vi.mock("./_core/llm", () => ({
  invokeLLM: (params: any) => mockInvokeLLM(params),
  listLLMModels: vi.fn(async () => ({ data: [] })),
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    workspaceForUser: vi.fn(async () => ({ id: 1, name: "Test Tenant" })),
    getAgentInTenant: vi.fn(async () => ({
      id: 5,
      tenantId: 1,
      name: "Claude Bot",
      llmModel: "claude-3-5-sonnet",
      status: "active",
      escalationKeyword: "موظف",
      fallbackMessage: "متاح",
      persona: "Assistant",
      tone: "professional",
      language: "ar",
    })),
    getKnowledgeForAgent: vi.fn(async () => []),
    getConversationWithMessages: vi.fn(async () => null),
    createConversation: vi.fn(async () => ({ id: 10, tenantId: 1, agentId: 5 })),
    addMessage: vi.fn(async () => ({})),
    markConversationStatus: vi.fn(async () => ({})),
  };
});

import { appRouter } from "./routers";

describe("Router chat.reply LLM Model Routing", () => {
  it("migrates a legacy Claude model name to the supported routing model", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "test-user", name: "Tester", role: "admin" },
      req: { headers: { cookie: "" } } as any,
      res: {} as any,
    });

    const res = await caller.chat.reply({
      agentId: 5,
      message: "Hello Claude",
      channel: "web",
    });

    expect(mockInvokeLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
      })
    );
    expect(res.content).toContain("claude-sonnet-4-6");
  });
});
