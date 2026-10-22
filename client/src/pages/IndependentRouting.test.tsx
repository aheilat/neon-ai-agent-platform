// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { React?: typeof React }).React = React;
Element.prototype.scrollIntoView = () => {};
const setLocation = vi.fn();
vi.mock("wouter", () => ({ useLocation: () => ["/settings", setLocation], Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/supabase", () => ({
  getIndependentSupabaseBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: "token" } } }), signOut: vi.fn() } }),
}));

vi.mock("streamdown", () => ({ Streamdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

import IndependentStaging from "./IndependentStaging";

const agent = (id: number, name: string, extra: Record<string, unknown> = {}) => ({ id, name, description: null, persona: "p", tone: "professional", language: "ar", llmModel: "claude-haiku-4-5", status: "active", capabilitiesJson: null, ...extra });
const reception = agent(2, "Neon", { capabilitiesJson: { routing: { specialists: [{ role: "support", agentId: 4 }] } } });
const workspace = { user: { email: "a@b.co", name: "A" }, workspace: { name: "W", slug: "w" }, defaultAgent: reception, agents: [reception, agent(3, "المبيعات"), agent(4, "الدعم الفني"), agent(5, "بعد المبيعات")] };

describe("Independent routing settings card", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      const body = url === "/api/external/agents" && !init?.method ? workspace : url.endsWith("/routing") ? { routing: { specialists: JSON.parse(init!.body!).specialists } } : url.includes("conversations") ? { conversations: [], messages: [] } : { templates: [], items: [], knowledge: [], contacts: [], requests: [], leads: [] };
      return { ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => body, text: async () => JSON.stringify(body) };
    });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  it("shows on the settings page with the saved specialist selected, and saves the chosen table", async () => {
    render(<IndependentStaging />);
    expect(await screen.findByText("التوجيه إلى وكلاء متخصصين")).toBeTruthy();
    const sales = screen.getByLabelText("وكيل المبيعات") as HTMLSelectElement;
    const support = screen.getByLabelText("وكيل الدعم") as HTMLSelectElement;
    const orders = screen.getByLabelText("وكيل الطلبات") as HTMLSelectElement;
    await waitFor(() => expect(support.value).toBe("4"));
    expect(Array.from(sales.options).map(option => option.text)).toEqual(["بدون", "المبيعات", "الدعم الفني", "بعد المبيعات"]);
    fireEvent.change(sales, { target: { value: "3" } });
    fireEvent.change(orders, { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: /حفظ التوجيه/ }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("تم حفظ التوجيه"));
    const put = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/agents/2/routing"))!;
    expect(put[1].method).toBe("PUT");
    expect(JSON.parse(put[1].body)).toEqual({ specialists: [{ role: "sales", agentId: 3 }, { role: "support", agentId: 4 }, { role: "orders", agentId: 5 }] });
  });
});
