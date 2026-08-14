import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

describe("website onboarding procedure", () => {
  it("creates an agent and assigns distributed source metadata to knowledge base items", { timeout: 15000 }, async () => {
    // eslint-disable-next-line no-undef
    try { await (vitest as any).setConfig?.({ testTimeout: 15000 }); } catch {}
    const ctx = await createContext({
      req: { headers: {} } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    });
    // Mock user for test context if needed
    (ctx as any).user = { id: 1, openId: "test-user-website", role: "admin" };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.agents.onboardFromWebsite({
      websiteUrl: "https://example.com",
      analysis: {
        businessName: "Test Clinic",
        businessSummary: "Professional health care and consultation services.",
        industry: "Healthcare",
        audience: "Patients",
        language: "ar",
        tone: "professional",
        persona: "You are a professional medical assistant.",
        goals: ["questions", "appointments"],
        suggestedChannels: ["web", "whatsapp"],
        services: [
          { name: "Consultation", description: "General health checkup." },
        ],
        faqs: [
          { question: "Working hours?", answer: "Open 24/7." },
        ],
        guardrails: ["Be polite and safe."],
      },
      sourcePages: [
        { url: "https://example.com/home", title: "Home Page" },
        { url: "https://example.com/services", title: "Services Page" },
      ],
      goals: ["questions", "appointments"],
      channels: ["web"],
      language: "ar",
      tone: "professional",
    });

    expect(result.agent).toBeDefined();
    expect(result.agent.name).toBe("Test Clinic");
    expect(result.knowledgeCount).toBeGreaterThan(0);
    expect(result.channelCount).toBe(1);
  });
});
