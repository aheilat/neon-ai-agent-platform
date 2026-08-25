import type { Express, Request } from "express";
import {
  addIndependentWorkspaceKnowledge,
  applyIndependentWebsiteProposal,
  createIndependentWorkspaceAgent,
  getIndependentAgentKnowledge,
  getIndependentWorkspaceAgents,
  resolveIndependentWorkspaceSession,
  updateIndependentWorkspaceAgent,
} from "./runtime";
import { generateIndependentAgentReply } from "./chat";
import { assertIndependentAnalysisSources, discoverIndependentWebsiteProposal, independentWebsiteAnalysisSchema } from "./websiteDiscovery";
import { extractKnowledgeFromIndependentImage } from "./claude";
import { getIndependentSupabaseServerClient } from "./supabase";

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

const INDEPENDENT_ATTACHMENT_BUCKET = "neon-agent-attachments";

async function storeIndependentAttachment(input: { tenantId: number; agentId: number; fileName: string; contentType: string; bytes: Uint8Array }) {
  const supabase = getIndependentSupabaseServerClient();
  if (!supabase) throw new Error("storage-unavailable");
  await supabase.storage.createBucket(INDEPENDENT_ATTACHMENT_BUCKET, {
    public: false,
    fileSizeLimit: "5242880",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "text/plain", "text/markdown", "text/csv", "application/json"],
  });
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "attachment";
  const path = `${input.tenantId}/${input.agentId}/${Date.now()}-${safeName}`;
  const { data, error } = await supabase.storage.from(INDEPENDENT_ATTACHMENT_BUCKET).upload(path, input.bytes, { contentType: input.contentType, upsert: false });
  if (error || !data) throw new Error("storage-unavailable");
  return `supabase://${INDEPENDENT_ATTACHMENT_BUCKET}/${data.path}`;
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

  app.post("/api/external/website/analysis", async (req, res) => {
    const websiteUrl = safeWebsiteUrl(req.body?.websiteUrl);
    if (!websiteUrl || req.body?.consent !== true) return res.status(400).json({ error: "A public website URL and consent are required" });
    const session = await resolveIndependentWorkspaceSession(authorizationFromRequest(req.headers));
    if (!session) return res.status(401).json({ error: "Supabase authentication is required" });
    try {
      return res.json(await discoverIndependentWebsiteProposal(websiteUrl));
    } catch (error) {
      return res.status(422).json({ error: error instanceof Error ? error.message : "تعذر تحليل الموقع الآن." });
    }
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

  app.post("/api/external/agents/:agentId/image-knowledge", async (req, res) => {
    const agentId = Number(req.params.agentId);
    const fileName = text(req.body?.fileName, 1, 160);
    const mediaType = text(req.body?.mediaType, 1, 32);
    const dataUrl = text(req.body?.dataUrl, 32, 7_000_000);
    const supportedMediaType = mediaType === "image/jpeg" || mediaType === "image/png" || mediaType === "image/webp" || mediaType === "image/gif" ? mediaType : undefined;
    const match = dataUrl?.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
    if (!Number.isSafeInteger(agentId) || agentId <= 0 || !fileName || !supportedMediaType || !match || match[1] !== supportedMediaType) return res.status(400).json({ error: "A supported image up to 5 MB is required" });
    const session = await resolveIndependentWorkspaceSession(authorizationFromRequest(req.headers));
    if (!session) return res.status(401).json({ error: "Supabase authentication is required" });
    try {
      const bytes = Buffer.from(match[2], "base64");
      if (bytes.byteLength > 5 * 1024 * 1024) return res.status(400).json({ error: "A supported image up to 5 MB is required" });
      const sourceUrl = await storeIndependentAttachment({ tenantId: session.workspace.id, agentId, fileName, contentType: supportedMediaType, bytes });
      const content = await extractKnowledgeFromIndependentImage({ data: match[2], mediaType: supportedMediaType, fileName });
      if (!content) return res.status(422).json({ error: "تعذر استخراج معرفة واضحة من الصورة." });
      const knowledge = await addIndependentWorkspaceKnowledge(authorizationFromRequest(req.headers), agentId, {
        title: `صورة مرفقة: ${fileName}`,
        content,
        category: "Uploaded image",
        sourceUrl,
        sourceTitle: fileName,
      });
      if (knowledge === undefined) return res.status(401).json({ error: "Supabase authentication or independent database configuration is required" });
      if (!knowledge) return res.status(404).json({ error: "Agent not found" });
      return res.status(201).json({ knowledge, extractedText: content });
    } catch (error) {
      console.error("[Independent Image Knowledge] Extraction failed", error instanceof Error ? error.name : "unknown");
      return res.status(503).json({ error: "Independent image analysis is unavailable" });
    }
  });

  app.post("/api/external/agents/:agentId/file-knowledge", async (req, res) => {
    const agentId = Number(req.params.agentId);
    const fileName = text(req.body?.fileName, 1, 160);
    const mediaType = text(req.body?.mediaType, 1, 48);
    const dataUrl = text(req.body?.dataUrl, 32, 7_000_000);
    const supportedMediaType = mediaType === "text/plain" || mediaType === "text/markdown" || mediaType === "text/csv" || mediaType === "application/json" ? mediaType : undefined;
    const match = dataUrl?.match(/^data:(text\/(?:plain|markdown|csv)|application\/json);base64,([A-Za-z0-9+/=]+)$/);
    if (!Number.isSafeInteger(agentId) || agentId <= 0 || !fileName || !supportedMediaType || !match || match[1] !== supportedMediaType) return res.status(400).json({ error: "A supported text file up to 5 MB is required" });
    const session = await resolveIndependentWorkspaceSession(authorizationFromRequest(req.headers));
    if (!session) return res.status(401).json({ error: "Supabase authentication is required" });
    try {
      const bytes = Buffer.from(match[2], "base64");
      if (bytes.byteLength > 5 * 1024 * 1024) return res.status(400).json({ error: "A supported text file up to 5 MB is required" });
      const content = bytes.toString("utf8").trim();
      if (!content) return res.status(422).json({ error: "The file contains no readable text" });
      const sourceUrl = await storeIndependentAttachment({ tenantId: session.workspace.id, agentId, fileName, contentType: supportedMediaType, bytes });
      const knowledge = await addIndependentWorkspaceKnowledge(authorizationFromRequest(req.headers), agentId, {
        title: fileName,
        content: content.slice(0, 16_000),
        category: "Uploaded text",
        sourceUrl,
        sourceTitle: fileName,
      });
      if (knowledge === undefined) return res.status(401).json({ error: "Supabase authentication or independent database configuration is required" });
      if (!knowledge) return res.status(404).json({ error: "Agent not found" });
      return res.status(201).json({ knowledge });
    } catch (error) {
      console.error("[Independent Text Knowledge] Storage failed", error instanceof Error ? error.name : "unknown");
      return res.status(503).json({ error: "Independent attachment storage is unavailable" });
    }
  });

  app.post("/api/external/agents/:agentId/apply-website-proposal", async (req, res) => {
    const agentId = Number(req.params.agentId);
    const websiteUrl = safeWebsiteUrl(req.body?.websiteUrl);
    if (!Number.isSafeInteger(agentId) || agentId <= 0 || !websiteUrl || !Array.isArray(req.body?.pages) || req.body.pages.length < 1 || req.body.pages.length > 5) {
      return res.status(400).json({ error: "A valid website proposal is required" });
    }
    try {
      const pages: Array<{ url: string; title: string; description: string; headings: string[] }> = req.body.pages.map((page: unknown) => {
        if (!page || typeof page !== "object") throw new Error("invalid");
        const candidate = page as Record<string, unknown>;
        if (typeof candidate.url !== "string" || typeof candidate.title !== "string" || typeof candidate.description !== "string" || !Array.isArray(candidate.headings) || !candidate.headings.every((heading) => typeof heading === "string")) throw new Error("invalid");
        return { url: candidate.url, title: candidate.title, description: candidate.description, headings: candidate.headings };
      });
      const analysis = assertIndependentAnalysisSources(independentWebsiteAnalysisSchema.parse(req.body?.analysis), pages);
      const result = await applyIndependentWebsiteProposal(authorizationFromRequest(req.headers), agentId, { websiteUrl, pages, analysis });
      if (result === undefined) return res.status(401).json({ error: "Supabase authentication or independent database configuration is required" });
      if (!result) return res.status(404).json({ error: "Agent not found" });
      return res.status(201).json(result);
    } catch {
      return res.status(400).json({ error: "A valid website proposal is required" });
    }
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
