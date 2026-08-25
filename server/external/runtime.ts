import { createIndependentRequestContext, type IndependentRequestContext } from "./context";
import { getIndependentPostgresPool } from "./postgres";
import {
  createIndependentAgent,
  createIndependentKnowledgeItem,
  ensureIndependentDefaultAgent,
  getIndependentAgentInTenant,
  listIndependentKnowledgeForAgent,
  listIndependentTenantAgents,
  updateIndependentAgentProfile,
  updateIndependentAgentFromWebsiteProposal,
  type CreateIndependentAgentInput,
  type CreateIndependentKnowledgeInput,
  type UpdateIndependentAgentProfileInput,
} from "./agentRepository";
import type { IndependentWebsiteProposal } from "./websiteDiscovery";

export type IndependentRuntimeDependencies = {
  createContext: (authorization: string | undefined) => Promise<IndependentRequestContext>;
  getPool: typeof getIndependentPostgresPool;
  ensureDefaultAgent: typeof ensureIndependentDefaultAgent;
  listAgents: typeof listIndependentTenantAgents;
  listKnowledge: typeof listIndependentKnowledgeForAgent;
};

const defaultDependencies: IndependentRuntimeDependencies = {
  createContext: createIndependentRequestContext,
  getPool: getIndependentPostgresPool,
  ensureDefaultAgent: ensureIndependentDefaultAgent,
  listAgents: listIndependentTenantAgents,
  listKnowledge: listIndependentKnowledgeForAgent,
};

export type IndependentWorkspaceSession = {
  user: NonNullable<IndependentRequestContext["user"]>;
  workspace: NonNullable<IndependentRequestContext["workspace"]>;
};

export async function resolveIndependentWorkspaceSession(
  authorization: string | undefined,
  dependencies: Pick<IndependentRuntimeDependencies, "createContext"> = defaultDependencies,
): Promise<IndependentWorkspaceSession | undefined> {
  const context = await dependencies.createContext(authorization);
  if (!context.user || !context.workspace) return undefined;
  return { user: context.user, workspace: context.workspace };
}

export async function getIndependentWorkspaceAgents(
  authorization: string | undefined,
  dependencies: IndependentRuntimeDependencies = defaultDependencies,
) {
  const session = await resolveIndependentWorkspaceSession(authorization, dependencies);
  const pool = dependencies.getPool();
  if (!session || !pool) return undefined;

  const defaultAgent = await dependencies.ensureDefaultAgent(pool, session.workspace.id);
  const agents = await dependencies.listAgents(pool, session.workspace.id);
  return { ...session, defaultAgent, agents };
}

export async function getIndependentAgentKnowledge(
  authorization: string | undefined,
  agentId: number,
  dependencies: IndependentRuntimeDependencies = defaultDependencies,
) {
  const session = await resolveIndependentWorkspaceSession(authorization, dependencies);
  const pool = dependencies.getPool();
  if (!session || !pool) return undefined;

  const knowledge = await dependencies.listKnowledge(pool, session.workspace.id, agentId);
  return { ...session, knowledge };
}

export type IndependentSetupDependencies = Pick<IndependentRuntimeDependencies, "createContext"> & {
  getPool: typeof getIndependentPostgresPool;
  getAgent: typeof getIndependentAgentInTenant;
  createAgent: typeof createIndependentAgent;
  updateAgent: typeof updateIndependentAgentProfile;
  updateWebsiteProposal: typeof updateIndependentAgentFromWebsiteProposal;
  createKnowledge: typeof createIndependentKnowledgeItem;
};

const defaultSetupDependencies: IndependentSetupDependencies = {
  createContext: createIndependentRequestContext,
  getPool: getIndependentPostgresPool,
  getAgent: getIndependentAgentInTenant,
  createAgent: createIndependentAgent,
  updateAgent: updateIndependentAgentProfile,
  updateWebsiteProposal: updateIndependentAgentFromWebsiteProposal,
  createKnowledge: createIndependentKnowledgeItem,
};

