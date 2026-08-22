import type { Express } from "express";
import { getIndependentAgentKnowledge, getIndependentWorkspaceAgents, resolveIndependentWorkspaceSession } from "./runtime";
import { generateIndependentAgentReply } from "./chat";

function authorizationFromRequest(headers: { authorization?: string | string[] }) {
  const value = headers.authorization;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Narrow external API surface for the independent Render runtime. These routes
 * are additive and require a Supabase Bearer token; they never replace the
 * current Manus OAuth/tRPC API while staging is incomplete.
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

  app.get("/api/external/agents/:agentId/knowledge", async (req, res) => {
    const agentId = Number(req.params.agentId);
    if (!Number.isSafeInteger(agentId) || agentId <= 0) return res.status(400).json({ error: "Invalid agent ID" });

    const result = await getIndependentAgentKnowledge(authorizationFromRequest(req.headers), agentId);
    if (!result) return res.status(401).json({ error: "Supabase authentication or independent database configuration is required" });
    return res.json(result);
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
