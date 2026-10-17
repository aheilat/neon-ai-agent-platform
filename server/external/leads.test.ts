import { describe, expect, it, vi } from "vitest";
import { extractContactFromText, captureLeadFromWidgetMessage, captureLeadFromWhatsAppConversation } from "./leadCapture";
import { ensureConversationLead, listIndependentLeads, updateIndependentLead } from "./leadRepository";

describe("extractContactFromText", () => {
  it("finds phone and email, including Arabic-Indic digits", () => {
    expect(extractContactFromText("رقمي ٠٧٩٦٤٤٠٦٨٤ وايميلي Ahmed@Example.com")).toEqual({ phone: "079644068" + "4", email: "ahmed@example.com" });
  });
  it("keeps the plus sign of international numbers", () => {
    expect(extractContactFromText("call +962 79 644 0684 please").phone).toBe("+962796440684");
  });
  it("ignores short numbers, repeated digits and plain text", () => {
    expect(extractContactFromText("I want 3 items for 1500").phone).toBeUndefined();
    expect(extractContactFromText("00000000").phone).toBeUndefined();
    expect(extractContactFromText("مرحبا كيف حالك")).toEqual({ phone: undefined, email: undefined });
  });
});

describe("leadRepository", () => {
  it("lists leads scoped by tenant and agent with filters and counts", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("group by status")) return { rows: [{ status: "new", count: "2" }] };
      if (sql.includes("count(*)")) return { rows: [{ count: "2" }] };
      return { rows: [{ id: 1 }, { id: 2 }] };
    });
    const result = await listIndependentLeads({ query } as any, 7, 2, { status: "new", search: "50%_x", limit: 500, offset: -5 });
    expect(result).toMatchObject({ total: 2, limit: 100, offset: 0, statusCounts: { new: 2, contacted: 0, qualified: 0, closed: 0 } });
    const listCall = query.mock.calls.find(call => (call[0] as string).includes("order by"))!;
    expect(listCall[1]).toEqual([7, 2, "new", "%50\\%\\_x%", 100, 0]);
  });

  it("updates only inside the tenant and agent, and can clear notes", async () => {
    const query = vi.fn(async () => ({ rows: [{ id: 5, status: "contacted" }] }));
    const lead = await updateIndependentLead({ query } as any, 7, 2, 5, { status: "contacted", notes: null });
    expect(lead).toMatchObject({ id: 5 });
    expect(query.mock.calls[0][1]).toEqual([5, 7, 2, "contacted", true, null]);
    expect(query.mock.calls[0][0]).toContain('"tenantId" = $2');
  });

  it("fills an existing conversation lead instead of inserting a duplicate", async () => {
    const query = vi.fn(async (sql: string) => (sql.startsWith("update") ? { rows: [{ id: 9 }] } : { rows: [] }));
    const result = await ensureConversationLead({ query } as any, { tenantId: 7, agentId: 2, conversationId: 3, name: "A", phone: "1", email: null });
    expect(result).toEqual({ id: 9, created: false });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("inserts once per conversation when none exists", async () => {
    const query = vi.fn(async (sql: string) => (sql.startsWith("update") ? { rows: [] } : { rows: [{ id: 11 }] }));
    const result = await ensureConversationLead({ query } as any, { tenantId: 7, agentId: 2, conversationId: 3, name: "A", phone: "1", email: null });
    expect(result).toEqual({ id: 11, created: true });
    expect(query.mock.calls[1][0]).toContain("where not exists");
  });
});

describe("lead capture", () => {
  it("creates a widget lead only when a contact is shared", async () => {
    const query = vi.fn(async (sql: string) => (sql.startsWith("update") ? { rows: [] } : { rows: [{ id: 1 }] }));
    await captureLeadFromWidgetMessage({ query } as any, { tenantId: 7, agentId: 2, conversationId: 3, message: "مرحبا" });
    expect(query).not.toHaveBeenCalled();
    await captureLeadFromWidgetMessage({ query } as any, { tenantId: 7, agentId: 2, conversationId: 3, message: "تواصلوا معي على a@b.com" });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("never throws when the database fails", async () => {
    const query = vi.fn(async () => { throw new Error("db down"); });
    await expect(captureLeadFromWidgetMessage({ query } as any, { tenantId: 7, agentId: 2, conversationId: 3, message: "a@b.com" })).resolves.toBeUndefined();
    await expect(captureLeadFromWhatsAppConversation({ query } as any, { tenantId: 7, agentId: 2, conversationId: 3, senderPhone: "96279", message: "hi" })).resolves.toBeUndefined();
  });

  it("uses the WhatsApp profile name and sender phone for the lead", async () => {
    const query = vi.fn(async (sql: string) => (sql.startsWith("update") ? { rows: [] } : { rows: [{ id: 1 }] }));
    await captureLeadFromWhatsAppConversation({ query } as any, { tenantId: 7, agentId: 2, conversationId: 3, senderPhone: "96279000000", customerName: "Sara", message: "hi" });
    expect(query.mock.calls[1][1]).toEqual([3, 7, 2, "Sara", null, "96279000000", null]);
  });
});
