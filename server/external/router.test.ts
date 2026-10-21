import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ addMessage: vi.fn(async () => undefined) }));
vi.mock("./agentRepository", () => ({ addIndependentConversationMessage: mocks.addMessage }));
vi.mock("./claude", () => ({ completeWithIndependentClaude: vi.fn() }));

import { classifyWithAi, detectRoles, parseRoutingConfig, routeIndependentConversation, saveRoutingConfig } from "./router";

const ALL = ["sales", "support", "orders"] as const;
const reception = { id: 2, tenantId: 7, capabilitiesJson: { routing: { specialists: [{ role: "sales", agentId: 11 }, { role: "support", agentId: 12 }, { role: "orders", agentId: 13 }] } } };

describe("parseRoutingConfig", () => {
  it("keeps valid unique roles and ignores junk", () => {
    expect(parseRoutingConfig(null)).toEqual([]);
    expect(parseRoutingConfig({ routing: "x" })).toEqual([]);
    expect(parseRoutingConfig({ routing: { specialists: [{ role: "sales", agentId: 11 }, { role: "sales", agentId: 12 }, { role: "hacker", agentId: 5 }, { role: "support", agentId: -1 }, { role: "orders", agentId: "13" }] } })).toEqual([
      { role: "sales", agentId: 11 },
      { role: "orders", agentId: 13 },
    ]);
  });
});

describe("detectRoles", () => {
  it.each([
    ["كم سعر الباقة؟", ["sales"]],
    ["ابغى اشترك وعندي سؤال عن الاسعار", ["sales"]],
    ["What is your pricing?", ["sales"]],
    ["عندي مشكلة في الدخول", ["support"]],
    ["الوكيل لا يعمل", ["support"]],
    ["I get an error when I log in", ["support"]],
    ["وين طلبي؟ اريد تتبع الشحنة", ["orders"]],
    ["Where is my order?", ["orders"]],
    ["اريد استرجاع المبلغ", ["orders"]],
  ])("%s", (message, roles) => {
    expect(detectRoles(message, [...ALL])).toEqual(roles);
  });

  it("finds several roles when a message is ambiguous", () => {
    expect(detectRoles("اريد الغاء الاشتراك", [...ALL])).toEqual(["sales", "orders"]);
  });

  it("returns nothing for greetings, short follow-ups and very long text", () => {
    expect(detectRoles("مرحبا", [...ALL])).toEqual([]);
    expect(detectRoles("كم؟", [...ALL])).toEqual([]);
    expect(detectRoles("سعر ".repeat(400), [...ALL])).toEqual([]);
  });

  it("only considers configured roles", () => {
    expect(detectRoles("كم السعر؟ عندي مشكلة", ["support"])).toEqual(["support"]);
    expect(detectRoles("كم السعر", ["support"])).toEqual([]);
  });
});

describe("classifyWithAi", () => {
  it("accepts one candidate and rejects anything else or a failure", async () => {
    expect(await classifyWithAi("x", ["sales", "orders"], vi.fn(async () => " Orders. "))).toBe("orders");
    expect(await classifyWithAi("x", ["sales", "orders"], vi.fn(async () => "support"))).toBeUndefined();
    expect(await classifyWithAi("x", ["sales", "orders"], vi.fn(async () => "none"))).toBeUndefined();
    expect(await classifyWithAi("x", ["sales"], vi.fn(async () => { throw new Error("down"); }))).toBeUndefined();
  });
});

function fakePool(options: { active?: number | null; activeAgents?: number[] } = {}) {
  const query = vi.fn(async (sql: string, params: unknown[]) => {
    if (/from public\.agents/.test(sql)) return { rows: (options.activeAgents ?? [11, 12, 13]).map(id => ({ id, name: `وكيل ${id}` })) };
    if (/select "activeAgentId"/.test(sql)) return { rows: [{ activeAgentId: options.active ?? null }] };
    return { rows: [] };
  });
  return { pool: { query } as never, query };
}

