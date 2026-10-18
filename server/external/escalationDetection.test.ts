import { describe, expect, it } from "vitest";
import { detectEscalationIntent } from "./escalationDetection";

const escalates = (message: string) => detectEscalationIntent(message);

describe("detectEscalationIntent — requests that must escalate", () => {
  it.each([
    "أريد التحدث مع موظف",
    "ممكن أكلم شخص من الفريق؟",
    "ابغى اكلم مدير",
    "أبي أتكلم مع مسؤول",
    "بدي احكي مع حدا",
    "اريد التحدث مع انسان وليس روبوت",
    "حولني لموظف لو سمحت",
    "ممكن توصلني بموظف",
    "ابغى اتواصل مع موظف خدمة العملاء",
    "أريد التواصل مع خدمة العملاء",
    "ممكن تحولوني",
    "اريد التحدث الى الفريق",
  ])("Arabic human request: %s", message => {
    expect(escalates(message)).toEqual({ escalate: true, reason: expect.stringMatching(/human_request/) });
  });

  it.each([
    "حولني لقسم المبيعات",
    "اريد التحدث مع المبيعات",
    "ممكن حد من المبيعات يتواصل معي",
    "I want to speak with someone from sales",
    "Can you connect me to sales?",
  ])("sales request: %s", message => {
    expect(escalates(message)).toEqual({ escalate: true, reason: "sales_request" });
  });

  it.each([
    "عندي شكوى على الخدمة",
    "أريد تقديم شكوى",
    "اريد ان اشتكي",
    "I have a complaint",
    "I want to complain about my order",
  ])("complaint: %s", message => {
    expect(escalates(message)).toEqual({ escalate: true, reason: "complaint" });
  });

  it.each([
    "I want to talk to a human",
    "Can I speak to a real person?",
    "connect me to an agent please",
    "Transfer me to a human agent",
    "I need to speak with a manager",
    "Please call me, I need a representative",
    "can someone call me",
    "I'd like to talk to your team",
    "put me through to customer service",
    "Talk to a live agent",
  ])("English human request: %s", message => {
    expect(escalates(message)).toEqual({ escalate: true, reason: "human_request" });
  });

  it("ignores diacritics, hamza variants and tatweel", () => {
    expect(escalates("أُرِيدُ التَّحَدُّثَ مَعَ مُوَظَّفٍ").escalate).toBe(true);
    expect(escalates("اريد التحـــدث مع موظفه").escalate).toBe(true);
  });

  it("works with prefixes attached to Arabic words", () => {
    expect(escalates("وأريد التحدث مع الموظف").escalate).toBe(true);
    expect(escalates("اريد التحدث للموظف").escalate).toBe(true);
  });
});

describe("detectEscalationIntent — ordinary messages must NOT escalate", () => {
  it.each([
    "كم سعر الباقة؟",
    "ما هي خدمات Neon AI Agents؟",
    "هل يدعم الوكيل اللغة العربية؟",
    "كيف اربط الوكيل مع واتساب؟",
    "كيف أتواصل معكم؟",
    "كيف اتواصل مع الدعم؟",
    "كلمني بالانجليزي",
    "كلمني عن الدعم الفني",
    "اريد الحديث عن الفريق",
    "اتحدث عن الفريق",
    "ما هي عملية المبيعات عندكم؟",
    "هل لديكم موظفين؟",
    "مرحبا",
    "How do I connect an agent to WhatsApp?",
    "Tell me about your AI agents",
    "Can I talk to the AI agent in Arabic?",
    "What is the sales process?",
    "Do you have a support team?",
    "how do I contact support",
    "talk about the team please",
    "Is this a real person?",
    "How many agents can I create?",
    "Send me the pricing",
  ])("%s", message => {
    expect(escalates(message)).toEqual({ escalate: false });
  });

  it.each([
    "لا أريد التحدث مع موظف أريد معلومات فقط",
    "ما بدي احكي مع حدا",
    "ما عندي شكوى",
    "I don't want to talk to a human",
    "no need to speak to a manager",
    "I have no complaint",
  ])("negated request: %s", message => {
    expect(escalates(message)).toEqual({ escalate: false });
  });

  it("does not escalate on empty, non-string or very long messages", () => {
    expect(escalates("")).toEqual({ escalate: false });
    expect(escalates(undefined as unknown as string)).toEqual({ escalate: false });
    expect(escalates(`اريد التحدث مع موظف ${"x".repeat(450)}`)).toEqual({ escalate: false });
  });
});
