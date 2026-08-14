import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId = 60, openId = "open-id-prefs-test"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId,
    email: `prefsowner${userId}@example.com`,
    name: `Prefs Owner ${userId}`,
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

describe("Notification Preferences API", () => {
  it("gets and updates user notification preferences successfully", async () => {
    const ctx = createTestContext(60, "open-id-prefs-test");
    const caller = appRouter.createCaller(ctx);
    await caller.workspace.overview();

    const prefsBefore = await caller.notifications.getPreferences();
    expect(prefsBefore).toBeDefined();

    const updateRes = await caller.notifications.updatePreferences({
      escalationPush: true,
      assignmentPush: false,
      leadPush: true,
      generalPush: false,
    });
    expect(updateRes.success).toBe(true);

    const prefsAfter = await caller.notifications.getPreferences();
    expect(prefsAfter.escalationPush).toBe(1);
    expect(prefsAfter.assignmentPush).toBe(0);
    expect(prefsAfter.leadPush).toBe(1);
    expect(prefsAfter.generalPush).toBe(0);
  }, 15000);
});
