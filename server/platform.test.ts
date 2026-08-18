import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { users } from "../drizzle/schema";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId = 1, openId = "test-open-id"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
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

describe("Neon AI Agent Platform Server Routers", () => {
  it("initializes workspace and default agent successfully", async () => {
    const ctx = createTestContext(10, "open-id-10");
    const caller = appRouter.createCaller(ctx);
    const overview = await caller.workspace.overview();

    expect(overview.tenant).toBeDefined();
    expect(overview.defaultAgent).toBeDefined();
    expect(overview.defaultAgent?.name).toBe("Neon Concierge");
  }, 15000);


  it("supports creating and updating custom agents within workspace", async () => {
    const ctx = createTestContext(11, "open-id-11");
    const caller = appRouter.createCaller(ctx);

    const newAgent = await caller.agents.create({
      name: "Sales Bot",
      description: "Handles outbound leads",
      persona: "Professional salesperson",
      tone: "professional",
      language: "ar",
      decisionRules: "Qualify lead and get phone number",
      fallbackMessage: "Transferring to human",
      escalationKeyword: "موظف",
      status: "active",
    });

    expect(newAgent?.name).toBe("Sales Bot");

    const updated = await caller.agents.update({
      id: newAgent!.id,
      patch: { name: "Sales Pro Bot" },
    });

    expect(updated?.name).toBe("Sales Pro Bot");
  });

  it("persists the selected capability pack on the tenant-owned agent", async () => {
    const ctx = createTestContext(12, "open-id-12");
    const caller = appRouter.createCaller(ctx);
    const agent = await caller.agents.create({
      name: "Qualified Sales Agent",
      description: "Captures qualified leads",
      persona: "Professional",
      tone: "professional",
      language: "bilingual",
      decisionRules: "Ask one qualifying question.",
      fallbackMessage: "A human will follow up.",
      escalationKeyword: "human,موظف",
      capabilities: ["answer", "qualify", "capture"],
      status: "active",
    });

    expect((agent?.capabilitiesJson as { enabled?: string[] } | undefined)?.enabled).toEqual(["answer", "qualify", "capture"]);

    const updated = await caller.agents.update({
      id: agent!.id,
      patch: { capabilities: ["answer", "escalate"] },
    });
    expect((updated?.capabilitiesJson as { enabled?: string[] } | undefined)?.enabled).toEqual(["answer", "escalate"]);

    const quality = await caller.agents.quality({ agentId: agent!.id });
    expect(quality.totalConversations).toBeGreaterThanOrEqual(0);
    expect(quality.knowledgeItemCount).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(quality.knowledgeGaps)).toBe(true);
  });

  it("keeps a free trial active when a checkout is canceled, then activates the selected yearly plan after successful payment", async () => {
    const uniqueUserId = 1_000_000 + Math.floor(Math.random() * 100_000_000);
    const caller = appRouter.createCaller(createTestContext(uniqueUserId, `billing-open-id-${uniqueUserId}`));

    const trial = await caller.billing.startTrial();
    expect(trial.started).toBe(true);
    expect(trial.subscription?.status).toBe("trialing");
    expect(trial.subscription?.billingCycle).toBe("trial");

    const firstCheckout = await caller.billing.createCheckout({ planName: "professional", billingCycle: "yearly" });
    await caller.billing.cancelCheckout({ checkoutId: firstCheckout.checkoutId });
    const afterCancellation = await caller.billing.getSubscription();
    expect(afterCancellation.subscription?.status).toBe("trialing");
    expect(afterCancellation.subscription?.planName).toBe("trial");

    const secondCheckout = await caller.billing.createCheckout({ planName: "professional", billingCycle: "yearly" });
    const payment = await caller.billing.verifyPayment({ checkoutId: secondCheckout.checkoutId });
    const active = await caller.billing.getSubscription();

    expect(payment.success).toBe(true);
    expect(active.subscription?.status).toBe("active");
    expect(active.subscription?.planName).toBe("professional");
    expect(active.subscription?.billingCycle).toBe("yearly");
    expect(active.subscription?.amount).toBe(287000);
  }, 15000);

  it("stores privacy controls per workspace", async () => {
    const uniqueUserId = 1_000_000 + Math.floor(Math.random() * 100_000_000);
    const caller = appRouter.createCaller(createTestContext(uniqueUserId, `privacy-open-id-${uniqueUserId}`));

    expect(await caller.workspace.dataPolicy()).toBeUndefined();
    await caller.workspace.saveDataPolicy({
      retentionDays: 180,
      requireConsent: true,
      allowModelTraining: false,
      deletionContactEmail: "privacy@example.com",
    });
    const policy = await caller.workspace.dataPolicy();

    expect(policy?.retentionDays).toBe(180);
    expect(policy?.requireConsent).toBe(1);
    expect(policy?.allowModelTraining).toBe(0);
    expect(policy?.deletionContactEmail).toBe("privacy@example.com");
  }, 15000);
});
