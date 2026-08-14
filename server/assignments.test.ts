import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { upsertUser, getOrCreateTenant, ensureDefaultAgent, addTeamMember } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId = 30, openId = "open-id-assignment-test"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId,
    email: `assignowner${userId}@example.com`,
    name: `Assign Owner ${userId}`,
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

describe("Team Member Agent & Channel Assignments", () => {
  it("assigns and unassigns agents and channels to team members successfully", async () => {
    const ctx = createTestContext(30, "open-id-assignment-test");
    await upsertUser(ctx.user);
    const tenant = await getOrCreateTenant(ctx.user);
    await ensureDefaultAgent(tenant!.id);
    await addTeamMember({ tenantId: tenant!.id, name: "Assigned Agent", email: "assigned@rep.com", role: "agent" });

    const caller = appRouter.createCaller(ctx);
    const team = await caller.team.list();
    const ownerMember = team.members.find(m => m.email === "assigned@rep.com");
    expect(ownerMember).toBeDefined();

    const setRes = await caller.team.setAssignment({
      memberId: ownerMember!.id,
      targetType: "channel",
      targetId: "whatsapp",
      assign: true,
    });
    expect(setRes.success).toBe(true);

    const teamAfter = await caller.team.list();
    const assignment = teamAfter.assignments.find(
      a => a.memberId === ownerMember!.id && a.targetType === "channel" && a.targetId === "whatsapp"
    );
    expect(assignment).toBeDefined();

    const removeRes = await caller.team.setAssignment({
      memberId: ownerMember!.id,
      targetType: "channel",
      targetId: "whatsapp",
      assign: false,
    });
    expect(removeRes.success).toBe(true);
  }, 15000);
});
