import { getIndependentPostgresPool } from "./postgres";
import { getIndependentSupabaseStatus, type IndependentSupabaseStatus } from "./supabase";

export type IndependentHealthPool = {
  query: (statement: string) => Promise<unknown>;
};

export type IndependentHealthResult = {
  ok: boolean;
  runtime: "managed" | "independent";
  database: "not-checked" | "configuration-required" | "connected" | "unavailable";
  supabase: "not-checked" | "configuration-required" | "configured";
  missing: string[];
};

type IndependentHealthDependencies = {
  isIndependentRuntime?: boolean;
  getPool?: () => IndependentHealthPool | undefined;
  getSupabaseStatus?: () => IndependentSupabaseStatus;
};

function hasIndependentRuntimeConfiguration() {
  return Boolean(process.env.INDEPENDENT_DATABASE_URL);
}

/**
 * Produces a secret-free readiness response for the separately hosted Neon
 * runtime. It never falls back to DATABASE_URL, so a missing independent
 * database cannot accidentally target the managed MySQL/TiDB environment.
 */
export async function getIndependentRuntimeHealth(
  dependencies: IndependentHealthDependencies = {},
): Promise<IndependentHealthResult> {
  const isIndependentRuntime = dependencies.isIndependentRuntime ?? hasIndependentRuntimeConfiguration();
  if (!isIndependentRuntime) {
    return {
      ok: true,
      runtime: "managed",
      database: "not-checked",
      supabase: "not-checked",
      missing: [],
    };
  }

  const supabaseStatus = (dependencies.getSupabaseStatus ?? getIndependentSupabaseStatus)();
  const pool = (dependencies.getPool ?? getIndependentPostgresPool)();
  const missing = [
    ...(pool ? [] : ["INDEPENDENT_DATABASE_URL"]),
    ...supabaseStatus.missing,
  ];

  if (missing.length > 0) {
    return {
      ok: false,
      runtime: "independent",
      database: pool ? "connected" : "configuration-required",
      supabase: supabaseStatus.configured ? "configured" : "configuration-required",
      missing,
    };
  }

  try {
    await pool!.query("SELECT 1");
    return {
      ok: true,
      runtime: "independent",
      database: "connected",
      supabase: "configured",
      missing: [],
    };
  } catch {
    return {
      ok: false,
      runtime: "independent",
      database: "unavailable",
      supabase: "configured",
      missing: [],
    };
  }
}
