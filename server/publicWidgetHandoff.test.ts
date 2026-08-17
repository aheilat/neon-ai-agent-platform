import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  addMessage: vi.fn(async () => ({})),
  createNotification: vi.fn(async () => ({})),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: mocks.invokeLLM,
  listLLMModels: vi.fn(async () => ({ data: [] })),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getPublicAgent: vi.fn(async () => ({
      id: 5,
      tenantId: 1,
      name: "Oman Drive Assistant",
      status: "active",
      escalationKeyword: "موظف,human",
      fallbackMessage: "تم تحويل محادثتك إلى الفريق.",
      persona: "Assistant",
      tone: "professional",
      language: "ar",
      llmModel: "gpt-4o",
    })),
    getConversationWithMessages: vi.fn(async () => ({
      conversation: { id: 88, tenantId: 1, agentId: 5, status: "escalated" },
      messages: [],
    })),
    addMessage: mocks.addMessage,
    createNotification: mocks.createNotification,
    getKnowledgeForAgent: vi.fn(async () => []),
  };
});

import { appRouter } from "./routers";

describe("Public widget human handoff", () => {
  it("records a follow-up for the team but never asks the AI to reply after escalation", async () => {
    const caller = appRouter.createCaller({ req: { headers: {} } as any, res: {} as any, user: null });

    const result = await caller.chat.publicReply({
      agentId: 5,
      conversationId: 88,
      message: "هل هناك تحديث؟",
    });

    expect(result).toMatchObject({ content: "", escalated: true, handoff: true, conversationId: 88 });
    expect(mocks.addMessage).toHaveBeenCalledWith({ conversationId: 88, sender: "customer", content: "هل هناك تحديث؟" });
    expect(mocks.createNotification).toHaveBeenCalledOnce();
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
  });
});
