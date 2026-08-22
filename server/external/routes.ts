import type { Express } from "express";
import { getIndependentAgentKnowledge, getIndependentWorkspaceAgents, resolveIndependentWorkspaceSession } from "./runtime";

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
}
