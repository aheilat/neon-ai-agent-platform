import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId = 50, openId = "open-id-push-test"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId,
    email: `pushowner${userId}@example.com`,
    name: `Push Owner ${userId}`,
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

describe("Web Push Subscriptions", () => {
  it("saves browser push subscription successfully", async () => {
    const ctx = createTestContext(50, "open-id-push-test");
    const caller = appRouter.createCaller(ctx);
    await caller.workspace.overview();

    const result = await caller.notifications.subscribe({
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-123",
      keys: {
        p256dh: "test-p256dh-key",
        auth: "test-auth-key",
      },
    });
    expect(result.success).toBe(true);
  }, 15000);
});
