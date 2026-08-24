import { describe, expect, it } from "vitest";
import { independentPlanRequestUrl } from "./Pricing";

describe("independent pricing requests", () => {
  it("creates a prefilled Neon service-enquiry email instead of pretending checkout is live", () => {
    const requestUrl = independentPlanRequestUrl("growth", "yearly");
    const parsed = new URL(requestUrl);

    expect(parsed.protocol).toBe("mailto:");
    expect(parsed.pathname).toBe("ahailat@neonadai.com");
    expect(parsed.searchParams.get("subject")).toContain("growth");
    expect(parsed.searchParams.get("body")).toContain("الدفع سنوي");
  });
});
