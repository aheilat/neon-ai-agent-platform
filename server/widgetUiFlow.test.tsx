// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  replyMutate: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    chat: {
      publicReply: {
        useMutation: (options: { onSuccess: (result: { conversationId: number; content: string; escalated: boolean; handoff: boolean }) => void }) => ({
          isPending: false,
          mutate: (input: { message: string }) => {
            mocks.replyMutate(input);
            options.onSuccess({ conversationId: 41, content: "هذه معلومات التمويل المطلوبة.", escalated: false, handoff: false });
          },
        }),
      },
      publicHandoffContact: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      publicCloseConversation: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      publicRateConversation: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
    },
  },
}));

vi.mock("wouter", () => ({ useRoute: () => [true, { agentId: "1470001" }] }));

import Widget from "../client/src/pages/Widget";

afterEach(() => cleanup());

describe("Widget UI closing flow", () => {
  it("keeps a normal financing question in the conversation without showing closing prompts", () => {
    render(<Widget />);
    fireEvent.change(screen.getByPlaceholderText("اكتب استفسارك هنا..."), { target: { value: "أريد تمويلاً" } });
    fireEvent.submit(screen.getByPlaceholderText("اكتب استفسارك هنا...").closest("form")!);

    expect(mocks.replyMutate).toHaveBeenCalledWith(expect.objectContaining({ message: "أريد تمويلاً" }));
    expect(screen.getByText("هذه معلومات التمويل المطلوبة.")).toBeTruthy();
    expect(screen.queryByText("هل تحتاج إلى مساعدة أخرى؟")).toBeNull();
  });

  it("opens the two-step closing flow from the explicit footer button", () => {
    render(<Widget />);
    fireEvent.click(screen.getByText("إنهاء المحادثة"));
    expect(screen.getAllByText("هل تحتاج إلى مساعدة أخرى؟").length).toBeGreaterThan(1);
    fireEvent.click(screen.getByText("لا، أنهيها"));
    expect(screen.getAllByText("هل تريد إنهاء المحادثة الآن؟").length).toBeGreaterThan(1);
  });

  it("opens the closing flow after a typed explicit closing request", () => {
    render(<Widget />);
    fireEvent.change(screen.getByPlaceholderText("اكتب استفسارك هنا..."), { target: { value: "أنهي المحادثة" } });
    fireEvent.submit(screen.getByPlaceholderText("اكتب استفسارك هنا...").closest("form")!);
    expect(screen.getAllByText("هل تحتاج إلى مساعدة أخرى؟").length).toBeGreaterThan(1);
  });
});
