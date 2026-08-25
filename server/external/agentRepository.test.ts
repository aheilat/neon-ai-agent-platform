import { describe, expect, it, vi } from "vitest";
import {

  createIndependentKnowledgeItem,
  createIndependentHandoffLead,
  createIndependentAgent,
  ensureIndependentDefaultAgent,
  getIndependentAgentInTenant,
  listIndependentKnowledgeForAgent,
  listIndependentTenantAgents,
  updateIndependentAgentProfile,
  updateIndependentAgentHandoffContact,
} from "./agentRepository";

const createdAgent = {
  id: 31,
  tenantId: 8,
  name: "Neon Concierge",
  description: null,
  persona: null,
  tone: "friendly",
  language: "bilingual",
  llmModel: "claude-haiku-4-5",
  decisionRules: null,
  fallbackMessage: null,
  escalationKeyword: "human",
  capabilitiesJson: { enabled: ["answer"] },
  status: "active" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("independent agent repository", () => {
  it("lists agents only through a tenant-scoped parameter", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [createdAgent] });
    const result = await listIndependentTenantAgents({ query } as never, 8);

    expect(result).toEqual([createdAgent]);
    expect(query.mock.calls[0]?.[0]).toContain('where "tenantId" = $1');
    expect(query.mock.calls[0]?.[1]).toEqual([8]);
  });

  it("requires both tenant and agent ID when retrieving one agent", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [createdAgent] });
    const result = await getIndependentAgentInTenant({ query } as never, 8, 31);

    expect(result).toEqual(createdAgent);
    expect(query.mock.calls[0]?.[0]).toContain('where "tenantId" = $1 and id = $2');
    expect(query.mock.calls[0]?.[1]).toEqual([8, 31]);
  });

  it("creates an agent with JSON capabilities through bound values", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [createdAgent] });
    const result = await createIndependentAgent({ query } as never, {
      tenantId: 8,
      name: "Neon Concierge",
      description: null,
      persona: null,
      tone: "friendly",
      language: "bilingual",
      llmModel: "claude-haiku-4-5",
      decisionRules: null,
      fallbackMessage: null,
      escalationKeyword: "human",
      capabilitiesJson: { enabled: ["answer"] },
      status: "active",
    });

    expect(result).toEqual(createdAgent);
    expect(query.mock.calls[0]?.[0]).toContain('$11::jsonb');
    expect(query.mock.calls[0]?.[1]?.[10]).toBe('{"enabled":["answer"]}');
  });

  it("reuses the first agent rather than creating a second default agent", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [createdAgent] });
    const result = await ensureIndependentDefaultAgent({ query } as never, 8);

    expect(result).toEqual(createdAgent);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("scopes knowledge retrieval to both the tenant and agent", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await listIndependentKnowledgeForAgent({ query } as never, 8, 31);

    expect(query.mock.calls[0]?.[0]).toContain('where "tenantId" = $1 and "agentId" = $2');
    expect(query.mock.calls[0]?.[1]).toEqual([8, 31]);
  });

  it("updates an agent only when tenant and agent ID match", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [createdAgent] });
    await updateIndependentAgentProfile({ query } as never, 8, 31, {
      name: "Updated concierge",
      description: null,
      persona: null,
      tone: "professional",
      language: "ar",
      status: "active",
    });

    expect(query.mock.calls[0]?.[0]).toContain('where "tenantId" = $1 and id = $2');
    expect(query.mock.calls[0]?.[1]?.slice(0, 2)).toEqual([8, 31]);
  });

  it("creates knowledge through tenant and agent-bound values", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 4 }] });
    await createIndependentKnowledgeItem({ query } as never, {
      tenantId: 8,
      agentId: 31,
      title: "الخدمات",
      content: "خدمة مخصصة",
      category: "business",
      sourceUrl: "https://example.com/",
      sourceTitle: "Website",
    });

    expect(query.mock.calls[0]?.[0]).toContain('"tenantId", "agentId"');
    expect(query.mock.calls[0]?.[1]?.slice(0, 2)).toEqual([8, 31]);
  });

  it("stores a company-owned handoff contact only on the selected tenant agent", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [createdAgent] });
    await updateIndependentAgentHandoffContact({ query } as never, 8, 31, { name: "فريق المبيعات", phone: "+962700000000", email: "sales@example.com" });

    expect(query.mock.calls[0]?.[0]).toContain('where "tenantId" = $1 and id = $2');
    expect(query.mock.calls[0]?.[0]).toContain("handoffContact");
    expect(query.mock.calls[0]?.[1]).toEqual([8, 31, "فريق المبيعات", "+962700000000", "sales@example.com"]);
  });

  it("creates a human handoff lead with tenant and agent-bound values", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 19, createdAt: new Date() }] });
    await createIndependentHandoffLead({ query } as never, { tenantId: 8, agentId: 31, name: "عبدالله", phone: "+962700000000", email: null, notes: "يسأل عن الأسعار" });

    expect(query.mock.calls[0]?.[0]).toContain('insert into public.leads ("tenantId", "agentId"');
    expect(query.mock.calls[0]?.[1]).toEqual([8, 31, "عبدالله", null, "+962700000000", "يسأل عن الأسعار"]);
  });
});
