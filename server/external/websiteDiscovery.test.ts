import { describe, expect, it, vi } from "vitest";
import { analyzeIndependentWebsitePages, assertIndependentAnalysisSources, assertIndependentPublicWebsiteUrl, extractIndependentWebsitePage } from "./websiteDiscovery";

describe("independent website discovery", () => {
  it("extracts readable public content while excluding script text", () => {
    const page = extractIndependentWebsitePage('<html><title>Neon Services</title><body><h1>Fleet rental</h1><p>Refrigerated trucks in Muscat.</p><script>secret-value</script><a href="/contact">Contact</a></body></html>', "https://example.com/");
    expect(page.title).toBe("Neon Services");
    expect(page.content).toContain("Refrigerated trucks");
    expect(page.content).not.toContain("secret-value");
    expect(page.links).toContain("https://example.com/contact");
  });

  it("rejects internal website locations before crawling", async () => {
    await expect(assertIndependentPublicWebsiteUrl("http://127.0.0.1")).rejects.toThrow("مواقع HTTP وHTTPS العامة");
  });

  it("rejects analysis claims that cite pages outside the approved crawl", () => {
    const analysis = {
      businessName: "Test", businessSummary: "Summary", industry: "Services", audience: "Businesses", language: "bilingual" as const, tone: "friendly" as const, persona: "Helpful assistant", goals: ["questions"] as const, suggestedChannels: ["web"] as const, services: [{ name: "Service", description: "Description", sourceUrl: "https://outside.example/" }], faqs: [], guardrails: ["Do not invent facts"],
    };
    expect(() => assertIndependentAnalysisSources(analysis, [{ url: "https://example.com/" }])).toThrow("مصدر");
  });

  it("uses server-side Claude analysis and validates its cited public sources", async () => {
    const complete = vi.fn().mockResolvedValue(JSON.stringify({
      businessName: "Example", businessSummary: "Business summary", industry: "Services", audience: "Customers", language: "bilingual", tone: "friendly", persona: "Helpful agent", goals: ["questions"], suggestedChannels: ["web"], services: [{ name: "Consulting", description: "Consulting service", sourceUrl: "https://example.com/" }], faqs: [], guardrails: ["Use approved knowledge only"],
    }));
    const analysis = await analyzeIndependentWebsitePages({ websiteUrl: "https://example.com/", pages: [{ url: "https://example.com/", title: "Example", description: "", headings: [], content: "Consulting", links: [] }] }, complete);
    expect(analysis.businessName).toBe("Example");
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("normalizes wrapped analysis JSON and common language or tone labels to the independent contract", async () => {
    const complete = vi.fn().mockResolvedValue(`Analysis follows:\n\n\`\`\`json
      {"businessName":"Example","businessSummary":"Business summary","industry":"Services","audience":"Customers","language":"Arabic","tone":"احترافي","persona":"Helpful agent","goals":["questions"],"suggestedChannels":["live chat"],"services":[{"name":"Consulting","description":"Consulting service","sourceUrl":"https://example.com"}],"faqs":[],"guardrails":["Use approved knowledge only"]}
      \`\`\``);
    const analysis = await analyzeIndependentWebsitePages({ websiteUrl: "https://example.com/", pages: [{ url: "https://example.com/", title: "Example", description: "", headings: [], content: "Consulting", links: [] }] }, complete);
    expect(analysis.language).toBe("ar");
    expect(analysis.tone).toBe("professional");
    expect(analysis.suggestedChannels).toEqual(["web"]);
    expect(analysis.services[0]?.sourceUrl).toBe("https://example.com/");
  });
});
