import { describe, expect, it, vi } from "vitest";
import { getIndependentAgentKnowledge, getIndependentWorkspaceAgents, resolveIndependentWorkspaceSession } from "./runtime";

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
      createContext: vi.fn().mockResolvedValue({ identity: { supabaseUserId: "id", email: null, name: null }, user, workspace }),
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
      createContext: vi.fn().mockResolvedValue({ identity: { supabaseUserId: "id", email: null, name: null }, user, workspace }),
      getPool: () => pool,
      ensureDefaultAgent: vi.fn(),
      listAgents: vi.fn(),
      listKnowledge,
    });

    expect(result?.knowledge).toEqual([{ id: 2, tenantId: 9, agentId: 41 }]);
    expect(listKnowledge).toHaveBeenCalledWith(pool, 9, 41);
  });
});
