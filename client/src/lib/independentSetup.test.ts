import { describe, expect, it, vi } from "vitest";
import { addIndependentKnowledgeItem, createIndependentWorkspaceAgent, updateIndependentAgentProfile } from "./independentSetup";

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

  it("returns the server-safe setup error", async () => {
    const request = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Agent not found" }) });
    await expect(updateIndependentAgentProfile("supabase-token", 7, profile, request)).rejects.toThrow("Agent not found");
  });
});
