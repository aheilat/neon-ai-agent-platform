import { createIndependentRequestContext, type IndependentRequestContext } from "./context";
import { getIndependentPostgresPool } from "./postgres";
import {
  createIndependentAgent,
  createIndependentKnowledgeItem,
  ensureIndependentDefaultAgent,
  countIndependentTenantAgents,
  hasIndependentPaidEntitlement,
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
  listAgents?: typeof listIndependentTenantAgents;
  createAgent: typeof createIndependentAgent;
  countAgents?: typeof countIndependentTenantAgents;
  hasPaidEntitlement?: typeof hasIndependentPaidEntitlement;
  updateAgent: typeof updateIndependentAgentProfile;
  updateWebsiteProposal: typeof updateIndependentAgentFromWebsiteProposal;
  createKnowledge: typeof createIndependentKnowledgeItem;
};

const defaultSetupDependencies: IndependentSetupDependencies = {
  createContext: createIndependentRequestContext,
  getPool: getIndependentPostgresPool,
  getAgent: getIndependentAgentInTenant,
  listAgents: listIndependentTenantAgents,
  createAgent: createIndependentAgent,
  countAgents: countIndependentTenantAgents,
  hasPaidEntitlement: hasIndependentPaidEntitlement,
  updateAgent: updateIndependentAgentProfile,
  updateWebsiteProposal: updateIndependentAgentFromWebsiteProposal,
  createKnowledge: createIndependentKnowledgeItem,
};

export class IndependentPaidAgentRequiredError extends Error {
  constructor() {
    super("PAID_AGENT_REQUIRED");
    this.name = "IndependentPaidAgentRequiredError";
  }
}

export async function createIndependentWorkspaceAgent(
  authorization: string | undefined,
  input: Omit<CreateIndependentAgentInput, "tenantId">,
  dependencies: IndependentSetupDependencies = defaultSetupDependencies,
) {
  const session = await resolveIndependentWorkspaceSession(authorization, dependencies);
  const pool = dependencies.getPool();
  if (!session || !pool) return undefined;
  const agentCount = await (dependencies.countAgents ?? countIndependentTenantAgents)(pool, session.workspace.id);
  if (agentCount >= 1 && !(await (dependencies.hasPaidEntitlement ?? hasIndependentPaidEntitlement)(pool, session.workspace.id))) throw new IndependentPaidAgentRequiredError();
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
  proposal: IndependentWebsiteProposal,
  dependencies: IndependentSetupDependencies = defaultSetupDependencies,
) {
  const session = await resolveIndependentWorkspaceSession(authorization, dependencies);
  const pool = dependencies.getPool();
  if (!session || !pool) return undefined;

  const analysis = proposal.analysis;
  const existingAgents = await (dependencies.listAgents ?? listIndependentTenantAgents)(pool, session.workspace.id);
  const existingAgent = existingAgents[0];
  const agent = existingAgent
    ? await dependencies.updateWebsiteProposal(pool, session.workspace.id, existingAgent.id, {
      name: analysis.businessName,
      description: analysis.businessSummary,
      persona: analysis.persona,
      tone: analysis.tone,
      language: analysis.language,
      status: "active",
      decisionRules: analysis.guardrails.join(" "),
      fallbackMessage: "أحتاج تفاصيل إضافية حتى أجيب بدقة، أو أقدر أحوّلك إلى فريق الشركة.",
      escalationKeyword: "موظف,موظفة,إنسان,شكوى,عاجل,human,agent",
    })
    : await dependencies.createAgent(pool, {
    tenantId: session.workspace.id,
    name: analysis.businessName,
    description: analysis.businessSummary,
    persona: analysis.persona,
    tone: analysis.tone,
    language: analysis.language,
    status: "active",
    decisionRules: analysis.guardrails.join(" "),
    fallbackMessage: "أحتاج تفاصيل إضافية حتى أجيب بدقة، أو أقدر أحوّلك إلى فريق الشركة.",
    escalationKeyword: "موظف,موظفة,إنسان,شكوى,عاجل,human,agent",
    llmModel: "claude-haiku-4-5",
    capabilitiesJson: { enabled: ["answer", "qualify", "capture", "escalate"] },
  });

  const pageTitles = new Map(proposal.pages.map((page) => [page.url, page.title]));
  const knowledge = [
    ...analysis.services.map((service) => ({ title: service.name, content: service.description, category: "Website service", sourceUrl: service.sourceUrl, sourceTitle: pageTitles.get(service.sourceUrl) ?? analysis.businessName })),
    ...analysis.faqs.map((faq) => ({ title: `FAQ: ${faq.question}`.slice(0, 160), content: faq.answer, category: "Website FAQ", sourceUrl: faq.sourceUrl, sourceTitle: pageTitles.get(faq.sourceUrl) ?? analysis.businessName })),
  ];
  if (!knowledge.length) knowledge.push({ title: "ملخص النشاط من الموقع", content: analysis.businessSummary, category: "Website summary", sourceUrl: proposal.websiteUrl, sourceTitle: analysis.businessName });
  for (const item of knowledge) await dependencies.createKnowledge(pool, { ...item, tenantId: session.workspace.id, agentId: agent.id });
  return { agent, knowledgeCount: knowledge.length };
}
