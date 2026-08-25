import { describe, expect, it } from "vitest";
import { getIndependentTemplate, INDEPENDENT_TEMPLATES } from "./independentTemplates";

describe("Independent ready-made templates", () => {
  it("keeps the core Arabic-first sectors available", () => {
    expect(INDEPENDENT_TEMPLATES.map((template) => template.id)).toEqual(["ecommerce", "realestate", "healthcare", "localservices"]);
    expect(INDEPENDENT_TEMPLATES.every((template) => template.knowledge.length > 0 && template.persona.length > 20)).toBe(true);
  });

  it("returns no template for an unknown client-provided identifier", () => {
    expect(getIndependentTemplate("unknown-sector")).toBeUndefined();
  });
});
