// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";

vi.mock("wouter", () => ({ useRoute: () => [true, { agentId: "10" }] }));

import IndependentWidget from "./IndependentWidget";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/public/agents/10")) return Promise.resolve(new Response(JSON.stringify({ agent: { id: 10, name: "وكيل الاختبار", description: null, language: "ar", tone: "friendly" } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    if (url.endsWith("/chat")) return Promise.resolve(new Response(JSON.stringify({ reply: "أهلاً بك", conversation: { id: 42, sessionToken: "x".repeat(43) } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    if (url.endsWith("/close")) return Promise.resolve(new Response(JSON.stringify({ conversation: { id: 42, status: "resolved" } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    if (url.endsWith("/rating")) return Promise.resolve(new Response(JSON.stringify({ conversation: { id: 42, status: "resolved", satisfactionRating: 5 } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    return Promise.resolve(new Response(JSON.stringify({ error: "Unexpected request" }), { status: 500, headers: { "Content-Type": "application/json" } }));
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("Independent public Widget feedback", () => {
  it("shows inline stars only after close-out and submits the selected rating through the Widget session", async () => {
    render(<IndependentWidget />);
    await screen.findByText("مرحباً، أنا وكيل الاختبار. كيف أستطيع مساعدتك؟");
    expect(screen.queryByText("كيف تقيّم تجربة المحادثة؟")).toBeNull();

    const input = screen.getByPlaceholderText("اكتب استفسارك…");
    fireEvent.change(input, { target: { value: "مرحبا" } });
    fireEvent.submit(input.closest("form")!);
    await screen.findByText("أهلاً بك");

    fireEvent.click(screen.getByText("هل تحتاج مساعدة أخرى؟ إنهاء المحادثة الآن"));
    await screen.findByText("كيف تقيّم تجربة المحادثة؟");
    fireEvent.click(screen.getByLabelText("تقييم 5 من 5"));

    await screen.findByText("شكراً لتقييمك. سيساعدنا ذلك في تحسين تجربة المحادثة.");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/agents/10/conversations/42/rating",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ conversationSessionToken: "x".repeat(43), satisfactionRating: 5 }) }),
    ));
  });

  it("previews a text attachment and includes its readable content in the sent customer message", async () => {
    render(<IndependentWidget />);
    await screen.findByText("مرحباً، أنا وكيل الاختبار. كيف أستطيع مساعدتك؟");
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["اسم العميل: عبدالله\nالطلب: شاحنة مبردة"], "request.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await screen.findByText(/request.txt/);
    expect(screen.getByText(/سيُقرأ كنص/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "إرسال الرسالة" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/agents/10/chat",
      expect.objectContaining({ method: "POST", body: expect.stringContaining("اسم العميل: عبدالله") }),
    ));
  });

  it("keeps voice behavior truthful when the browser has no recording API", async () => {
    render(<IndependentWidget />);
    await screen.findByText("مرحباً، أنا وكيل الاختبار. كيف أستطيع مساعدتك؟");
    fireEvent.click(screen.getByRole("button", { name: "تسجيل رسالة صوتية" }));
    await screen.findByText("التسجيل الصوتي غير مدعوم في هذا المتصفح.");
  });

  it("turns an HTML gateway response into a clear service message instead of a JSON parse error", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/public/agents/10")) return Promise.resolve(new Response(JSON.stringify({ agent: { id: 10, name: "وكيل الاختبار", description: null, language: "ar", tone: "friendly" } }), { status: 200, headers: { "Content-Type": "application/json" } }));
      if (url.endsWith("/chat")) return Promise.resolve(new Response("<!doctype html><title>502</title>", { status: 502, headers: { "Content-Type": "text/html" } }));
      return Promise.resolve(new Response(JSON.stringify({ error: "Unexpected request" }), { status: 500, headers: { "Content-Type": "application/json" } }));
    });
    render(<IndependentWidget />);
    await screen.findByText("مرحباً، أنا وكيل الاختبار. كيف أستطيع مساعدتك؟");
    const input = screen.getByPlaceholderText("اكتب استفسارك…");
    fireEvent.change(input, { target: { value: "مرحبا" } });
    fireEvent.submit(input.closest("form")!);
    await screen.findByText(/يبدو أن الخادم يعيد صفحة HTML/);
  });
});
