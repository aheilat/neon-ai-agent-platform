import express from "express";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  discoverWebsite: vi.fn(),
  getAgentInTenant: vi.fn(),
  listHandoffLeads: vi.fn(),
  getPostgresPool: vi.fn(),
}));

vi.mock("./runtime", () => ({
  addIndependentWorkspaceKnowledge: vi.fn(),
  applyIndependentWebsiteProposal: vi.fn(),
  createIndependentWorkspaceAgent: vi.fn(),
  getIndependentAgentKnowledge: vi.fn(),
  getIndependentWorkspaceAgents: vi.fn(),
  resolveIndependentWorkspaceSession: mocks.resolveSession,
  updateIndependentWorkspaceAgent: vi.fn(),
}));

vi.mock("./websiteDiscovery", () => ({
  assertIndependentAnalysisSources: vi.fn(),
  discoverIndependentWebsiteProposal: mocks.discoverWebsite,
  independentWebsiteAnalysisSchema: { safeParse: vi.fn() },
}));

vi.mock("./claude", () => ({ completeWithIndependentClaude: vi.fn(), extractKnowledgeFromIndependentImage: vi.fn() }));
vi.mock("./supabase", () => ({ getIndependentSupabaseServerClient: vi.fn() }));
vi.mock("./agentRepository", () => ({ addIndependentConversationMessage: vi.fn(), createIndependentConversation: vi.fn(), createIndependentHandoffLead: vi.fn(), getIndependentAgentInTenant: mocks.getAgentInTenant, getIndependentConversationInTenant: vi.fn(), listIndependentHandoffLeadsForAgent: mocks.listHandoffLeads, listIndependentKnowledgeForAgent: vi.fn(), updateIndependentAgentHandoffContact: vi.fn(), updateIndependentConversationStatus: vi.fn() }));
vi.mock("./postgres", () => ({ getIndependentPostgresPool: mocks.getPostgresPool }));

import { registerIndependentRuntimeRoutes } from "./routes";

describe("independent runtime routes", () => {
  it("rejects unauthenticated website knowledge before any public crawl or Claude request", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    const app = express();
    app.use(express.json());
    registerIndependentRuntimeRoutes(app);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected a TCP test server");
      const response = await fetch(`http://127.0.0.1:${address.port}/api/external/agents/7/website-knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: "https://example.com", consent: true }),
      });

      expect(response.status).toBe(401);
      expect(mocks.discoverWebsite).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("returns handoff requests only for the authenticated workspace and selected agent", async () => {
    const pool = {};
    mocks.resolveSession.mockResolvedValue({ workspace: { id: 44 } });
    mocks.getPostgresPool.mockReturnValue(pool);
    mocks.getAgentInTenant.mockResolvedValue({ id: 7, tenantId: 44 });
    mocks.listHandoffLeads.mockResolvedValue([{ id: 91, agentId: 7, tenantId: 44, name: "زائر", phone: "+962700000000", email: null, notes: "طلب عرضاً", status: "new", createdAt: new Date("2026-08-25T10:00:00.000Z"), updatedAt: new Date("2026-08-25T10:00:00.000Z") }]);
    const app = express();
    app.use(express.json());
    registerIndependentRuntimeRoutes(app);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected a TCP test server");
      const response = await fetch(`http://127.0.0.1:${address.port}/api/external/agents/7/handoff-requests`, {
        headers: { Authorization: "Bearer workspace-token" },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ leads: [{ id: 91, agentId: 7, tenantId: 44 }] });
      expect(mocks.getAgentInTenant).toHaveBeenCalledWith(pool, 44, 7);
      expect(mocks.listHandoffLeads).toHaveBeenCalledWith(pool, 44, 7);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
