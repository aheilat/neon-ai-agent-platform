import { describe, expect, it, vi } from "vitest";
import { createContext } from "./_core/context";
import { getKnowledgeForAgent } from "./db";
import type { WebsiteSnapshot } from "./websiteAnalyzer";

const mockedAnalyzeWebsite = vi.fn();
vi.mock("./websiteAnalyzer", async () => {
  const actual = await vi.importActual<typeof import("./websiteAnalyzer")>("./websiteAnalyzer");
  return { ...actual, analyzeWebsite: mockedAnalyzeWebsite };
});

const { appRouter } = await import("./routers");

describe("website agent sync", () => {
  it("updates the agent persona and replaces website knowledge with source metadata", async () => {
    mockedAnalyzeWebsite.mockResolvedValueOnce({
      websiteUrl: "https://clinic.example.com",
      pages: [
        { url: "https://clinic.example.com/", title: "Clinic Home", description: "", headings: [], content: "", links: [] },
        { url: "https://clinic.example.com/services", title: "Services", description: "", headings: [], content: "", links: [] },
      ],
      analysis: {
        businessName: "Clinic Website",
        businessSummary: "A clinic offering consultations.",
        industry: "Healthcare",
        audience: "Patients",
        language: "ar",
        tone: "professional",
        persona: "أنت منسق صحي متعاطف.",
        goals: ["questions", "appointments"],
        suggestedChannels: ["web"],
        services: [{ name: "Consultations", description: "Book a consultation.", sourceUrl: "https://clinic.example.com/services" }],
        faqs: [{ question: "When are you open?", answer: "Every day.", sourceUrl: "https://clinic.example.com/" }],
        guardrails: ["لا تشخّص الحالات."],
      },
    } satisfies WebsiteSnapshot & { analysis: NonNullable<WebsiteSnapshot["pages"]> extends never ? never : any });

    const ctx = await createContext({ req: { headers: {} } as any, res: { cookie: () => {}, clearCookie: () => {} } as any });
    (ctx as any).user = { id: 1, openId: "website-sync-test-user", role: "admin" };
    const caller = appRouter.createCaller(ctx);
    const created = await caller.agents.create({
      name: `Website Sync ${Date.now()}`,
      description: "Before sync",
      persona: "Original persona",
      tone: "friendly",
      language: "bilingual",
      decisionRules: "Original rules",
      fallbackMessage: "Fallback",
      escalationKeyword: "human",
      status: "active",
    });
    expect(created).toBeDefined();

    const result = await caller.agents.syncFromWebsite({ agentId: created!.id, websiteUrl: "https://clinic.example.com", consent: true });
    expect(result.agent?.sourceWebsiteUrl).toBe("https://clinic.example.com");
    expect(result.knowledgeCount).toBe(2);

    const knowledge = await getKnowledgeForAgent(1, created!.id);
    const service = knowledge.find(item => item.title === "Consultations");
    const faq = knowledge.find(item => item.title.startsWith("FAQ:"));
    expect(service?.sourceUrl).toBe("https://clinic.example.com/services");
    expect(faq?.sourceUrl).toBe("https://clinic.example.com/");
    expect(service?.sourceFetchedAt).toBeTruthy();
  }, 15000);
});
