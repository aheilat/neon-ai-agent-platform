import { describe, expect, it, vi } from "vitest";
import {
  addIndependentWorkspaceKnowledge,
  applyIndependentWebsiteProposal,
  createIndependentWorkspaceAgent,
  IndependentPaidAgentRequiredError,
  getIndependentAgentKnowledge,
  getIndependentWorkspaceAgents,
  resolveIndependentWorkspaceSession,
  updateIndependentWorkspaceAgent,
} from "./runtime";

const user = {
  id: 5,
  openId: "neon-user",
  supabaseUserId: "cb75bb10-8a0c-4dd6-a57c-1d0a4ca69245",
  email: "owner@example.com",
  name: "Neon Owner",
  role: "admin" as const,
};

const workspace = { id: 9, ownerId: 5, name: "Neon Owner Workspace", slug: "neon-owner-5" };
const pool = { query: vi.fn() } as never;
const authenticatedContext = { identity: { supabaseUserId: "id", email: null, name: null }, user, workspace };

describe("independent runtime", () => {
  it("does not create a session unless both the Neon user and workspace are present", async () => {
    const session = await resolveIndependentWorkspaceSession("Bearer token", {
      createContext: vi.fn().mockResolvedValue({ identity: { supabaseUserId: "id", email: null, name: null }, user: user, workspace: undefined }),
    });

    expect(session).toBeUndefined();
  });

  it("builds a workspace agent response using the authenticated workspace ID only", async () => {
    const ensureDefaultAgent = vi.fn().mockResolvedValue({ id: 21, tenantId: 9, name: "Neon Concierge" });
    const listAgents = vi.fn().mockResolvedValue([{ id: 21, tenantId: 9, name: "Neon Concierge" }]);
    const result = await getIndependentWorkspaceAgents("Bearer token", {
      createContext: vi.fn().mockResolvedValue(authenticatedContext),
      getPool: () => pool,
      ensureDefaultAgent,
      listAgents,
      listKnowledge: vi.fn(),
    });

    expect(result?.workspace).toEqual(workspace);
    expect(ensureDefaultAgent).toHaveBeenCalledWith(pool, 9);
    expect(listAgents).toHaveBeenCalledWith(pool, 9);
  });

  it("refuses to query agents when the Supabase session is absent", async () => {
    const listAgents = vi.fn();
    const result = await getIndependentWorkspaceAgents(undefined, {
      createContext: vi.fn().mockResolvedValue({ identity: undefined, user: undefined, workspace: undefined }),
      getPool: () => pool,
      ensureDefaultAgent: vi.fn(),
      listAgents,
      listKnowledge: vi.fn(),
    });

    expect(result).toBeUndefined();
    expect(listAgents).not.toHaveBeenCalled();
  });

  it("uses the authenticated workspace when retrieving knowledge", async () => {
    const listKnowledge = vi.fn().mockResolvedValue([{ id: 2, tenantId: 9, agentId: 41 }]);
    const result = await getIndependentAgentKnowledge("Bearer token", 41, {
      createContext: vi.fn().mockResolvedValue(authenticatedContext),
      getPool: () => pool,
      ensureDefaultAgent: vi.fn(),
      listAgents: vi.fn(),
      listKnowledge,
    });

    expect(result?.knowledge).toEqual([{ id: 2, tenantId: 9, agentId: 41 }]);
    expect(listKnowledge).toHaveBeenCalledWith(pool, 9, 41);
  });

  it("updates an agent using the authenticated tenant rather than a browser-supplied tenant", async () => {
    const updateAgent = vi.fn().mockResolvedValue({ id: 41, tenantId: 9, name: "وكيل" });
    await updateIndependentWorkspaceAgent("Bearer token", 41, {
      name: "وكيل",
      description: null,
      persona: null,
      tone: "friendly",
      language: "bilingual",
      status: "active",
    }, {
      createContext: vi.fn().mockResolvedValue(authenticatedContext),
      getPool: () => pool,
      getAgent: vi.fn(),
      createAgent: vi.fn(),
      updateAgent,
      createKnowledge: vi.fn(),
    });

    expect(updateAgent).toHaveBeenCalledWith(pool, 9, 41, expect.objectContaining({ name: "وكيل" }));
  });

  it("refuses to add knowledge to an agent outside the authenticated tenant", async () => {
    const createKnowledge = vi.fn();
    const result = await addIndependentWorkspaceKnowledge("Bearer token", 41, {
      title: "خدمة",
      content: "تفاصيل",
      category: "business",
      sourceUrl: null,
      sourceTitle: null,
    }, {
      createContext: vi.fn().mockResolvedValue(authenticatedContext),
      getPool: () => pool,
      getAgent: vi.fn().mockResolvedValue(undefined),
      createAgent: vi.fn(),
      updateAgent: vi.fn(),
      createKnowledge,
    });

    expect(result).toBeNull();
    expect(createKnowledge).not.toHaveBeenCalled();
  });

  it("blocks a second agent for a workspace without a paid entitlement", async () => {
    const createAgent = vi.fn();
    await expect(createIndependentWorkspaceAgent("Bearer token", {
      name: "Second agent",
      description: null,
      persona: null,
      tone: "friendly",
      language: "ar",
      status: "active",
      llmModel: "claude-haiku-4-5",
      decisionRules: null,
      fallbackMessage: null,
      escalationKeyword: "human",
      capabilitiesJson: { enabled: ["answer"] },
    }, {
      createContext: vi.fn().mockResolvedValue(authenticatedContext),
      getPool: () => pool,
      getAgent: vi.fn(),
      createAgent,
      countAgents: vi.fn().mockResolvedValue(1),
      hasPaidEntitlement: vi.fn().mockResolvedValue(false),
      updateAgent: vi.fn(),
      updateWebsiteProposal: vi.fn(),
      createKnowledge: vi.fn(),
    })).rejects.toBeInstanceOf(IndependentPaidAgentRequiredError);
    expect(createAgent).not.toHaveBeenCalled();
  });

  it("reuses the durable default agent when applying an approved website proposal", async () => {
    const existingAgent = { id: 21, tenantId: 9, name: "Neon Concierge" };
    const createAgent = vi.fn();
    const createKnowledge = vi.fn().mockResolvedValue({ id: 301 });
    const updateWebsiteProposal = vi.fn().mockResolvedValue({ id: 21, tenantId: 9, name: "Joa Academy" });
    const proposal = {
      websiteUrl: "https://joacademy.com/",
      pages: [{ url: "https://joacademy.com/", title: "Joa", description: "Education", headings: ["Courses"] }],
      analysis: {
        businessName: "Joa Academy",
        businessSummary: "منصة تعليمية",
        industry: "Education",
        audience: "Students",
        language: "ar" as const,
        tone: "friendly" as const,
        persona: "مساعد أكاديمي واضح",
        goals: ["answer"],
        suggestedChannels: ["web"],
        services: [{ name: "الدورات", description: "دورات تعليمية", sourceUrl: "https://joacademy.com/" }],
        faqs: [],
        guardrails: ["لا تخترع معلومات"],
      },
    };
    const result = await applyIndependentWebsiteProposal("Bearer token", proposal, {
      createContext: vi.fn().mockResolvedValue(authenticatedContext),
      getPool: () => pool,
      getAgent: vi.fn(),
      listAgents: vi.fn().mockResolvedValue([existingAgent]),
      createAgent,
      updateAgent: vi.fn(),
      updateWebsiteProposal,
      createKnowledge,
    });

    expect(result?.agent.id).toBe(21);
    expect(createAgent).not.toHaveBeenCalled();
    expect(updateWebsiteProposal).toHaveBeenCalledWith(pool, 9, 21, expect.objectContaining({ name: "Joa Academy" }));
    expect(createKnowledge).toHaveBeenCalledWith(pool, expect.objectContaining({ tenantId: 9, agentId: 21, title: "الدورات" }));
  });
});
