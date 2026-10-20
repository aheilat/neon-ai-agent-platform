import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ addMessage: vi.fn(async () => undefined) }));
vi.mock("./agentRepository", () => ({ addIndependentConversationMessage: mocks.addMessage }));

import { reactivateIndependentConversation, sendIndependentHumanReply, WHATSAPP_REPLY_WINDOW_MS } from "./humanReply";

const NOW = Date.parse("2026-10-20T12:00:00Z");
const input = { tenantId: 7, agentId: 2, conversationId: 85, message: "أهلاً، أنا من الفريق" };
const context = (overrides: Record<string, unknown> = {}) => ({ channel: "whatsapp", status: "escalated", customerPhone: "962792314613", lastCustomerMessageAt: new Date(NOW - 60_000), phoneNumberId: "1290489297477772", ...overrides });
const poolWith = (row: unknown) => {
  const query = vi.fn(async (sql: string) => (/select c\.channel/.test(sql) ? { rows: row ? [row] : [] } : { rows: [] }));
  return { pool: { query } as never, query };
};

describe("sendIndependentHumanReply", () => {
  it("sends on WhatsApp, stores the message as human and keeps the conversation with the team", async () => {
    mocks.addMessage.mockClear();
    const { pool, query } = poolWith(context({ status: "active" }));
    const send = vi.fn(async () => ({}));
    const result = await sendIndependentHumanReply(pool, input, send, () => NOW);
    expect(result).toMatchObject({ ok: true, status: "escalated" });
    expect(send).toHaveBeenCalledWith({ phoneNumberId: "1290489297477772", to: "962792314613", body: input.message });
    expect(mocks.addMessage).toHaveBeenCalledWith(pool, 85, "human", input.message);
    expect(query.mock.calls.some(([sql]) => /set status = 'escalated'/.test(String(sql)))).toBe(true);
  });

  it("refuses a closed conversation, other channels, a missing phone or missing integration without sending", async () => {
    const cases: Array<[Record<string, unknown>, string, number]> = [
      [{ status: "resolved" }, "resolved", 409],
      [{ channel: "widget" }, "unsupported_channel", 400],
      [{ customerPhone: null }, "no_phone", 400],
      [{ phoneNumberId: null }, "no_integration", 409],
    ];
    for (const [override, code, status] of cases) {
      const send = vi.fn();
      const { pool } = poolWith(context(override));
      expect(await sendIndependentHumanReply(pool, input, send, () => NOW)).toMatchObject({ ok: false, code, status });
      expect(send).not.toHaveBeenCalled();
    }
  });

  it("returns 404 for an unknown or foreign conversation", async () => {
    const { pool } = poolWith(undefined);
    expect(await sendIndependentHumanReply(pool, input, vi.fn(), () => NOW)).toMatchObject({ ok: false, code: "not_found", status: 404 });
  });

  it("refuses when the 24-hour WhatsApp window has passed, or there was never a customer message", async () => {
    const send = vi.fn();
    const old = poolWith(context({ lastCustomerMessageAt: new Date(NOW - WHATSAPP_REPLY_WINDOW_MS - 1_000) }));
    expect(await sendIndependentHumanReply(old.pool, input, send, () => NOW)).toMatchObject({ ok: false, code: "window_closed", status: 409 });
    const never = poolWith(context({ lastCustomerMessageAt: null }));
    expect(await sendIndependentHumanReply(never.pool, input, send, () => NOW)).toMatchObject({ ok: false, code: "window_closed" });
    const edge = poolWith(context({ lastCustomerMessageAt: new Date(NOW - WHATSAPP_REPLY_WINDOW_MS + 1_000) }));
    expect(await sendIndependentHumanReply(edge.pool, input, vi.fn(async () => ({})), () => NOW)).toMatchObject({ ok: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("does not store anything when WhatsApp rejects the message", async () => {
    mocks.addMessage.mockClear();
    const { pool, query } = poolWith(context());
    const send = vi.fn(async () => { throw new Error("Re-engagement message"); });
    expect(await sendIndependentHumanReply(pool, input, send, () => NOW)).toMatchObject({ ok: false, code: "send_failed", status: 502 });
    expect(mocks.addMessage).not.toHaveBeenCalled();
    expect(query.mock.calls.some(([sql]) => /update public\.conversations/.test(String(sql)))).toBe(false);
  });
});

describe("reactivateIndependentConversation", () => {
  it("hands an escalated conversation back to the agent and leaves a system note", async () => {
    mocks.addMessage.mockClear();
    const query = vi.fn(async () => ({ rows: [{ id: 85, status: "active" }] }));
    const pool = { query } as never;
    expect(await reactivateIndependentConversation(pool, 7, 2, 85)).toEqual({ id: 85, status: "active" });
    expect(String(query.mock.calls[0][0])).toContain("status = 'escalated'");
    expect(mocks.addMessage).toHaveBeenCalledWith(pool, 85, "system", expect.stringContaining("الوكيل الآلي"));
  });

  it("does nothing when the conversation is not escalated", async () => {
    mocks.addMessage.mockClear();
    const pool = { query: vi.fn(async () => ({ rows: [] })) } as never;
    expect(await reactivateIndependentConversation(pool, 7, 2, 85)).toBeUndefined();
    expect(mocks.addMessage).not.toHaveBeenCalled();
  });
});
