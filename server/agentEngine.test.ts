import { describe, expect, it } from "vitest";
import { buildAgentPrompt, containsEscalationKeyword, createAssistantReply, normalizeLlmContent } from "./agentEngine";
import type { Agent } from "../drizzle/schema";

const agent = {
  id: 1,
  tenantId: 7,
  name: "Neon Concierge",
  description: "Assistant",
  persona: "Helpful and clear",
  tone: "friendly",
  language: "bilingual",
  decisionRules: "Guide the next step",
  fallbackMessage: "A human will help you.",
  escalationKeyword: "موظف,human",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
} as Agent;

describe("agentEngine", () => {
  it("builds a prompt with tenant-owned agent context and knowledge", () => {
    const prompt = buildAgentPrompt(agent, [{ id: 1, tenantId: 7, agentId: 1, title: "Returns", content: "Returns are accepted within 14 days.", category: "FAQ", createdAt: new Date(), updatedAt: new Date() }], "What is your return policy?");
    expect(prompt).toContain("Neon Concierge");
    expect(prompt).toContain("Returns are accepted within 14 days.");
    expect(prompt).toContain("What is your return policy?");
  });

  it("detects Arabic and English escalation keywords", () => {
    expect(containsEscalationKeyword("أحتاج موظف يساعدني", agent.escalationKeyword)).toBe(true);
    expect(containsEscalationKeyword("I need a human", agent.escalationKeyword)).toBe(true);
    expect(containsEscalationKeyword("نعم حولني إلى الفريق", agent.escalationKeyword)).toBe(true);
    expect(containsEscalationKeyword("Please transfer me", agent.escalationKeyword)).toBe(true);
    expect(containsEscalationKeyword("What are your hours?", agent.escalationKeyword)).toBe(false);
  });

  it("normalizes string and structured model content", () => {
    expect(normalizeLlmContent("  hello  ")).toBe("hello");
    expect(normalizeLlmContent([{ type: "text", text: "hello" }])).toBe("hello");
    expect(createAssistantReply("")).toEqual({ content: "أحتاج إلى تفاصيل أكثر حتى أساعدك بشكل دقيق.", escalated: false });
  });
});
