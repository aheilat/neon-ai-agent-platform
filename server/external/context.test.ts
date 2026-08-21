import { describe, expect, it, vi } from "vitest";
import { createIndependentRequestContext, getBearerToken } from "./context";

describe("independent Supabase request context", () => {
  it("parses only a valid Bearer token", () => {
    expect(getBearerToken("Bearer token-123")).toBe("token-123");
    expect(getBearerToken("Basic token-123")).toBeUndefined();
    expect(getBearerToken(undefined)).toBeUndefined();
  });

  it("resolves an independent identity, user, and workspace", async () => {
    const pool = { query: vi.fn() } as never;
    const context = await createIndependentRequestContext("Bearer token-123", {
      getIdentity: vi.fn().mockResolvedValue({ supabaseUserId: "supabase-user", email: "owner@neonadai.com", name: "Neon Owner" }),
      getPool: vi.fn().mockReturnValue(pool),
      findUser: vi.fn().mockResolvedValue({ id: 7, openId: "supabase-user", supabaseUserId: "supabase-user", email: "owner@neonadai.com", name: "Neon Owner", role: "admin" }),
      getWorkspace: vi.fn().mockResolvedValue({ id: 12, ownerId: 7, name: "Neon Owner Workspace", slug: "neon-owner-7" }),
    });

    expect(context.user?.id).toBe(7);
    expect(context.workspace?.id).toBe(12);
  });

  it("does not query PostgreSQL when the token is absent", async () => {
    const getIdentity = vi.fn();
    const context = await createIndependentRequestContext(undefined, {
      getIdentity,
      getPool: vi.fn(),
      findUser: vi.fn(),
      getWorkspace: vi.fn(),
    } as never);

    expect(context.user).toBeUndefined();
    expect(getIdentity).not.toHaveBeenCalled();
  });
});
