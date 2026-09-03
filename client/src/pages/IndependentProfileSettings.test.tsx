// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";

const getSession = vi.fn();
const updateUser = vi.fn();
const signOut = vi.fn();
const setLocation = vi.fn();

vi.mock("wouter", () => ({ useLocation: () => ["/profile", setLocation], Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/supabase", () => ({
  getIndependentSupabaseBrowserClient: () => ({ auth: { getSession, updateUser, signOut } }),
}));

import IndependentProfileSettings from "./IndependentProfileSettings";

describe("Independent profile settings", () => {
  beforeEach(() => {
    getSession.mockResolvedValue({ data: { session: { user: { email: "ahmad@example.com", user_metadata: { full_name: "أحمد", phone: "+962700000000" } } } } });
    updateUser.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("loads the signed-in user's profile and updates personal information", async () => {
    render(<IndependentProfileSettings />);
    expect(await screen.findByDisplayValue("أحمد")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("الاسم الكامل"), { target: { value: "أحمد هيلات" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ المعلومات" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ data: { full_name: "أحمد هيلات", phone: "+962700000000" } }));
    expect((await screen.findByRole("status")).textContent).toContain("تم حفظ معلوماتك الشخصية بنجاح");
  });

  it("validates and changes the password", async () => {
    render(<IndependentProfileSettings />);
    await screen.findByDisplayValue("أحمد");
    fireEvent.change(screen.getByLabelText("كلمة المرور الجديدة"), { target: { value: "strongpass123" } });
    fireEvent.change(screen.getByLabelText("تأكيد كلمة المرور"), { target: { value: "strongpass123" } });
    fireEvent.click(screen.getByRole("button", { name: "تغيير كلمة المرور" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "strongpass123" }));
    expect((await screen.findByRole("status")).textContent).toContain("تم تغيير كلمة المرور بنجاح");
  });

  it("redirects unauthenticated visitors to login", async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } });
    render(<IndependentProfileSettings />);
    await waitFor(() => expect(setLocation).toHaveBeenCalledWith("/login"));
  });
});

