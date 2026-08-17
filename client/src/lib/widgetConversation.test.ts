import { describe, expect, it } from "vitest";
import { isExplicitCloseRequest } from "./widgetConversation";

describe("widget closing trigger", () => {
  it("opens the closing flow only after an explicit closing request", () => {
    expect(isExplicitCloseRequest("أريد تمويلاً")).toBe(false);
    expect(isExplicitCloseRequest("هل تقدمون تمويل؟")).toBe(false);
    expect(isExplicitCloseRequest("أنهي المحادثة")).toBe(true);
    expect(isExplicitCloseRequest("close chat")).toBe(true);
  });
});
