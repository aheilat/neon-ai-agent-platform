import { describe, expect, it } from "vitest";
import { isIndependentRuntime } from "./runtimeMode";

describe("isIndependentRuntime", () => {
  it("does not switch the managed runtime from unrelated Supabase variables", () => {
    expect(isIndependentRuntime({ SUPABASE_URL: "https://example.supabase.co" })).toBe(false);
  });

  it("switches only when the explicit independent PostgreSQL URL is present", () => {
    expect(isIndependentRuntime({ INDEPENDENT_DATABASE_URL: "postgresql://pooler.example" })).toBe(true);
  });
});
