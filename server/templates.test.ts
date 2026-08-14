import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getAgentInTenant, getOrCreateTenant, upsertUser } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 126,
    openId: "open-id-industry-templates-test",
    email: "templates@example.com",
    name: "Templates Owner",
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

describe("Industry agent templates", () => {
  it("creates an ecommerce agent with template knowledge", async () => {
    const ctx = createContext();
    await upsertUser(ctx.user);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.agents.onboard({
      templateId: "ecommerce",
      language: "bilingual",
      tone: "friendly",
      goals: ["questions"],
    });

    expect(result.agent.name).toBe("خبير التجارة الإلكترونية");
    expect(result.knowledgeCount).toBeGreaterThan(1);
    expect(result.channelCount).toBe(3);
  }, 15000);

  it("creates a healthcare agent with safe guidance and default channels", async () => {
    const ctx = createContext();
    await upsertUser(ctx.user);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.agents.onboard({
      templateId: "healthcare",
      language: "bilingual",
      tone: "professional",
      goals: ["questions", "appointments", "symptoms", "insurance", "emergency", "human"],
    });

    expect(result.agent.name).toBe("منسق الرعاية الصحية الذكي");
    expect(result.agent.description).toContain("دون تشخيص");
    const tenant = await getOrCreateTenant(ctx.user);
    const persistedAgent = tenant ? await getAgentInTenant(tenant.id, result.agent.id) : undefined;
    expect(persistedAgent?.decisionRules).toContain("لا تشخّص");
    expect(persistedAgent?.escalationKeyword).toContain("طوارئ");
    expect(result.knowledgeCount).toBe(10);
    expect(result.channelCount).toBe(3);
  }, 15000);

  it("uses the real estate template for preview escalation", async () => {
    const ctx = createContext();
    await upsertUser(ctx.user);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.agents.previewChat({
      templateId: "realestate",
      language: "ar",
      tone: "professional",
      goals: ["appointments", "leads"],
      message: "أبغى موظف يساعدني في موعد معاينة",
    });

    expect(result.escalated).toBe(true);
    expect(result.reply).toContain("تحويل");
  });
});
