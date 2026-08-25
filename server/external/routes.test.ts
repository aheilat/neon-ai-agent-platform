import express from "express";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  discoverWebsite: vi.fn(),
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
vi.mock("./agentRepository", () => ({ addIndependentConversationMessage: vi.fn(), createIndependentConversation: vi.fn(), createIndependentHandoffLead: vi.fn(), getIndependentAgentInTenant: vi.fn(), getIndependentConversationInTenant: vi.fn(), listIndependentKnowledgeForAgent: vi.fn(), updateIndependentAgentHandoffContact: vi.fn(), updateIndependentConversationStatus: vi.fn() }));
vi.mock("./postgres", () => ({ getIndependentPostgresPool: vi.fn() }));

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
});
