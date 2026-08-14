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
});
