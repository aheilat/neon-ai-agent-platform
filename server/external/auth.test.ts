import { describe, expect, it } from "vitest";
import { getIndependentIdentity, toIndependentIdentity } from "./auth";

describe("independent Supabase authentication adapter", () => {
  it("maps a verified Supabase identity to the minimum Neon identity shape", () => {
    expect(toIndependentIdentity({
      id: "9ef5274b-3952-479f-b553-20c29d72d6bc",
      app_metadata: {},
      user_metadata: { full_name: "Neon Owner" },
      aud: "authenticated",
      created_at: "2026-08-21T00:00:00.000Z",
      email: "owner@neonadai.com",
    } as any)).toEqual({
      supabaseUserId: "9ef5274b-3952-479f-b553-20c29d72d6bc",
      email: "owner@neonadai.com",
      name: "Neon Owner",
    });
  });

  it("fails closed while independent Supabase credentials are absent", async () => {
    await expect(getIndependentIdentity("untrusted-token")).resolves.toBeUndefined();
  });
});
