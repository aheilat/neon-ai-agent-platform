import type { Server } from "node:http";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), pool: vi.fn(), send: vi.fn(), reactivate: vi.fn() }));
vi.mock("./runtime", () => ({ resolveIndependentWorkspaceSession: mocks.session }));
vi.mock("./postgres", () => ({ getIndependentPostgresPool: mocks.pool }));
vi.mock("./agentRepository", () => ({ getIndependentAgentInTenant: vi.fn() }));
vi.mock("./websiteDiscovery", () => ({ assertIndependentAnalysisSources: vi.fn(), discoverIndependentWebsiteProposal: vi.fn(), independentWebsiteAnalysisSchema: { parse: vi.fn() } }));
vi.mock("./chat", () => ({ generateIndependentAgentReplyForTenant: vi.fn() }));
vi.mock("./claude", () => ({ completeWithIndependentClaude: vi.fn(), extractKnowledgeFromIndependentImage: vi.fn() }));
vi.mock("./supabase", () => ({ getIndependentSupabaseServerClient: vi.fn() }));
vi.mock("./humanReply", async importActual => ({ ...(await importActual<typeof import("./humanReply")>()), sendIndependentHumanReply: mocks.send, reactivateIndependentConversation: mocks.reactivate }));

import { registerIndependentRuntimeRoutes } from "./routes";

describe("human reply routes", () => {
  let server: Server;
  let base = "";
  const json = { authorization: "Bearer t", "content-type": "application/json" };
  const post = (path: string, body: unknown) => fetch(`${base}/api/external/agents/2/conversations/85/${path}`, { method: "POST", headers: json, body: JSON.stringify(body) });

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ workspace: { id: 7 } });
    mocks.pool.mockReturnValue({});
    const app = express();
    app.use(express.json());
    registerIndependentRuntimeRoutes(app);
    server = await new Promise<Server>(resolve => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterEach(() => new Promise<void>(resolve => server.close(() => resolve())));

  it("requires authentication", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await post("reply", { message: "hi" })).status).toBe(401);
    expect((await post("reactivate", {})).status).toBe(401);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("validates the reply text", async () => {
    expect((await post("reply", {})).status).toBe(400);
    expect((await post("reply", { message: "   " })).status).toBe(400);
    expect((await post("reply", { message: "م".repeat(1_001) })).status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("sends the reply scoped to the workspace and trims it", async () => {
    mocks.send.mockResolvedValue({ ok: true, status: "escalated", sentAt: "2026-10-20T12:00:00.000Z" });
    const response = await post("reply", { message: "  أهلاً  " });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ conversation: { id: 85, status: "escalated" } });
    expect(mocks.send).toHaveBeenCalledWith({}, { tenantId: 7, agentId: 2, conversationId: 85, message: "أهلاً" });
  });

  it("passes the failure status and reason through", async () => {
    mocks.send.mockResolvedValue({ ok: false, status: 409, code: "window_closed", error: "مرّت أكثر من 24 ساعة" });
    const response = await post("reply", { message: "hi" });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "window_closed" });
  });

  it("hands a conversation back to the agent, or says it was not escalated", async () => {
    mocks.reactivate.mockResolvedValueOnce({ id: 85, status: "active" });
    const ok = await post("reactivate", {});
    expect(ok.status).toBe(200);
    expect(mocks.reactivate).toHaveBeenCalledWith({}, 7, 2, 85);
    mocks.reactivate.mockResolvedValueOnce(undefined);
    expect((await post("reactivate", {})).status).toBe(409);
  });
});
