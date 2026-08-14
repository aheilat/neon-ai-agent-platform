import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { upsertUser, getOrCreateTenant, addTeamMember } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId = 70, openId = "open-id-avail-test"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId,
    email: `availowner${userId}@example.com`,
    name: `Avail Owner ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("Team Member Availability API", () => {
  it("updates member availability status successfully", async () => {
    const ctx = createTestContext(70, "open-id-avail-test");
    await upsertUser(ctx.user);
    const tenant = await getOrCreateTenant(ctx.user);
    await addTeamMember({ tenantId: tenant!.id, name: "Avail Agent", email: "avail@rep.com", role: "agent" });

    const caller = appRouter.createCaller(ctx);
    const team = await caller.team.list();
    const ownerMember = team.members.find(m => m.email === "avail@rep.com");
    expect(ownerMember).toBeDefined();

    const res = await caller.team.setAvailability({
      memberId: ownerMember!.id,
      availability: "busy",
    });
    expect(res.success).toBe(true);

    const teamAfter = await caller.team.list();
    const updated = teamAfter.members.find(m => m.id === ownerMember!.id);
    expect(updated?.availability).toBe("busy");
  }, 15000);
});
