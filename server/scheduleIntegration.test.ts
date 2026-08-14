import { describe, expect, it } from "vitest";
import { createContext } from "./_core/context";

const { appRouter } = await import("./routers");

describe("schedule integration and cron configuration", () => {
  it("rejects sync schedule configuration if websiteUrl is missing", async () => {
    const ctx = await createContext({ req: { headers: {} } as any, res: { cookie: () => {}, clearCookie: () => {} } as any });
    (ctx as any).user = { id: 1, openId: "schedule-test-user", role: "admin" };
    const caller = appRouter.createCaller(ctx);

    const agent = await caller.agents.create({
      name: `Schedule Agent ${Date.now()}`,
      description: "No website",
      persona: "Test",
      tone: "friendly",
      language: "ar",
      status: "active",
    });

    await expect(
      caller.agents.configureSyncSchedule({ agentId: agent!.id, intervalHours: 24, enabled: true })
    ).rejects.toThrow("يجب مزامنة الموقع أولاً");
  });
});
