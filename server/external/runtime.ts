import { createIndependentRequestContext, type IndependentRequestContext } from "./context";
import { getIndependentPostgresPool } from "./postgres";
import {
  ensureIndependentDefaultAgent,
  listIndependentKnowledgeForAgent,
  listIndependentTenantAgents,
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
