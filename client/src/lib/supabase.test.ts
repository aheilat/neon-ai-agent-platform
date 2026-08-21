import { describe, expect, it } from "vitest";
import { getIndependentSupabaseBrowserClient, hasIndependentSupabaseBrowserConfig } from "./supabase";

describe("independent browser Supabase client", () => {
  it("remains disabled until the independent public environment is configured", () => {
    expect(hasIndependentSupabaseBrowserConfig()).toBe(false);
    expect(getIndependentSupabaseBrowserClient()).toBeUndefined();
  });
});
