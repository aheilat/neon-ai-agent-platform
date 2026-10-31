// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { React?: typeof React }).React = React;
vi.mock("wouter", () => ({ Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

import Legal from "./Legal";

afterEach(cleanup);

describe("Legal pages", () => {
  it("shows the terms in Arabic, then in English", () => {
    render(<Legal doc="terms" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("شروط الاستخدام");
    expect(document.body.textContent).toContain("ahailat@neonadai.com");
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Terms of Service");
    expect(document.querySelector("main")?.getAttribute("dir")).toBe("ltr");
  });

  it("states the 3-day refund window and the contact email", () => {
    render(<Legal doc="refund" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("سياسة الاسترجاع");
    expect(document.body.textContent).toContain("3 أيام");
    expect(document.body.textContent).toContain("ahailat@neonadai.com");
  });

  it("names the data processors in the privacy policy and links to the other pages", () => {
    render(<Legal doc="privacy" />);
    for (const name of ["Supabase", "PayTabs", "Meta", "Anthropic"]) expect(document.body.textContent).toContain(name);
    const hrefs = Array.from(document.querySelectorAll("nav a")).map(link => link.getAttribute("href"));
    expect(hrefs).toEqual(["/terms", "/privacy", "/refund"]);
  });
});
