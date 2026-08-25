import { describe, expect, it, vi } from "vitest";
import { addIndependentImageKnowledge, addIndependentKnowledgeItem, addIndependentTextFileKnowledge, addIndependentWebsiteKnowledge, analyzeIndependentCompanyWebsite, applyIndependentWebsiteProposal, createIndependentHandoffRequest, createIndependentWorkspaceAgent, saveIndependentHandoffContact, updateIndependentAgentProfile } from "./independentSetup";

describe("independent setup requests", () => {
  const profile = {
    name: "وكيل الشركة",
    description: "الرد على الأسئلة",
    persona: "مساعد ودود",
    tone: "friendly" as const,
    language: "bilingual" as const,
    status: "active" as const,
  };

  it("updates only the current agent through the protected independent route", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 7, ...profile }) });
    await updateIndependentAgentProfile("supabase-token", 7, profile, request);

    expect(request).toHaveBeenCalledWith("/api/external/agents/7", {
      method: "PATCH",
      headers: { Authorization: "Bearer supabase-token", "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
  });

  it("creates an additional agent only through the protected independent route", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 8, ...profile }) });
    await createIndependentWorkspaceAgent("supabase-token", profile, request);

    expect(request).toHaveBeenCalledWith("/api/external/agents", {
      method: "POST",
      headers: { Authorization: "Bearer supabase-token", "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
  });

  it("adds approved knowledge through the protected agent route", async () => {
    const item = { title: "الخدمات", content: "نقدم خدمة مخصصة.", category: "business", sourceUrl: "https://example.com/", sourceTitle: "موقع الشركة" };
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 4, ...item }) });
    await addIndependentKnowledgeItem("supabase-token", 7, item, request);

    expect(request).toHaveBeenCalledWith("/api/external/agents/7/knowledge", {
      method: "POST",
      headers: { Authorization: "Bearer supabase-token", "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
  });

  it("analyzes and applies a company website through protected independent routes", async () => {
    const proposal = {
      websiteUrl: "https://example.com/",
      pages: [{ url: "https://example.com/", title: "Example", description: "", headings: [] }],
      analysis: { businessName: "Example", businessSummary: "Summary", industry: "Services", audience: "Customers", language: "bilingual" as const, tone: "friendly" as const, persona: "Helpful", goals: ["questions"], suggestedChannels: ["web"], services: [], faqs: [], guardrails: ["Use sources"] },
    };
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => proposal });
    await analyzeIndependentCompanyWebsite("supabase-token", proposal.websiteUrl, request);
    await applyIndependentWebsiteProposal("supabase-token", proposal, request);

    expect(request.mock.calls[0]?.[0]).toBe("/api/external/website/analysis");
    expect(request.mock.calls[0]?.[1]?.headers.Authorization).toBe("Bearer supabase-token");
    expect(request.mock.calls[1]?.[0]).toBe("/api/external/website/apply-proposal");
    expect(request.mock.calls[1]?.[1]?.body).toBe(JSON.stringify(proposal));
  });

  it("sends an image only to the protected tenant agent knowledge route", async () => {
    const image = { fileName: "services.png", mediaType: "image/png" as const, dataUrl: "data:image/png;base64,aW1hZ2U=" };
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ knowledge: { id: 9 } }) });
    await addIndependentImageKnowledge("supabase-token", 7, image, request);
    expect(request).toHaveBeenCalledWith("/api/external/agents/7/image-knowledge", {
      method: "POST",
      headers: { Authorization: "Bearer supabase-token", "Content-Type": "application/json" },
      body: JSON.stringify(image),
    });
  });

  it("sends a text file only to the protected private-storage route", async () => {
    const file = { fileName: "services.txt", mediaType: "text/plain" as const, dataUrl: "data:text/plain;base64,c2VydmljZXM=" };
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ knowledge: { id: 10 } }) });
    await addIndependentTextFileKnowledge("supabase-token", 7, file, request);
    expect(request).toHaveBeenCalledWith("/api/external/agents/7/file-knowledge", {
      method: "POST",
      headers: { Authorization: "Bearer supabase-token", "Content-Type": "application/json" },
      body: JSON.stringify(file),
    });
  });

  it("uses protected tenant routes for website knowledge and the consented handoff request", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 10 }) });
    await addIndependentWebsiteKnowledge("supabase-token", 7, { websiteUrl: "https://example.com", category: "Website source" }, request);
    await saveIndependentHandoffContact("supabase-token", 7, { name: "فريق المبيعات", phone: "+962700000000", email: "sales@example.com" }, request);
    await createIndependentHandoffRequest("supabase-token", 7, { name: "عبدالله", phone: "+962700000001", email: "", notes: "يريد عرضاً", consent: true }, request);

    expect(request.mock.calls[0]?.[0]).toBe("/api/external/agents/7/website-knowledge");
    expect(request.mock.calls[0]?.[1]?.headers.Authorization).toBe("Bearer supabase-token");
    expect(request.mock.calls[1]?.[0]).toBe("/api/external/agents/7/handoff-contact");
    expect(request.mock.calls[1]?.[1]?.method).toBe("PATCH");
    expect(request.mock.calls[2]?.[0]).toBe("/api/external/agents/7/handoff-requests");
    expect(request.mock.calls[2]?.[1]?.body).toContain('"consent":true');
  });

  it("returns the server-safe setup error", async () => {
    const request = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Agent not found" }) });
    await expect(updateIndependentAgentProfile("supabase-token", 7, profile, request)).rejects.toThrow("Agent not found");
  });
});
