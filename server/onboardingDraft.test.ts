import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { upsertUser } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId = 8710, openId = "open-id-onboarding-draft-test"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId,
    email: `draftowner${userId}@example.com`,
    name: "Onboarding Draft Owner",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => {} } as TrpcContext["res"] };
}

describe("workspace onboarding draft", () => {
  it("persists a client setup draft and clears it after completion", async () => {
    const ctx = createTestContext();
    await upsertUser(ctx.user);
    const caller = appRouter.createCaller(ctx);
    const payload = { step: 2, websiteUrl: "https://neon.example", selectedGoals: ["questions", "leads"], language: "bilingual" };

    await caller.workspace.saveOnboardingDraft({ payload });
    const saved = await caller.workspace.onboardingDraft();
    expect(saved?.payload).toMatchObject(payload);

    await caller.workspace.clearOnboardingDraft();
    expect(await caller.workspace.onboardingDraft()).toBeNull();
  }, 15000);
});
