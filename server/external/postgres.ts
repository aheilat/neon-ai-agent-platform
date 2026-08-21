import { Pool, type PoolConfig } from "pg";

let independentPool: Pool | undefined;

function independentDatabaseUrl() {
  return process.env.INDEPENDENT_DATABASE_URL ?? "";
}

/**
 * Opens the independently-owned pooled Supabase connection only when the
 * external deployment explicitly provides INDEPENDENT_DATABASE_URL. The
 * managed DATABASE_URL remains reserved for the current MySQL/TiDB runtime.
 */
export function getIndependentPostgresPool(): Pool | undefined {
  const connectionString = independentDatabaseUrl();
  if (!connectionString) return undefined;
  if (!independentPool) {
    const config: PoolConfig = {
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
    };
    independentPool = new Pool(config);
  }
  return independentPool;
}

export async function closeIndependentPostgresPool() {
  await independentPool?.end();
  independentPool = undefined;
}