export async function createIndependentWorkspaceAgent(
  authorization: string | undefined,
  input: Omit<CreateIndependentAgentInput, "tenantId">,
  dependencies: IndependentSetupDependencies = defaultSetupDependencies,
) {
  const session = await resolveIndependentWorkspaceSession(authorization, dependencies);
  const pool = dependencies.getPool();
  if (!session || !pool) return undefined;
  return dependencies.createAgent(pool, { ...input, tenantId: session.workspace.id });
}

export async function updateIndependentWorkspaceAgent(
  authorization: string | undefined,
  agentId: number,
  input: UpdateIndependentAgentProfileInput,
  dependencies: IndependentSetupDependencies = defaultSetupDependencies,
) {
  const session = await resolveIndependentWorkspaceSession(authorization, dependencies);
  const pool = dependencies.getPool();
  if (!session || !pool) return undefined;
  return dependencies.updateAgent(pool, session.workspace.id, agentId, input);
}

export async function addIndependentWorkspaceKnowledge(
  authorization: string | undefined,
  agentId: number,
  input: Omit<CreateIndependentKnowledgeInput, "tenantId" | "agentId">,
  dependencies: IndependentSetupDependencies = defaultSetupDependencies,
) {
  const session = await resolveIndependentWorkspaceSession(authorization, dependencies);
  const pool = dependencies.getPool();
  if (!session || !pool) return undefined;

  const agent = await dependencies.getAgent(pool, session.workspace.id, agentId);
  if (!agent) return null;
  return dependencies.createKnowledge(pool, { ...input, tenantId: session.workspace.id, agentId });
}

export async function applyIndependentWebsiteProposal(
  authorization: string | undefined,
  agentId: number,
  proposal: IndependentWebsiteProposal,
  dependencies: IndependentSetupDependencies = defaultSetupDependencies,
) {
  const session = await resolveIndependentWorkspaceSession(authorization, dependencies);
  const pool = dependencies.getPool();
  if (!session || !pool) return undefined;
  const existing = await dependencies.getAgent(pool, session.workspace.id, agentId);
  if (!existing) return null;

  const analysis = proposal.analysis;
  const agent = await dependencies.updateWebsiteProposal(pool, session.workspace.id, agentId, {
    name: analysis.businessName,
    description: analysis.businessSummary,
    persona: analysis.persona,
    tone: analysis.tone,
    language: analysis.language,
    status: "active",
    decisionRules: analysis.guardrails.join(" "),
    fallbackMessage: "أحتاج تفاصيل إضافية حتى أجيب بدقة، أو أقدر أحوّلك إلى فريق الشركة.",
    escalationKeyword: "موظف,موظفة,إنسان,شكوى,عاجل,human,agent",
  });
  if (!agent) return null;

  const pageTitles = new Map(proposal.pages.map((page) => [page.url, page.title]));
  const knowledge = [
    ...analysis.services.map((service) => ({ title: service.name, content: service.description, category: "Website service", sourceUrl: service.sourceUrl, sourceTitle: pageTitles.get(service.sourceUrl) ?? analysis.businessName })),
    ...analysis.faqs.map((faq) => ({ title: `FAQ: ${faq.question}`.slice(0, 160), content: faq.answer, category: "Website FAQ", sourceUrl: faq.sourceUrl, sourceTitle: pageTitles.get(faq.sourceUrl) ?? analysis.businessName })),
  ];
  if (!knowledge.length) knowledge.push({ title: "ملخص النشاط من الموقع", content: analysis.businessSummary, category: "Website summary", sourceUrl: proposal.websiteUrl, sourceTitle: analysis.businessName });
  for (const item of knowledge) await dependencies.createKnowledge(pool, { ...item, tenantId: session.workspace.id, agentId });
  return { agent, knowledgeCount: knowledge.length };
}
