import { describe, expect, it } from "vitest";
import { isTemporaryLlmQuotaError, temporaryLlmQuotaResponse } from "./websiteSyncResilience";

describe("website sync resilience", () => {
  it("classifies exhausted LLM usage as a temporary deferred condition", () => {
    expect(isTemporaryLlmQuotaError(new Error('LLM invoke failed: 412 Precondition Failed – {"code":9,"message":"your account has hit a usage exhausted"}'))).toBe(true);
    expect(isTemporaryLlmQuotaError("429 rate limit exceeded")).toBe(true);
  });

  it("does not hide unrelated sync failures", () => {
    expect(isTemporaryLlmQuotaError(new Error("database connection refused"))).toBe(false);
  });

  it("returns a truthful deferred response shape", () => {
    expect(temporaryLlmQuotaResponse()).toMatchObject({
      ok: true,
      deferred: true,
      reason: "llm-unavailable",
    });
  });
});
