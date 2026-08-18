import { describe, expect, it } from "vitest";
import { WHATSAPP_QUICK_TEMPLATES } from "./whatsappTemplates";

describe("Arabic WhatsApp quick templates", () => {
  it("provides the essential local sales and support flows", () => {
    expect(WHATSAPP_QUICK_TEMPLATES.map(template => template.id)).toEqual(["quote", "booking", "lead", "followup", "handoff"]);
  });

  it("keeps consent and human-handoff information explicit", () => {
    expect(WHATSAPP_QUICK_TEMPLATES.find(template => template.id === "lead")?.body).toContain("توافق");
    expect(WHATSAPP_QUICK_TEMPLATES.find(template => template.id === "handoff")?.body).toContain("رقم الهاتف");
  });
});
