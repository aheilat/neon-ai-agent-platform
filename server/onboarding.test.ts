import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getKnowledgeForAgent, getOrCreateTenant, listChannelIntegrations, upsertUser } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId = 100, openId = "open-id-onboarding-test"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId,
    email: `onboardingowner${userId}@example.com`,
    name: `Onboarding Owner ${userId}`,
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

describe("Agent onboarding", () => {
  it("creates an agent, seeds selected knowledge, and saves selected channels", async () => {
    const ctx = createTestContext();
    await upsertUser(ctx.user);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.agents.onboard({
      language: "bilingual",
      tone: "friendly",
      goals: ["questions", "human", "leads"],
      channels: ["web", "whatsapp"],
    });

    expect(result.agent.name).toBe("موظف Neon الذكي");
    expect(result.knowledgeCount).toBe(4);
    expect(result.channelCount).toBe(2);

    const tenant = await getOrCreateTenant(ctx.user);
    const knowledge = await getKnowledgeForAgent(tenant!.id, result.agent.id);
    const channels = await listChannelIntegrations(tenant!.id, result.agent.id);
    expect(knowledge.length).toBeGreaterThanOrEqual(4);
    expect(channels.map(channel => channel.channel)).toEqual(expect.arrayContaining(["web", "whatsapp"]));
  }, 15000);
});
