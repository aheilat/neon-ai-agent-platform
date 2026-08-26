import express from "express";
import { getIndependentRuntimeHealth } from "./health";
import { registerIndependentRuntimeRoutes } from "./routes";
import { independentErrorHandler, installAsyncRouteGuards } from "./asyncHandler";

/**
 * Express application used only by Render/Vercel independent deployments.
 * It intentionally imports neither the Manus OAuth stack nor the managed
 * MySQL/tRPC router, preventing the external runtime from acquiring managed
 * credentials or serving a production webhook by accident.
 */
export async function createIndependentNeonApp() {
  const app = express();
  installAsyncRouteGuards(app);
  app.get("/api/health", async (_req, res) => {
    const health = await getIndependentRuntimeHealth();
    return res.status(health.ok ? 200 : 503).json(health);
  });
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerIndependentRuntimeRoutes(app);
  app.all("/api/*", (_req, res) => {
    return res.status(404).json({ error: "Independent API route not found" });
  });
  app.use(independentErrorHandler);
  return app;
}
