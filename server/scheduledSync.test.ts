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

import { compareWebsiteAnalyses } from "./websiteAnalyzer";

describe("snapshot comparison details", () => {
  it("returns added, removed, and modified entries", () => {
    const previous = {
      businessName: "Store",
      businessSummary: "Old summary",
      industry: "Retail",
      audience: "Customers",
      language: "ar" as const,
      tone: "friendly",
      persona: "Old persona",
      goals: ["buy" as const],
      suggestedChannels: ["web" as const],
      services: [
        { name: "Consultation", description: "100", sourceUrl: "https://example.com/" },
        { name: "Old Service", description: "Removed", sourceUrl: "https://example.com/old" },
      ],
      faqs: [{ question: "Hours?", answer: "9 to 5", sourceUrl: "https://example.com/" }],
      guardrails: [],
    };
    const current = {
      ...previous,
      businessSummary: "New summary",
      persona: "New persona",
      services: [
        { name: "Consultation", description: "120", sourceUrl: "https://example.com/" },
        { name: "New Service", description: "Added", sourceUrl: "https://example.com/new" },
      ],
      faqs: [{ question: "Hours?", answer: "10 to 6", sourceUrl: "https://example.com/" }],
    };
    const changes = compareWebsiteAnalyses(previous, current);
    expect(changes.some(change => change.type === "added" && change.label === "New Service")).toBe(true);
    expect(changes.some(change => change.type === "removed" && change.label === "Old Service")).toBe(true);
    expect(changes.some(change => change.type === "modified" && change.label === "Consultation")).toBe(true);
    expect(changes.some(change => change.category === "persona")).toBe(true);
  });
});
