import { describe, expect, it, vi } from "vitest";
import { listIndependentLeads, updateIndependentLead } from "./independentSetup";

describe("independent leads requests", () => {
  it("lists leads with encoded filters and the bearer token", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ leads: [], total: 0, statusCounts: {}, limit: 25, offset: 0 }) });
    await listIndependentLeads("token", 2, { status: "new", search: " سارة & co ", limit: 25, offset: 50 }, request as never);
    expect(request).toHaveBeenCalledWith(
      "/api/external/agents/2/leads?status=new&search=%D8%B3%D8%A7%D8%B1%D8%A9+%26+co&limit=25&offset=50",
      expect.objectContaining({ method: "GET", headers: expect.objectContaining({ Authorization: "Bearer token" }) }),
    );
  });

  it("omits empty filters", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ leads: [] }) });
    await listIndependentLeads("token", 2, { status: "", search: "  " }, request as never);
    expect(request.mock.calls[0][0]).toBe("/api/external/agents/2/leads");
  });

  it("patches one lead and surfaces server errors", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ lead: { id: 5, status: "closed" } }) });
    await updateIndependentLead("token", 2, 5, { status: "closed", notes: null }, request as never);
    expect(request).toHaveBeenCalledWith("/api/external/agents/2/leads/5", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "closed", notes: null }) }));
    const failing = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Lead not found" }) });
    await expect(updateIndependentLead("token", 2, 9, { status: "new" }, failing as never)).rejects.toThrow();
  });
});
