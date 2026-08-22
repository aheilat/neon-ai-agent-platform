import { describe, expect, it, vi } from "vitest";
import { getIndependentRuntimeHealth } from "./health";

describe("getIndependentRuntimeHealth", () => {
  it("does not inspect external services in the managed runtime", async () => {
    const getPool = vi.fn();
    const result = await getIndependentRuntimeHealth({
      isIndependentRuntime: false,
      getPool,
    });

    expect(result).toEqual({
      ok: true,
      runtime: "managed",
      database: "not-checked",
      supabase: "not-checked",
      missing: [],
    });
    expect(getPool).not.toHaveBeenCalled();
  });

  it("reports missing independent configuration by variable name only", async () => {
    const result = await getIndependentRuntimeHealth({
      isIndependentRuntime: true,
      getPool: () => undefined,
      getSupabaseStatus: () => ({ configured: false, missing: ["SUPABASE_SERVICE_ROLE_KEY"] }),
    });

    expect(result).toEqual({
      ok: false,
      runtime: "independent",
      database: "configuration-required",
      supabase: "configuration-required",
      missing: ["INDEPENDENT_DATABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    });
  });

  it("does not claim a database connection before all required services can be checked", async () => {
    const result = await getIndependentRuntimeHealth({
      isIndependentRuntime: true,
      getPool: () => ({ query: vi.fn() }),
      getSupabaseStatus: () => ({ configured: false, missing: ["SUPABASE_URL"] }),
    });

    expect(result.database).toBe("not-checked");
    expect(result.missing).toEqual(["SUPABASE_URL"]);
  });

  it("confirms a configured independent runtime after a minimal database query", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] });
    const result = await getIndependentRuntimeHealth({
      isIndependentRuntime: true,
      getPool: () => ({ query }),
      getSupabaseStatus: () => ({ configured: true, missing: [] }),
    });

    expect(result).toEqual({
      ok: true,
      runtime: "independent",
      database: "connected",
      supabase: "configured",
      missing: [],
    });
    expect(query).toHaveBeenCalledWith("SELECT 1");
  });

  it("does not expose a database exception in an unhealthy response", async () => {
    const result = await getIndependentRuntimeHealth({
      isIndependentRuntime: true,
      getPool: () => ({ query: vi.fn().mockRejectedValue(new Error("database password leaked")) }),
      getSupabaseStatus: () => ({ configured: true, missing: [] }),
    });

    expect(result).toEqual({
      ok: false,
      runtime: "independent",
      database: "unavailable",
      supabase: "configured",
      missing: [],
    });
    expect(JSON.stringify(result)).not.toContain("password");
  });
});
