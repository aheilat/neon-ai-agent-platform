import { describe, expect, it } from "vitest";
import { NEON_CONTACT_EMAIL } from "./contact";

describe("Neon public contact details", () => {
  it("uses the approved customer contact email", () => {
    expect(NEON_CONTACT_EMAIL).toBe("ahailat@neonadai.com");
  });
});
