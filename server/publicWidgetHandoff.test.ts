import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  addMessage: vi.fn(async () => ({})),
  createNotification: vi.fn(async () => ({})),
  createLead: vi.fn(async () => ({})),
  updateConversationContact: vi.fn(async () => ({})),
  markConversationStatus: vi.fn(async () => ({})),
  getConversationWithMessages: vi.fn(async () => ({
    conversation: { id: 88, tenantId: 1, agentId: 5, status: "escalated" },
    messages: [],
  })),
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
    getConversationWithMessages: mocks.getConversationWithMessages,
    addMessage: mocks.addMessage,
    createNotification: mocks.createNotification,
    createLead: mocks.createLead,
    updateConversationContact: mocks.updateConversationContact,
    markConversationStatus: mocks.markConversationStatus,
    getKnowledgeForAgent: vi.fn(async () => []),
  };
});

import { appRouter } from "./routers";

describe("Public widget human handoff", () => {
  const caller = appRouter.createCaller({ req: { headers: {} } as any, res: {} as any, user: null });

  it("records a follow-up for the team but never asks the AI to reply after escalation", async () => {
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

  it("stores contact details for the human team after escalation", async () => {
    const result = await caller.chat.publicHandoffContact({
      agentId: 5,
      conversationId: 88,
      name: "عبدالله أحمد",
      phone: "+96875192909",
      email: "abdullah@example.com",
    });

    expect(result).toEqual({ success: true });
    expect(mocks.updateConversationContact).toHaveBeenCalledWith(expect.objectContaining({ customerName: "عبدالله أحمد", customerPhone: "+96875192909" }));
    expect(mocks.createLead).toHaveBeenCalledWith(expect.objectContaining({ conversationId: 88, phone: "+96875192909" }));
  });

  it("requires an email address before contact details can be submitted", async () => {
    await expect(caller.chat.publicHandoffContact({
      agentId: 5,
      conversationId: 88,
      name: "عبدالله أحمد",
      phone: "+96875192909",
    } as any)).rejects.toThrow();
  });

  it("resolves a normal conversation before accepting its rating", async () => {
    mocks.getConversationWithMessages.mockResolvedValue({ conversation: { id: 89, tenantId: 1, agentId: 5, status: "active" }, messages: [] });
    await expect(caller.chat.publicCloseConversation({ agentId: 5, conversationId: 89 })).resolves.toEqual({ success: true });
    expect(mocks.markConversationStatus).toHaveBeenCalledWith(1, 89, "resolved");

    mocks.getConversationWithMessages.mockResolvedValue({ conversation: { id: 89, tenantId: 1, agentId: 5, status: "resolved" }, messages: [] });
    await expect(caller.chat.publicRateConversation({ agentId: 5, conversationId: 89, rating: 5 })).resolves.toEqual({ success: true });
  });
});
