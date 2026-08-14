import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { upsertUser, getOrCreateTenant, addTeamMember } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId = 80, openId = "open-id-idle-test"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId,
    email: `idleowner${userId}@example.com`,
    name: `Idle Owner ${userId}`,
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

describe("Automatic Idle Timeout & Activity Ping", () => {
  it("updates idle timeout and pings user activity successfully", async () => {
    const ctx = createTestContext(80, "open-id-idle-test");
    await upsertUser(ctx.user);
    const tenant = await getOrCreateTenant(ctx.user);
    const member = await addTeamMember({ tenantId: tenant!.id, name: "Idle Agent", email: "idle@rep.com", role: "agent" });

    const caller = appRouter.createCaller(ctx);

    const timeoutRes = await caller.team.setIdleTimeout({
      memberId: member!.id,
      idleTimeoutMinutes: 30,
    });
    expect(timeoutRes.success).toBe(true);

    const pingRes = await caller.team.pingActivity();
    expect(pingRes.success).toBe(true);
  }, 15000);
});
