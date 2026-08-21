import { describe, expect, it } from "vitest";
import { getIndependentSupabaseServerClient, getIndependentSupabaseStatus } from "./supabase";

describe("independent Supabase configuration", () => {
  it("does not create a server client until the separately owned credentials exist", async () => {
    expect(getIndependentSupabaseStatus()).toEqual({
      configured: false,
      missing: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    });
    expect(getIndependentSupabaseServerClient()).toBeUndefined();
  });
});
