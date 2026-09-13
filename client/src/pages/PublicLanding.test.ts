import { describe, expect, it } from "vitest";
import { LANDING_VERTICALS, LANDING_WORKFLOW, publicStartDestination } from "./PublicLanding";

describe("Public landing page conversion content", () => {
  it("keeps the guided self-service journey complete", () => {
    expect(LANDING_WORKFLOW.map(step => step.number)).toEqual(["01", "02", "03"]);
    expect(LANDING_WORKFLOW.map(step => step.label)).toEqual(["اربط القنوات", "علّم الوكيل", "انطلق بثقة"]);
  });

  it("presents real sector starting points without fabricated social proof", () => {
    expect(LANDING_VERTICALS.map(vertical => vertical.name)).toContain("التجارة الإلكترونية");
    expect(LANDING_VERTICALS.map(vertical => vertical.name)).toContain("الرعاية الصحية");
    expect(LANDING_VERTICALS).toHaveLength(5);
  });

  it("sends unauthenticated independent visitors to registration, and authenticated ones to their dashboard", () => {
    expect(publicStartDestination(true, false)).toBe("/register");
    expect(publicStartDestination(true, true)).toBe("/start");
    expect(publicStartDestination(false, true)).toBe("/start");
    expect(publicStartDestination(false, false)).toBeUndefined();
  });
});
