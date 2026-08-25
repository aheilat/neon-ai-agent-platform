import { describe, expect, it, vi } from "vitest";
import { generateIndependentAgentReply } from "./chat";

const user = { id: 5, openId: "neon-user", supabaseUserId: "id", email: null, name: "Neon", role: "admin" as const };
const workspace = { id: 9, ownerId: 5, name: "Neon Workspace", slug: "neon-5" };
const pool = { query: vi.fn() } as never;
const agent = {
  id: 11, tenantId: 9, name: "Neon Concierge", description: null, persona: "كن ودوداً.", tone: "friendly", language: "bilingual", llmModel: "claude-haiku-4-5", decisionRules: null, fallbackMessage: null, escalationKeyword: "human", capabilitiesJson: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(),
};

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    createContext: vi.fn().mockResolvedValue({ identity: { supabaseUserId: "id", email: null, name: null }, user, workspace }),
    getPool: () => pool,
    getAgent: vi.fn().mockResolvedValue(agent),
    getKnowledge: vi.fn().mockResolvedValue([{ id: 2, agentId: 11, tenantId: 9, title: "الخدمة", content: "نساعد العملاء في تجربة Neon.", category: "FAQ", sourceUrl: null, sourceTitle: null, sourceFetchedAt: null, createdAt: new Date(), updatedAt: new Date() }]),
    complete: vi.fn().mockResolvedValue("أهلاً، كيف أساعدك؟"),
    ...overrides,
  } as never;
}

describe("independent agent chat", () => {
  it("builds a Claude request from the authenticated workspace agent and its knowledge", async () => {
    const deps = dependencies();
    const result = await generateIndependentAgentReply("Bearer token", { agentId: 11, message: "ما هي الخدمة؟" }, deps);

    expect(result).toEqual({ kind: "success", reply: "أهلاً، كيف أساعدك؟", agentId: 11 });
    expect(deps.getAgent).toHaveBeenCalledWith(pool, 9, 11);
    expect(deps.getKnowledge).toHaveBeenCalledWith(pool, 9, 11);
    expect(deps.complete).toHaveBeenCalledWith(expect.objectContaining({
      system: expect.stringContaining("نساعد العملاء في تجربة Neon."),
      messages: [{ role: "user", content: "ما هي الخدمة؟" }],
      maxTokens: 800,
    }));
  });

  it("does not call Claude when no authenticated independent session exists", async () => {
    const deps = dependencies({ createContext: vi.fn().mockResolvedValue({ identity: undefined, user: undefined, workspace: undefined }) });
    const result = await generateIndependentAgentReply(undefined, { agentId: 11, message: "مرحبا" }, deps);

    expect(result).toEqual({ kind: "unauthorized" });
    expect(deps.complete).not.toHaveBeenCalled();
  });

  it("returns a truthful Arabic degraded reply when Claude is unavailable", async () => {
    const deps = dependencies({ complete: vi.fn().mockRejectedValue(new Error("timeout")) });
    const result = await generateIndependentAgentReply("Bearer token", { agentId: 11, message: "مرحبا" }, deps);

    expect(result.kind).toBe("success");
    expect(result.reply).toContain("مشغولة مؤقتاً");
    expect(result.reply).toContain("التحدث مع موظف");
  });

  it("does not call Claude for an inactive or foreign agent", async () => {
    const deps = dependencies({ getAgent: vi.fn().mockResolvedValue(undefined) });
    const result = await generateIndependentAgentReply("Bearer token", { agentId: 44, message: "مرحبا" }, deps);

    expect(result).toEqual({ kind: "not-found" });
    expect(deps.complete).not.toHaveBeenCalled();
  });
});
