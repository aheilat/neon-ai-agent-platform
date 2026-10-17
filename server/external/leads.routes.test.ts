import type { Server } from "node:http";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), pool: vi.fn(), agent: vi.fn(), list: vi.fn(), update: vi.fn() }));
vi.mock("./runtime", () => ({ resolveIndependentWorkspaceSession: mocks.session }));
vi.mock("./postgres", () => ({ getIndependentPostgresPool: mocks.pool }));
vi.mock("./agentRepository", () => ({ getIndependentAgentInTenant: mocks.agent }));
vi.mock("./websiteDiscovery", () => ({ assertIndependentAnalysisSources: vi.fn(), discoverIndependentWebsiteProposal: vi.fn(), independentWebsiteAnalysisSchema: { parse: vi.fn() } }));
vi.mock("./chat", () => ({ generateIndependentAgentReplyForTenant: vi.fn() }));
vi.mock("./claude", () => ({ completeWithIndependentClaude: vi.fn(), extractKnowledgeFromIndependentImage: vi.fn() }));
vi.mock("./supabase", () => ({ getIndependentSupabaseServerClient: vi.fn() }));
vi.mock("./leadRepository", async importActual => ({ ...(await importActual<typeof import("./leadRepository")>()), listIndependentLeads: mocks.list, updateIndependentLead: mocks.update }));

import { registerIndependentRuntimeRoutes } from "./routes";

describe("lead routes", () => {
  let server: Server;
  let base = "";
  const json = { authorization: "Bearer t", "content-type": "application/json" };

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ workspace: { id: 7 } });
    mocks.pool.mockReturnValue({});
    mocks.agent.mockResolvedValue({ id: 2 });
    const app = express();
    app.use(express.json());
    registerIndependentRuntimeRoutes(app);
    server = await new Promise<Server>(resolve => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterEach(() => new Promise<void>(resolve => server.close(() => resolve())));

  it("requires authentication", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await fetch(`${base}/api/external/agents/2/leads`)).status).toBe(401);
    expect((await fetch(`${base}/api/external/agents/2/leads/5`, { method: "PATCH", headers: json, body: JSON.stringify({ status: "closed" }) })).status).toBe(401);
  });

  it("lists leads for the workspace and rejects an invalid status filter", async () => {
    mocks.list.mockResolvedValue({ leads: [], total: 0, statusCounts: {}, limit: 25, offset: 0 });
    const ok = await fetch(`${base}/api/external/agents/2/leads?status=new&search=sara`, { headers: json });
    expect(ok.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith({}, 7, 2, expect.objectContaining({ status: "new", search: "sara" }));
    expect((await fetch(`${base}/api/external/agents/2/leads?status=bogus`, { headers: json })).status).toBe(400);
  });

  it("returns 404 when the agent is not in the workspace", async () => {
    mocks.agent.mockResolvedValue(undefined);
    expect((await fetch(`${base}/api/external/agents/2/leads`, { headers: json })).status).toBe(404);
  });

  it("updates a lead and returns 404 for a foreign lead", async () => {
    mocks.update.mockResolvedValueOnce({ id: 5, status: "qualified" });
    const ok = await fetch(`${base}/api/external/agents/2/leads/5`, { method: "PATCH", headers: json, body: JSON.stringify({ status: "qualified", notes: "call tomorrow" }) });
    expect(ok.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({}, 7, 2, 5, { status: "qualified", notes: "call tomorrow" });
    mocks.update.mockResolvedValueOnce(undefined);
    expect((await fetch(`${base}/api/external/agents/2/leads/99`, { method: "PATCH", headers: json, body: JSON.stringify({ status: "closed" }) })).status).toBe(404);
    expect((await fetch(`${base}/api/external/agents/2/leads/5`, { method: "PATCH", headers: json, body: JSON.stringify({ status: "won" }) })).status).toBe(400);
    expect((await fetch(`${base}/api/external/agents/2/leads/5`, { method: "PATCH", headers: json, body: "{}" })).status).toBe(400);
  });
});
