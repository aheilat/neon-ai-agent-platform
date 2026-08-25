import express from "express";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  discoverWebsite: vi.fn(),
  getAgentInTenant: vi.fn(),
  listHandoffLeads: vi.fn(),
  getConversationInTenant: vi.fn(),
  listConversationMessages: vi.fn(),
  listConversations: vi.fn(),
  getPublicAgent: vi.fn(),
  getPublicConversation: vi.fn(),
  closeConversation: vi.fn(),
  addConversationMessage: vi.fn(),
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
vi.mock("./agentRepository", () => ({ addIndependentConversationMessage: mocks.addConversationMessage, createIndependentConversation: vi.fn(), createIndependentHandoffLead: vi.fn(), createIndependentPublicConversationSessionToken: vi.fn(() => "x".repeat(43)), getIndependentAgentInTenant: mocks.getAgentInTenant, getIndependentConversationInTenant: mocks.getConversationInTenant, getIndependentPublicActiveAgent: mocks.getPublicAgent, getIndependentPublicConversationForAgent: mocks.getPublicConversation, hashIndependentPublicConversationSessionToken: vi.fn(() => "hashed-session"), listIndependentConversationMessages: mocks.listConversationMessages, listIndependentConversationsForAgent: mocks.listConversations, listIndependentHandoffLeadsForAgent: mocks.listHandoffLeads, listIndependentKnowledgeForAgent: vi.fn(), updateIndependentAgentHandoffContact: vi.fn(), updateIndependentConversationStatus: mocks.closeConversation }));
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

  it("lists and reads conversation messages only through the authenticated tenant and selected agent", async () => {
    const pool = {};
    const conversation = { id: 31, tenantId: 44, agentId: 7, channel: "web", customerName: null, customerEmail: null, customerPhone: null, status: "active", createdAt: new Date(), updatedAt: new Date() };
    mocks.resolveSession.mockResolvedValue({ workspace: { id: 44 } });
    mocks.getPostgresPool.mockReturnValue(pool);
    mocks.getAgentInTenant.mockResolvedValue({ id: 7, tenantId: 44 });
    mocks.listConversations.mockResolvedValue([{ ...conversation, agentName: "وكيل الشركة", lastMessageContent: "أهلاً", lastMessageSender: "agent", lastMessageCreatedAt: new Date(), leadId: null, leadStatus: null }]);
    mocks.getConversationInTenant.mockResolvedValue(conversation);
    mocks.listConversationMessages.mockResolvedValue([{ id: 71, conversationId: 31, sender: "customer", content: "مرحبا", createdAt: new Date() }]);
    const app = express();
    app.use(express.json());
    registerIndependentRuntimeRoutes(app);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected a TCP test server");
      const listResponse = await fetch(`http://127.0.0.1:${address.port}/api/external/agents/7/conversations`, { headers: { Authorization: "Bearer workspace-token" } });
      const detailResponse = await fetch(`http://127.0.0.1:${address.port}/api/external/agents/7/conversations/31`, { headers: { Authorization: "Bearer workspace-token" } });

      expect(listResponse.status).toBe(200);
      await expect(listResponse.json()).resolves.toMatchObject({ conversations: [{ id: 31, tenantId: 44, agentId: 7 }] });
      expect(detailResponse.status).toBe(200);
      await expect(detailResponse.json()).resolves.toMatchObject({ conversation: { id: 31, tenantId: 44, agentId: 7 }, messages: [{ conversationId: 31 }] });
      expect(mocks.listConversations).toHaveBeenCalledWith(pool, 44, 7);
      expect(mocks.getConversationInTenant).toHaveBeenCalledWith(pool, 44, 7, 31);
      expect(mocks.listConversationMessages).toHaveBeenCalledWith(pool, 44, 7, 31);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("closes a public Widget conversation only when its opaque session belongs to the active agent tenant", async () => {
    const pool = {};
    const conversation = { id: 31, tenantId: 44, agentId: 7, channel: "widget", customerName: null, customerEmail: null, customerPhone: null, status: "active", publicSessionTokenHash: "hashed-session", createdAt: new Date(), updatedAt: new Date() };
    mocks.getPostgresPool.mockReturnValue(pool);
    mocks.getPublicAgent.mockResolvedValue({ id: 7, tenantId: 44, status: "active" });
    mocks.getPublicConversation.mockResolvedValue(conversation);
    mocks.closeConversation.mockResolvedValue({ ...conversation, status: "resolved" });
    const app = express();
    app.use(express.json());
    registerIndependentRuntimeRoutes(app);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected a TCP test server");
      const response = await fetch(`http://127.0.0.1:${address.port}/api/public/agents/7/conversations/31/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationSessionToken: "x".repeat(43) }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ conversation: { id: 31, status: "resolved" } });
      expect(mocks.getPublicConversation).toHaveBeenCalledWith(pool, 44, 7, 31, "x".repeat(43));
      expect(mocks.closeConversation).toHaveBeenCalledWith(pool, 44, 7, 31, "resolved");
      expect(mocks.addConversationMessage).toHaveBeenCalledWith(pool, 31, "system", "أنهى العميل المحادثة من الـWidget.");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("limits repeated public Widget close actions by visitor and agent", async () => {
    const pool = {};
    const conversation = { id: 32, tenantId: 44, agentId: 7, channel: "widget", customerName: null, customerEmail: null, customerPhone: null, status: "active", publicSessionTokenHash: "hashed-session", createdAt: new Date(), updatedAt: new Date() };
    mocks.getPostgresPool.mockReturnValue(pool);
    mocks.getPublicAgent.mockResolvedValue({ id: 7, tenantId: 44, status: "active" });
    mocks.getPublicConversation.mockResolvedValue(conversation);
    mocks.closeConversation.mockResolvedValue({ ...conversation, status: "resolved" });
    const app = express();
    app.use(express.json());
    registerIndependentRuntimeRoutes(app);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected a TCP test server");
      const makeRequest = () => fetch(`http://127.0.0.1:${address.port}/api/public/agents/7/conversations/32/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.44" },
        body: JSON.stringify({ conversationSessionToken: "x".repeat(43) }),
      });
      const responses = await Promise.all([makeRequest(), makeRequest(), makeRequest(), makeRequest()]);

      expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 429]);
      expect(responses[3]?.headers.get("retry-after")).toBeTruthy();
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
