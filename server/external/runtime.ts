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
  type CreateIndependentAgentInput,
  type CreateIndependentKnowledgeInput,
  type UpdateIndependentAgentProfileInput,
} from "./agentRepository";

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
  createKnowledge: typeof createIndependentKnowledgeItem;
};

const defaultSetupDependencies: IndependentSetupDependencies = {
  createContext: createIndependentRequestContext,
  getPool: getIndependentPostgresPool,
  getAgent: getIndependentAgentInTenant,
  createAgent: createIndependentAgent,
  updateAgent: updateIndependentAgentProfile,
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
