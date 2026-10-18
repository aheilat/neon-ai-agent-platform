import type { Server } from "node:http";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pool: vi.fn(),
  getPublicAgent: vi.fn(),
  getPublicConversation: vi.fn(),
  createConversation: vi.fn(),
  addMessage: vi.fn(async () => undefined),
  reply: vi.fn(),
  captureLead: vi.fn(async () => undefined),
}));
vi.mock("./runtime", () => ({ resolveIndependentWorkspaceSession: vi.fn() }));
vi.mock("./postgres", () => ({ getIndependentPostgresPool: mocks.pool }));
vi.mock("./agentRepository", () => ({
  addIndependentConversationMessage: mocks.addMessage,
  createIndependentConversation: mocks.createConversation,
  createIndependentPublicConversationSessionToken: vi.fn(() => "s".repeat(43)),
  getIndependentPublicActiveAgent: mocks.getPublicAgent,
  getIndependentPublicConversationForAgent: mocks.getPublicConversation,
  hashIndependentPublicConversationSessionToken: vi.fn(() => "hashed"),
}));
vi.mock("./websiteDiscovery", () => ({ assertIndependentAnalysisSources: vi.fn(), discoverIndependentWebsiteProposal: vi.fn(), independentWebsiteAnalysisSchema: { parse: vi.fn() } }));
vi.mock("./chat", () => ({ generateIndependentAgentReply: vi.fn(), generateIndependentAgentReplyForTenant: mocks.reply }));
vi.mock("./claude", () => ({ completeWithIndependentClaude: vi.fn(), extractKnowledgeFromIndependentImage: vi.fn() }));
vi.mock("./supabase", () => ({ getIndependentSupabaseServerClient: vi.fn() }));
vi.mock("./leadCapture", () => ({ captureLeadFromWidgetMessage: mocks.captureLead }));

import { registerIndependentRuntimeRoutes } from "./routes";

describe("widget chat — escalation requests", () => {
  let server: Server;
  let base = "";
  const json = { "content-type": "application/json" };
  const agent = { id: 2, tenantId: 7, name: "Neon", language: "ar", capabilitiesJson: null };

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.pool.mockReturnValue({});
    mocks.getPublicAgent.mockResolvedValue(agent);
    mocks.createConversation.mockResolvedValue({ id: 31, status: "active" });
    mocks.reply.mockResolvedValue({ kind: "success", reply: "رد الذكاء الاصطناعي" });
    const app = express();
    app.use(express.json());
    registerIndependentRuntimeRoutes(app);
    server = await new Promise<Server>(resolve => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterEach(() => new Promise<void>(resolve => server.close(() => resolve())));

  const chat = (message: string) => fetch(`${base}/api/public/agents/2/chat`, { method: "POST", headers: json, body: JSON.stringify({ message }) });

  it("asks the visitor to open the consent-based handoff form instead of calling the AI", async () => {
    const response = await chat("أريد التحدث مع موظف");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ handoffSuggested: true, conversation: { id: 31, status: "active" } });
    expect(body.reply).toContain("النموذج");
    expect(mocks.reply).not.toHaveBeenCalled();
    expect(mocks.addMessage).toHaveBeenCalledWith({}, 31, "customer", "أريد التحدث مع موظف");
    expect(mocks.addMessage).toHaveBeenCalledWith({}, 31, "agent", body.reply);
  });

  it("still captures contact details shared in the same message", async () => {
    await chat("بدي احكي مع موظف، رقمي 0791234567");
    expect(mocks.captureLead).toHaveBeenCalledWith({}, expect.objectContaining({ conversationId: 31, message: "بدي احكي مع موظف، رقمي 0791234567" }));
  });

  it("answers an ordinary question with the AI and does not suggest a handoff", async () => {
    const response = await chat("ما هي خدمات Neon AI Agents؟");
    const body = await response.json();
    expect(body.reply).toBe("رد الذكاء الاصطناعي");
    expect(body.handoffSuggested).toBeUndefined();
    expect(mocks.reply).toHaveBeenCalledTimes(1);
  });
});
