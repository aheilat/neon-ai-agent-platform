import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { ensureDefaultAgent, getOrCreateTenant, upsertUser } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 8721,
    openId: "open-id-meta-embedded-runtime",
    email: "metaembeddedruntime@example.com",
    name: "Meta Embedded Runtime Test",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => {} } as TrpcContext["res"] };
}

describe("Meta Embedded Signup runtime configuration", () => {
  it("reports the saved Meta configuration as ready through the channel API without exposing a token", async () => {
    const ctx = createTestContext();
    await upsertUser(ctx.user);
    const tenant = await getOrCreateTenant(ctx.user);
    const agent = await ensureDefaultAgent(tenant!.id);
    const caller = appRouter.createCaller(ctx);

    const config = await caller.channels.embeddedWhatsAppConfig({ agentId: agent!.id });
    expect(config.enabled).toBe(true);
    expect(config.appId).toMatch(/^\d+$/);
    expect(config.configId).toMatch(/^\d+$/);
    expect(JSON.stringify(config)).not.toContain("access_token");
  }, 15000);
});
