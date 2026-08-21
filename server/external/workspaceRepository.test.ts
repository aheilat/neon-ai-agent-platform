import { describe, expect, it, vi } from "vitest";
import { getOrCreateIndependentWorkspace } from "./workspaceRepository";

const owner = {
  id: 7,
  openId: "9ef5274b-3952-479f-b553-20c29d72d6bc",
  supabaseUserId: "9ef5274b-3952-479f-b553-20c29d72d6bc",
  email: "owner@neonadai.com",
  name: "Neon Owner",
  role: "admin" as const,
};

describe("independent workspace repository", () => {
  it("returns the workspace owned by the verified user", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ id: 12, ownerId: 7, name: "Neon Owner Workspace", slug: "neon-owner-7" }] });
    const workspace = await getOrCreateIndependentWorkspace({ query } as never, owner);

    expect(workspace.id).toBe(12);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('"ownerId" = $1'), [7]);
  });

  it("creates a scoped workspace when none exists", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 12, ownerId: 7, name: "Neon Owner Workspace", slug: "neon-owner-7" }] });
    const workspace = await getOrCreateIndependentWorkspace({ query } as never, owner);

    expect(workspace.slug).toBe("neon-owner-7");
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining("insert into public.tenants"), [7, "Neon Owner Workspace", "neon-owner-7"]);
  });
});
