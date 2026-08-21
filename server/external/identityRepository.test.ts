import { describe, expect, it, vi } from "vitest";
import { findIndependentNeonUser } from "./identityRepository";

describe("independent Neon identity repository", () => {
  it("queries by Supabase identity using a parameterized lookup", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{
        id: 7,
        openId: "9ef5274b-3952-479f-b553-20c29d72d6bc",
        supabaseUserId: "9ef5274b-3952-479f-b553-20c29d72d6bc",
        email: "owner@neonadai.com",
        name: "Neon Owner",
        role: "admin",
      }],
    });

    const user = await findIndependentNeonUser({ query } as never, "9ef5274b-3952-479f-b553-20c29d72d6bc");

    expect(query).toHaveBeenCalledWith(expect.stringContaining('"supabaseUserId" = $1'), ["9ef5274b-3952-479f-b553-20c29d72d6bc"]);
    expect(user?.role).toBe("admin");
  });
});
