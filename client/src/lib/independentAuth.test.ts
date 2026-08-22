import { describe, expect, it } from "vitest";
import { getIndependentEmailRedirectUrl } from "./independentAuth";

describe("independent authentication", () => {
  it("keeps the confirmation redirect on the exact independently hosted origin", () => {
    expect(getIndependentEmailRedirectUrl("https://neon-ai-staging.onrender.com")).toBe(
      "https://neon-ai-staging.onrender.com/external",
    );
  });
});
