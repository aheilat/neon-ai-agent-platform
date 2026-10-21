import type { Server } from "node:http";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), pool: vi.fn(), getPublicAgent: vi.fn(), createConversation: vi.fn(), addMessage: vi.fn(async () => undefined), reply: vi.fn(), save: vi.fn(), route: vi.fn() }));
vi.mock("./runtime", () => ({ resolveIndependentWorkspaceSession: mocks.session }));
vi.mock("./postgres", () => ({ getIndependentPostgresPool: mocks.pool }));
vi.mock("./agentRepository", () => ({
  addIndependentConversationMessage: mocks.addMessage,
  createIndependentConversation: mocks.createConversation,
  createIndependentPublicConversationSessionToken: vi.fn(() => "s".repeat(43)),
  getIndependentPublicActiveAgent: mocks.getPublicAgent,
  getIndependentPublicConversationForAgent: vi.fn(),
  hashIndependentPublicConversationSessionToken: vi.fn(() => "hashed"),
}));
vi.mock("./websiteDiscovery", () => ({ assertIndependentAnalysisSources: vi.fn(), discoverIndependentWebsiteProposal: vi.fn(), independentWebsiteAnalysisSchema: { parse: vi.fn() } }));
vi.mock("./chat", () => ({ generateIndependentAgentReply: vi.fn(), generateIndependentAgentReplyForTenant: mocks.reply }));
vi.mock("./claude", () => ({ completeWithIndependentClaude: vi.fn(), extractKnowledgeFromIndependentImage: vi.fn() }));
vi.mock("./supabase", () => ({ getIndependentSupabaseServerClient: vi.fn() }));
vi.mock("./leadCapture", () => ({ captureLeadFromWidgetMessage: vi.fn(async () => undefined) }));
vi.mock("./router", async importActual => ({ ...(await importActual<typeof import("./router")>()), saveRoutingConfig: mocks.save, routeIndependentConversation: mocks.route }));

import { registerIndependentRuntimeRoutes } from "./routes";

describe("routing routes", () => {
  let server: Server;
  let base = "";
  const json = { authorization: "Bearer t", "content-type": "application/json" };
  const agent = { id: 2, tenantId: 7, name: "Neon", language: "ar", capabilitiesJson: null };

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ workspace: { id: 7 } });
    mocks.pool.mockReturnValue({});
    mocks.getPublicAgent.mockResolvedValue(agent);
    mocks.createConversation.mockResolvedValue({ id: 31, status: "active" });
    mocks.route.mockResolvedValue({ agentId: 2, switched: false });
    mocks.reply.mockResolvedValue({ kind: "success", reply: "رد", agentId: 2 });
    const app = express();
    app.use(express.json());
    registerIndependentRuntimeRoutes(app);
    server = await new Promise<Server>(resolve => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterEach(() => new Promise<void>(resolve => server.close(() => resolve())));

  const put = (body: unknown) => fetch(`${base}/api/external/agents/2/routing`, { method: "PUT", headers: json, body: JSON.stringify(body) });
  const chat = (message: string) => fetch(`${base}/api/public/agents/2/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message }) });

  it("requires authentication and saves the routing table for the workspace", async () => {
    mocks.session.mockResolvedValueOnce(null);
    expect((await put({ specialists: [] })).status).toBe(401);
    mocks.save.mockResolvedValue({ ok: true, specialists: [{ role: "sales", agentId: 11 }] });
    const response = await put({ specialists: [{ role: "sales", agentId: 11 }] });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ routing: { specialists: [{ role: "sales", agentId: 11 }] } });
    expect(mocks.save).toHaveBeenCalledWith({}, 7, 2, [{ role: "sales", agentId: 11 }]);
  });

  it("passes validation failures back", async () => {
    mocks.save.mockResolvedValue({ ok: false, status: 400, error: "غير صالح" });
    const response = await put({ specialists: [{ role: "x", agentId: 1 }] });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "غير صالح" });
  });

  it("widget chat answers with the agent the router picked", async () => {
    mocks.route.mockResolvedValue({ agentId: 11, switched: true });
    const response = await chat("كم سعر الباقة؟");
    expect(response.status).toBe(200);
    expect(mocks.reply).toHaveBeenCalledWith(7, expect.objectContaining({ agentId: 11 }));
  });

  it("widget chat falls back to the reception agent when the specialist is unavailable", async () => {
    mocks.route.mockResolvedValue({ agentId: 11, switched: true });
    mocks.reply.mockResolvedValueOnce({ kind: "not-found" }).mockResolvedValueOnce({ kind: "success", reply: "رد الاستقبال", agentId: 2 });
    const response = await chat("كم سعر الباقة؟");
    expect((await response.json()).reply).toBe("رد الاستقبال");
    expect(mocks.reply).toHaveBeenNthCalledWith(2, 7, expect.objectContaining({ agentId: 2 }));
  });

  it("widget chat never routes a request for a human", async () => {
    const response = await chat("اريد التحدث مع موظف");
    expect((await response.json()).handoffSuggested).toBe(true);
    expect(mocks.route).not.toHaveBeenCalled();
  });
});
