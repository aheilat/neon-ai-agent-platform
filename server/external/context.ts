import { getIndependentIdentity, type IndependentIdentity } from "./auth";
import { findIndependentNeonUser, type IndependentNeonUser } from "./identityRepository";
import { getIndependentPostgresPool } from "./postgres";
import { getOrCreateIndependentWorkspace, type IndependentWorkspace } from "./workspaceRepository";

export type IndependentRequestContext = {
  identity: IndependentIdentity | undefined;
  user: IndependentNeonUser | undefined;
  workspace: IndependentWorkspace | undefined;
};

type ContextDependencies = {
  getIdentity: (token: string) => Promise<IndependentIdentity | undefined>;
  getPool: () => ReturnType<typeof getIndependentPostgresPool>;
  findUser: typeof findIndependentNeonUser;
  getWorkspace: typeof getOrCreateIndependentWorkspace;
};

const defaultDependencies: ContextDependencies = {
  getIdentity: getIndependentIdentity,
  getPool: getIndependentPostgresPool,
  findUser: findIndependentNeonUser,
  getWorkspace: getOrCreateIndependentWorkspace,
};

export function getBearerToken(authorization: string | undefined) {
  if (!authorization?.startsWith("Bearer ")) return undefined;
  const token = authorization.slice("Bearer ".length).trim();
  return token || undefined;
}

/**
 * Independent Supabase context. It is intentionally not wired into the current
 * Manus tRPC context until the external deployment explicitly adopts it.
 */
export async function createIndependentRequestContext(
  authorization: string | undefined,
  dependencies: ContextDependencies = defaultDependencies,
): Promise<IndependentRequestContext> {
  const token = getBearerToken(authorization);
  if (!token) return { identity: undefined, user: undefined, workspace: undefined };

  const identity = await dependencies.getIdentity(token);
  const pool = dependencies.getPool();
  if (!identity || !pool) return { identity, user: undefined, workspace: undefined };

  const user = await dependencies.findUser(pool, identity.supabaseUserId);
  if (!user) return { identity, user: undefined, workspace: undefined };
  const workspace = await dependencies.getWorkspace(pool, user);
  return { identity, user, workspace };
}
