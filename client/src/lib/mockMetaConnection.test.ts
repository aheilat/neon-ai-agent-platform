import { describe, expect, it } from "vitest";
import { createMockMetaConnection, mockMetaStorageKey } from "./mockMetaConnection";

describe("mock Meta connection", () => {
  it("creates clearly labeled, agent-scoped test data without real WhatsApp identifiers", () => {
    expect(mockMetaStorageKey(7)).toBe("neon.mock-meta.7");
    expect(createMockMetaConnection("وكيل الشركة", "2026-08-25T12:00:00.000Z")).toEqual({
      displayPhoneNumber: "+962 7 9000 0000",
      verifiedName: "وكيل الشركة (محاكاة)",
      qualityRating: "GREEN",
      simulatedAt: "2026-08-25T12:00:00.000Z",
    });
  });
});
