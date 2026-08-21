import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { upsertUser } from "./db";

vi.mock("./chatService", () => ({
  generateFastChatReply: vi.fn(async () => ({ content: "أهلاً بك، كيف أقدر أساعدك اليوم؟" })),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 125,
    openId: "open-id-preview-test",
    email: "preview@example.com",
    name: "Preview Owner",
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

describe("Agent live preview", () => {
  it("returns an escalation preview without creating a conversation", async () => {
    const ctx = createContext();
    await upsertUser(ctx.user);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.agents.previewChat({
      language: "ar",
      tone: "friendly",
      goals: ["questions", "human"],
      message: "أبغى موظف يساعدني",
    });

    expect(result.escalated).toBe(true);
    expect(result.reply).toContain("تحويل");
  });
});

  it("returns a standard agent reply during onboarding live preview", async () => {
    const ctx = createContext();
    await upsertUser(ctx.user);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.agents.previewChat({
      language: "ar",
      tone: "friendly",
      goals: ["questions"],
      message: "كيف حالك؟",
    });

    expect(result.escalated).toBe(false);
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
  });
