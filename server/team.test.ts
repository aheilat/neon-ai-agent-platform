import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId = 20, openId = "open-id-team-test"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId,
    email: `teamowner${userId}@example.com`,
    name: `Team Owner ${userId}`,
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

describe("Team Management & Customer Service Roles", () => {
  it("lists team members and creates team invites successfully", async () => {
    const ctx = createTestContext(20, "open-id-team-test");
    const caller = appRouter.createCaller(ctx);

    const teamBefore = await caller.team.list();
    expect(teamBefore.members).toBeDefined();

    const inviteResult = await caller.team.invite({ email: "agent@support.com", role: "agent" });
    expect(inviteResult.success).toBe(true);
    expect(inviteResult.invite?.email).toBe("agent@support.com");

    const teamAfter = await caller.team.list();
    const added = teamAfter.members.find(m => m.email === "agent@support.com");
    expect(added).toBeDefined();
    expect(added?.role).toBe("agent");
  }, 15000);
});
