import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId = 90, openId = "open-id-sound-test"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId,
    email: `soundowner${userId}@example.com`,
    name: `Sound Owner ${userId}`,
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

describe("Sound Alerts Preferences API", () => {
  it("updates sound alerts preference successfully", async () => {
    const ctx = createTestContext(90, "open-id-sound-test");
    const caller = appRouter.createCaller(ctx);
    await caller.workspace.overview();

    const updateRes = await caller.notifications.updatePreferences({
      escalationPush: true,
      assignmentPush: true,
      leadPush: true,
      generalPush: true,
      soundAlerts: false,
    });
    expect(updateRes.success).toBe(true);

    const prefs = await caller.notifications.getPreferences();
    expect(prefs.soundAlerts).toBe(0);
  }, 15000);
});
