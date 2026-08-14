import { describe, expect, it } from "vitest";
import { buildTimelineCsv } from "../shared/timelineCsv";

describe("timeline CSV export", () => {
  it("exports Arabic-safe headers, quoted summaries, and UTF-8 BOM", () => {
    const csv = buildTimelineCsv([{
      createdAt: "2026-08-15T10:00:00.000Z",
      websiteUrl: "https://example.com",
      status: "تغييرات مكتشفة",
      changesSummary: "تغيّر السعر, وإضافة خدمة جديدة",
      serviceCount: 3,
      faqCount: 2,
    }]);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("تاريخ المزامنة");
    expect(csv).toContain('"تغيّر السعر, وإضافة خدمة جديدة"');
    expect(csv.split("\r\n")).toHaveLength(3);
  });
});
