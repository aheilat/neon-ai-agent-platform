// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";

const analyzeMock = vi.fn();
const applyMock = vi.fn();
const setLocation = vi.fn();

vi.mock("wouter", () => ({ useLocation: () => ["/external", setLocation] }));
vi.mock("@/lib/supabase", () => ({ getIndependentSupabaseBrowserClient: () => ({ auth: { getSession: () => Promise.resolve({ data: { session: { access_token: "test-token" } } }) } }) }));
vi.mock("@/lib/independentSetup", () => ({
  analyzeIndependentCompanyWebsite: (...args: unknown[]) => analyzeMock(...args),
  applyIndependentWebsiteProposal: (...args: unknown[]) => applyMock(...args),
}));

import IndependentOnboarding from "./IndependentOnboarding";

beforeEach(() => {
  applyMock.mockResolvedValue({ agent: { id: 77, name: "Example" } });
  analyzeMock.mockResolvedValue({
    websiteUrl: "https://example.com/",
    pages: [{ url: "https://example.com/", title: "Example", description: "Business", headings: [] }],
    analysis: { businessName: "Example", businessSummary: "Business summary", industry: "Services", audience: "Customers", language: "bilingual", tone: "friendly", persona: "Helpful", goals: [], suggestedChannels: ["web"], services: [], faqs: [], guardrails: [] },
  });
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Independent simplified onboarding", () => {
  it("moves from a company URL to two-column function selection and analysis", async () => {
    render(<IndependentOnboarding />);
    const url = screen.getByPlaceholderText("https://company.com");
    fireEvent.change(url, { target: { value: "https://example.com/" } });
    fireEvent.click(screen.getByText("متابعة واختيار وظائف الوكيل"));
    expect(screen.getByText("ماذا تريد من وكيلك؟")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /الحجوزات والمواعيد/ }));
    fireEvent.click(screen.getByText("حلّل موقعي وابنِ اقتراحاً"));
    await waitFor(() => expect(analyzeMock).toHaveBeenCalledWith("test-token", "https://example.com/"));
    expect(await screen.findByText("وجدنا نقطة بداية ممتازة")).toBeTruthy();
    fireEvent.click(screen.getByText("إنشاء صفحة الوكيل"));
    await waitFor(() => expect(applyMock).toHaveBeenCalled());
    const proposalPayload = applyMock.mock.calls[0][1] as { analysis: { goals: string[] } };
    expect(proposalPayload.analysis.goals).toContain("questions");
    expect(await screen.findByText("وكيلك جاهز")).toBeTruthy();
  });
});
