/**
 * The independent runtime is deliberately selected only by the external
 * PostgreSQL connection variable. This prevents a partial Supabase setup from
 * disabling the managed Neon runtime by accident.
 */
export function isIndependentRuntime(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.INDEPENDENT_DATABASE_URL?.trim());
}
