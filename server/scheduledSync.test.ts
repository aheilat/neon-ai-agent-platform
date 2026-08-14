import { describe, expect, it } from "vitest";
import { detectAnalysisChanges } from "./websiteAnalyzer";

describe("scheduled website sync change detection", () => {
  it("detects changes in business summary and services", () => {
    const previous = {
      businessName: "Clinic",
      businessSummary: "Old summary",
      industry: "Health",
      audience: "All",
      language: "ar" as const,
      tone: "professional",
      persona: "...",
      goals: ["questions" as const],
      suggestedChannels: ["web" as const],
      services: [{ name: "Consultation", description: "100 USD", sourceUrl: "https://example.com/services" }],
      faqs: [{ question: "Hours?", answer: "9 to 5", sourceUrl: "https://example.com/" }],
      guardrails: [],
    };

    const current = {
      ...previous,
      businessSummary: "New summary with updated offerings",
      services: [
        { name: "Consultation", description: "120 USD (Updated price)", sourceUrl: "https://example.com/services" },
        { name: "New Lab Test", description: "Available now", sourceUrl: "https://example.com/services" },
      ],
    };

    const diff = detectAnalysisChanges(previous, current);
    expect(diff.hasChanges).toBe(true);
    expect(diff.summary).toContain("تغيّر ملخص النشاط");
    expect(diff.summary).toContain("خدمات");
  });
});
