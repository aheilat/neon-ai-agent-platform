import { describe, expect, it, vi } from "vitest";
import { closeIndependentConversation, requestIndependentAgentReply } from "./independentChat";

describe("independent agent chat request", () => {
  it("sends the Supabase bearer token and message only to the independent agent chat route", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ agentId: 7, reply: "أهلاً بك", conversation: { id: 14, status: "active" } }),
    });

    await expect(requestIndependentAgentReply({
      accessToken: "session-token",
      agentId: 7,
      message: "مرحبا",
    }, fetchImplementation)).resolves.toEqual({ agentId: 7, reply: "أهلاً بك", conversation: { id: 14, status: "active" } });

    expect(fetchImplementation).toHaveBeenCalledWith("/api/external/agents/7/chat", {
      method: "POST",
      headers: {
        Authorization: "Bearer session-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "مرحبا" }),
    });
  });

  it("returns the server-safe message if the independent chat service rejects a request", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Independent AI service is unavailable" }),
    });

    await expect(requestIndependentAgentReply({
      accessToken: "session-token",
      agentId: 7,
      message: "مرحبا",
    }, fetchImplementation)).rejects.toThrow("Independent AI service is unavailable");
  });

  it("closes only the current independent agent conversation using the Supabase bearer token", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ conversation: { id: 14, status: "resolved" } }) });
    await expect(closeIndependentConversation("session-token", 7, 14, fetchImplementation)).resolves.toEqual({ id: 14, status: "resolved" });
    expect(fetchImplementation).toHaveBeenCalledWith("/api/external/agents/7/conversations/14/close", {
      method: "POST",
      headers: { Authorization: "Bearer session-token", "Content-Type": "application/json" },
      body: "{}",
    });
  });
});
