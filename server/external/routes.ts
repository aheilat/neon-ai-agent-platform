import type { Express, Request } from "express";
import {
  addIndependentWorkspaceKnowledge,
  createIndependentWorkspaceAgent,
  getIndependentAgentKnowledge,
  getIndependentWorkspaceAgents,
  resolveIndependentWorkspaceSession,
  updateIndependentWorkspaceAgent,
} from "./runtime";
import { generateIndependentAgentReply } from "./chat";

function authorizationFromRequest(headers: { authorization?: string | string[] }) {
  const value = headers.authorization;
  return Array.isArray(value) ? value[0] : value;
}

function text(value: unknown, minimum: number, maximum: number) {
  if (typeof value !== "string") return undefined;
  const result = value.trim();
  return result.length >= minimum && result.length <= maximum ? result : undefined;
}

function optionalText(value: unknown, maximum: number) {
  if (value === null || value === undefined || value === "") return null;
  return text(value, 1, maximum);
}

function safeWebsiteUrl(value: unknown) {
  const candidate = optionalText(value, 2_000);
  if (candidate === null) return null;
  if (!candidate) return undefined;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function agentProfile(req: Request) {
  const name = text(req.body?.name, 1, 120);
  const description = optionalText(req.body?.description, 1_200);
  const persona = optionalText(req.body?.persona, 2_000);
  const tone = text(req.body?.tone, 1, 48);
  const language = text(req.body?.language, 1, 24);
  const status = text(req.body?.status, 1, 24);
  if (!name || description === undefined || persona === undefined || !tone || !language || !status) return undefined;
  if (!["friendly", "professional", "direct"].includes(tone)) return undefined;
  if (!["ar", "en", "bilingual"].includes(language)) return undefined;
  if (!["active", "paused", "draft"].includes(status)) return undefined;
  return { name, description, persona, tone, language, status: status as "active" | "paused" | "draft" };
}

/**
 * Narrow external API surface for independent deployments. Every setup write
 * is derived from the verified Supabase session and never accepts a tenant ID
 * from the browser.
 */
export function registerIndependentRuntimeRoutes(app: Express) {
  app.get("/api/external/auth/me", async (req, res) => {
    const session = await resolveIndependentWorkspaceSession(authorizationFromRequest(req.headers));
    if (!session) return res.status(401).json({ error: "Supabase authentication is required" });
    return res.json(session);
  });

  app.get("/api/external/agents", async (req, res) => {
    const result = await getIndependentWorkspaceAgents(authorizationFromRequest(req.headers));
    if (!result) return res.status(401).json({ error: "Supabase authentication or independent database configuration is required" });
    return res.json(result);
  });

  app.post("/api/external/agents", async (req, res) => {
    const profile = agentProfile(req);
    if (!profile) return res.status(400).json({ error: "A valid agent profile is required" });
    const agent = await createIndependentWorkspaceAgent(authorizationFromRequest(req.headers), {
      ...profile,
      llmModel: "claude-haiku-4-5",
      decisionRules: "أجب من المعرفة المعتمدة فقط. إذا كانت المعلومة غير متاحة أو احتاج العميل قراراً بشرياً، اطلب التفاصيل أو صعّد المحادثة.",
      fallbackMessage: "أحتاج تفاصيل إضافية حتى أجيب بدقة، أو أقدر أحوّلك إلى الفريق.",
      escalationKeyword: "موظف,موظفة,human,agent",
      capabilitiesJson: { enabled: ["answer", "qualify", "capture", "escalate"] },
    });
    if (!agent) return res.status(401).json({ error: "Supabase authentication or independent database configuration is required" });
    return res.status(201).json(agent);
  });

  app.patch("/api/external/agents/:agentId", async (req, res) => {
    const agentId = Number(req.params.agentId);
    const profile = agentProfile(req);
    if (!Number.isSafeInteger(agentId) || agentId <= 0 || !profile) return res.status(400).json({ error: "A valid agent profile is required" });
    const agent = await updateIndependentWorkspaceAgent(authorizationFromRequest(req.headers), agentId, profile);
    if (agent === undefined) return res.status(401).json({ error: "Supabase authentication or independent database configuration is required" });
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    return res.json(agent);
  });

  app.get("/api/external/agents/:agentId/knowledge", async (req, res) => {
    const agentId = Number(req.params.agentId);
    if (!Number.isSafeInteger(agentId) || agentId <= 0) return res.status(400).json({ error: "Invalid agent ID" });
    const result = await getIndependentAgentKnowledge(authorizationFromRequest(req.headers), agentId);
    if (!result) return res.status(401).json({ error: "Supabase authentication or independent database configuration is required" });
    return res.json(result);
  });

  app.post("/api/external/agents/:agentId/knowledge", async (req, res) => {
    const agentId = Number(req.params.agentId);
    const title = text(req.body?.title, 1, 160);
    const content = text(req.body?.content, 1, 16_000);
    const category = text(req.body?.category, 1, 64) ?? "business";
    const sourceUrl = safeWebsiteUrl(req.body?.sourceUrl);
    const sourceTitle = optionalText(req.body?.sourceTitle, 160);
    if (!Number.isSafeInteger(agentId) || agentId <= 0 || !title || !content || sourceUrl === undefined || sourceTitle === undefined) {
      return res.status(400).json({ error: "A valid knowledge item is required" });
    }
    const knowledge = await addIndependentWorkspaceKnowledge(authorizationFromRequest(req.headers), agentId, {
      title,
      content,
      category,
      sourceUrl,
      sourceTitle,
    });
    if (knowledge === undefined) return res.status(401).json({ error: "Supabase authentication or independent database configuration is required" });
    if (!knowledge) return res.status(404).json({ error: "Agent not found" });
    return res.status(201).json(knowledge);
  });

  app.post("/api/external/agents/:agentId/chat", async (req, res) => {
    const agentId = Number(req.params.agentId);
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!Number.isSafeInteger(agentId) || agentId <= 0) return res.status(400).json({ error: "Invalid agent ID" });
    if (!message || message.length > 8_000) return res.status(400).json({ error: "A message of up to 8,000 characters is required" });

    try {
      const result = await generateIndependentAgentReply(authorizationFromRequest(req.headers), {
        agentId,
        message,
        history: Array.isArray(req.body?.history) ? req.body.history : undefined,
      });
      if (result.kind === "unauthorized") return res.status(401).json({ error: "Supabase authentication or independent database configuration is required" });
      if (result.kind === "not-found") return res.status(404).json({ error: "Agent not found" });
      return res.json({ reply: result.reply, agentId: result.agentId });
    } catch (error) {
      console.error("[Independent Claude] Chat completion failed", error);
      return res.status(503).json({ error: "Independent AI service is unavailable" });
    }
  });
}