describe("routeIndependentConversation", () => {
  it("does nothing (not even a query) for an agent without a routing table", async () => {
    const { pool, query } = fakePool();
    expect(await routeIndependentConversation(pool, { agent: { id: 2, tenantId: 7, capabilitiesJson: null }, conversationId: 85, message: "كم السعر" })).toEqual({ agentId: 2, switched: false });
    expect(query).not.toHaveBeenCalled();
  });

  it("sends a pricing question to the sales agent and remembers it", async () => {
    mocks.addMessage.mockClear();
    const { pool, query } = fakePool();
    expect(await routeIndependentConversation(pool, { agent: reception, conversationId: 85, message: "كم سعر الباقة؟" })).toEqual({ agentId: 11, switched: true });
    expect(query.mock.calls.some(([sql, params]) => /set "activeAgentId"/.test(String(sql)) && (params as unknown[])[1] === 11)).toBe(true);
    expect(mocks.addMessage).toHaveBeenCalledWith(pool, 85, "system", expect.stringContaining("وكيل 11"));
  });

  it("keeps a follow-up with the current specialist without writing anything", async () => {
    mocks.addMessage.mockClear();
    const { pool, query } = fakePool({ active: 11 });
    expect(await routeIndependentConversation(pool, { agent: reception, conversationId: 85, message: "طيب كم؟" })).toEqual({ agentId: 11, switched: false });
    expect(query.mock.calls.some(([sql]) => /update public\.conversations/.test(String(sql)))).toBe(false);
    expect(mocks.addMessage).not.toHaveBeenCalled();
  });

  it("switches when the topic changes, and a greeting stays with the reception agent when nothing is active", async () => {
    const { pool } = fakePool({ active: 11 });
    expect(await routeIndependentConversation(pool, { agent: reception, conversationId: 85, message: "عندي مشكلة في الدخول" })).toEqual({ agentId: 12, switched: true });
    const fresh = fakePool();
    expect(await routeIndependentConversation(fresh.pool, { agent: reception, conversationId: 86, message: "مرحبا" })).toEqual({ agentId: 2, switched: false });
  });

  it("asks the AI only for an ambiguous message, and falls back to the current agent when it cannot decide", async () => {
    const classify = vi.fn(async () => "orders" as const);
    const { pool } = fakePool();
    expect(await routeIndependentConversation(pool, { agent: reception, conversationId: 85, message: "اريد الغاء الاشتراك", classify })).toEqual({ agentId: 13, switched: true });
    expect(classify).toHaveBeenCalledTimes(1);
    const unsure = fakePool({ active: 12 });
    expect(await routeIndependentConversation(unsure.pool, { agent: reception, conversationId: 85, message: "اريد الغاء الاشتراك", classify: vi.fn(async () => undefined) })).toEqual({ agentId: 12, switched: false });
    const plain = vi.fn();
    await routeIndependentConversation(fakePool().pool, { agent: reception, conversationId: 85, message: "كم السعر", classify: plain });
    expect(plain).not.toHaveBeenCalled();
  });

  it("ignores a specialist that is inactive or missing and falls back to the reception agent", async () => {
    const { pool } = fakePool({ activeAgents: [12] });
    expect(await routeIndependentConversation(pool, { agent: reception, conversationId: 85, message: "كم سعر الباقة؟" })).toEqual({ agentId: 2, switched: false });
    const none = fakePool({ activeAgents: [] });
    expect(await routeIndependentConversation(none.pool, { agent: reception, conversationId: 85, message: "عندي مشكلة" })).toEqual({ agentId: 2, switched: false });
  });

  it("returns to the reception agent on a database failure", async () => {
    const pool = { query: vi.fn(async () => { throw new Error("db down"); }) } as never;
    expect(await routeIndependentConversation(pool, { agent: reception, conversationId: 85, message: "كم السعر" })).toEqual({ agentId: 2, switched: false });
  });
});

describe("saveRoutingConfig", () => {
  const poolFor = (found: number, updated = true) => ({ query: vi.fn(async (sql: string) => (/select id/.test(sql) ? { rows: Array.from({ length: found }, (_, i) => ({ id: i })) } : { rows: updated ? [{ id: 2 }] : [] })) }) as never;

  it("saves valid specialists and clears with an empty list", async () => {
    expect(await saveRoutingConfig(poolFor(2), 7, 2, [{ role: "sales", agentId: 11 }, { role: "support", agentId: 12 }])).toEqual({ ok: true, specialists: [{ role: "sales", agentId: 11 }, { role: "support", agentId: 12 }] });
    expect(await saveRoutingConfig(poolFor(0), 7, 2, [])).toEqual({ ok: true, specialists: [] });
  });

  it("rejects bad shapes, duplicates, the reception agent itself and agents outside the workspace", async () => {
    expect(await saveRoutingConfig(poolFor(0), 7, 2, "x")).toMatchObject({ ok: false, status: 400 });
    expect(await saveRoutingConfig(poolFor(0), 7, 2, [{ role: "boss", agentId: 11 }])).toMatchObject({ ok: false, status: 400 });
    expect(await saveRoutingConfig(poolFor(0), 7, 2, [{ role: "sales", agentId: 11 }, { role: "sales", agentId: 12 }])).toMatchObject({ ok: false, status: 400 });
    expect(await saveRoutingConfig(poolFor(0), 7, 2, [{ role: "sales", agentId: 11 }, { role: "support", agentId: 11 }])).toMatchObject({ ok: false, status: 400 });
    expect(await saveRoutingConfig(poolFor(1), 7, 2, [{ role: "sales", agentId: 2 }])).toMatchObject({ ok: false, status: 400 });
    expect(await saveRoutingConfig(poolFor(0), 7, 2, [{ role: "sales", agentId: 99 }])).toMatchObject({ ok: false, status: 400 });
  });

  it("returns 404 when the reception agent is not in the workspace", async () => {
    expect(await saveRoutingConfig(poolFor(1, false), 7, 2, [{ role: "sales", agentId: 11 }])).toMatchObject({ ok: false, status: 404 });
  });
});
