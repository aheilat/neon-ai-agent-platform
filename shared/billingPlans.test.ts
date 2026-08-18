import { describe, expect, it } from "vitest";
import { BILLING_PLANS, TRIAL_DAYS, getPlanPrice, getSubscriptionPeriodEnd } from "./billingPlans";

describe("Neon billing plans", () => {
  it("exposes three paid plans with an annual option lower than twelve monthly payments", () => {
    expect(BILLING_PLANS).toHaveLength(3);
    for (const plan of BILLING_PLANS) {
      expect(plan.yearlyPrice).toBeLessThan(plan.monthlyPrice * 12);
    }
  });

  it("returns the published Growth price for the selected billing cycle", () => {
    expect(getPlanPrice("professional", "monthly")).toBe(299);
    expect(getPlanPrice("professional", "yearly")).toBe(2870);
  });

  it("creates a fourteen-day end date for the no-card trial", () => {
    const start = new Date("2026-08-19T00:00:00.000Z");
    const end = getSubscriptionPeriodEnd(start, "trial");

    expect(TRIAL_DAYS).toBe(14);
    expect(end.toISOString()).toBe("2026-09-02T00:00:00.000Z");
  });

  it("creates a full year for a yearly subscription", () => {
    const start = new Date("2026-08-19T00:00:00.000Z");
    expect(getSubscriptionPeriodEnd(start, "yearly").toISOString()).toBe("2027-08-19T00:00:00.000Z");
  });
});
