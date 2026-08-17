import { describe, expect, it } from "vitest";
import { isExplicitCloseRequest, nextWidgetClosingStage } from "../client/src/lib/widgetConversation";

describe("Widget explicit closing flow", () => {
  it("does not interrupt regular customer questions with the ending flow", () => {
    expect(isExplicitCloseRequest("أريد تمويلاً")).toBe(false);
    expect(isExplicitCloseRequest("هل تقدمون تمويل؟")).toBe(false);
    expect(isExplicitCloseRequest("أنهي المحادثة")).toBe(true);
    expect(isExplicitCloseRequest("close chat")).toBe(true);
  });

  it("keeps a normal agent reply open and starts closing only from an explicit action", () => {
    expect(nextWidgetClosingStage("idle", "agent-reply")).toBe("idle");
    expect(nextWidgetClosingStage("idle", "start-closing")).toBe("ask-more");
    expect(nextWidgetClosingStage("ask-more", "no-more-help")).toBe("confirm-close");
    expect(nextWidgetClosingStage("confirm-close", "confirm-close")).toBe("closed");
  });
});
