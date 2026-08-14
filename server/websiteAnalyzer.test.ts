import { describe, expect, it } from "vitest";
import { assertSafeWebsiteUrl, extractWebsitePage } from "./websiteAnalyzer";

describe("website analyzer", () => {
  it("extracts useful business content and absolute links while removing scripts", () => {
    const page = extractWebsitePage(
      `<!doctype html><html><head><title>Neon Clinic</title><meta name="description" content="Appointments and care"></head><body><script>alert('ignore')</script><h1>Healthcare services</h1><p>Book a consultation with our team.</p><a href="/contact">Contact</a><a href="https://external.example/path">External</a></body></html>`,
      "https://example.com/",
    );

    expect(page.title).toBe("Neon Clinic");
    expect(page.description).toBe("Appointments and care");
    expect(page.headings).toContain("Healthcare services");
    expect(page.content).toContain("Book a consultation with our team.");
    expect(page.content).not.toContain("alert('ignore')");
    expect(page.links).toContain("https://example.com/contact");
    expect(page.links).toContain("https://external.example/path");
  });

  it("rejects local and private network targets before fetching", async () => {
    await expect(assertSafeWebsiteUrl("http://localhost:3000")).rejects.toThrow("الشبكات الداخلية");
    await expect(assertSafeWebsiteUrl("http://127.0.0.1/admin")).rejects.toThrow("الشبكات الداخلية");
    await expect(assertSafeWebsiteUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow("الشبكات الداخلية");
  });
});
