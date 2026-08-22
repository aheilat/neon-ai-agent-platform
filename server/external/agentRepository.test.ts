import { describe, expect, it, vi } from "vitest";
import {
  createIndependentAgent,
  ensureIndependentDefaultAgent,
  getIndependentAgentInTenant,
  listIndependentKnowledgeForAgent,
  listIndependentTenantAgents,
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
});
