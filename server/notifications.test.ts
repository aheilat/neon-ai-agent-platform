import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId = 40, openId = "open-id-notif-test"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId,
    email: `notifowner${userId}@example.com`,
    name: `Notif Owner ${userId}`,
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

describe("Workspace Notifications & Escalations", () => {
  it("lists, marks read, and marks all notifications read successfully", async () => {
    const ctx = createTestContext(40, "open-id-notif-test");
    const caller = appRouter.createCaller(ctx);
    await caller.workspace.overview();

    const notifsBefore = await caller.notifications.list();
    expect(notifsBefore).toBeDefined();

    const markAllRes = await caller.notifications.markAllRead();
    expect(markAllRes.success).toBe(true);

    const notifsAfter = await caller.notifications.list();
    const unread = notifsAfter.filter(n => n.isRead === 0);
    expect(unread.length).toBe(0);
  }, 15000);
});
