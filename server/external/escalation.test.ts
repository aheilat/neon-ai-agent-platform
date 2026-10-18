import { describe, expect, it, vi } from "vitest";
import { buildEscalationEmail, escalationAcknowledgement, escapeHtml, handoffEmailFor, notifyOwnerOfEscalation, widgetHandoffPrompt } from "./escalation";

const details = { conversationId: 85, channel: "whatsapp" as const, reason: "human_request" as const, customerName: "Ahmed", customerPhone: "962792314613", customerMessage: "أريد التحدث مع موظف" };
const agent = { name: "Neon", capabilitiesJson: { handoffContact: { email: "owner@example.com" } } };

describe("escalation wording", () => {
  it("follows the agent language, and the customer's script for bilingual agents", () => {
    expect(escalationAcknowledgement("ar", "hello")).toContain("تم تحويل طلبك");
    expect(escalationAcknowledgement("en", "مرحبا")).toContain("passed your request");
    expect(escalationAcknowledgement("bilingual", "مرحبا")).toContain("تم تحويل طلبك");
    expect(escalationAcknowledgement("bilingual", "hello")).toContain("passed your request");
    expect(widgetHandoffPrompt("ar", "x")).toContain("النموذج");
    expect(widgetHandoffPrompt(undefined, "I want a human")).toContain("form");
  });
});

describe("escalation e-mail", () => {
  it("includes the conversation facts and the stop-replying notice", () => {
    const { subject, html } = buildEscalationEmail("Neon", details);
    expect(subject).toBe("عميل يطلب التحدث مع موظف — Neon");
    expect(html).toContain("واتساب");
    expect(html).toContain("962792314613");
    expect(html).toContain("أريد التحدث مع موظف");
    expect(html).toContain("المحادثة رقم 85");
    expect(html).toContain("توقف الوكيل");
  });

  it("escapes customer-controlled text so it cannot inject markup or links", () => {
    const { subject, html } = buildEscalationEmail("Neon <b>", { ...details, customerName: `<a href="https://evil.test">x</a>`, customerMessage: `<script>alert(1)</script>\n"quoted"` });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain(`<a href="https://evil.test">`);
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;quoted&quot;");
    expect(subject).not.toMatch(/[\r\n]/);
    expect(escapeHtml(`a&b<'"`)).toBe("a&amp;b&lt;&#39;&quot;");
  });

  it("strips line breaks from the subject and truncates a very long customer message", () => {
    const { subject, html } = buildEscalationEmail("Neon\r\nBcc: x@y.z", { ...details, customerMessage: "م".repeat(900) });
    expect(subject).not.toMatch(/[\r\n]/);
    expect(html).toContain("…");
    expect(html.length).toBeLessThan(2500);
  });

  it("uses the label of the reason", () => {
    expect(buildEscalationEmail("Neon", { ...details, reason: "sales_request" }).subject).toContain("المبيعات");
    expect(buildEscalationEmail("Neon", { ...details, reason: "complaint" }).subject).toContain("شكوى");
  });
});

describe("notifyOwnerOfEscalation", () => {
  it("sends to the agent's handoff e-mail", async () => {
    const send = vi.fn(async () => true);
    await expect(notifyOwnerOfEscalation(agent, details, send)).resolves.toBe(true);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "owner@example.com", subject: expect.stringContaining("Neon") }));
  });

  it("does nothing, without failing, when no valid handoff e-mail is configured", async () => {
    const send = vi.fn(async () => true);
    await expect(notifyOwnerOfEscalation({ name: "Neon", capabilitiesJson: null }, details, send)).resolves.toBe(false);
    await expect(notifyOwnerOfEscalation({ name: "Neon", capabilitiesJson: { handoffContact: { email: "not-an-email" } } }, details, send)).resolves.toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(handoffEmailFor({ capabilitiesJson: { handoffContact: { email: " a@b.co " } } })).toBe("a@b.co");
  });

  it("never throws when the e-mail provider fails", async () => {
    const send = vi.fn(async () => { throw new Error("resend down"); });
    await expect(notifyOwnerOfEscalation(agent, details, send)).resolves.toBe(false);
  });
});
