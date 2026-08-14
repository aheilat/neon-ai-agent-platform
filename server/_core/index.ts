import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { sdk } from "./sdk";
import { getAgentBySyncTaskUid, getLastWebsiteSnapshot, createWebsiteSnapshot, updateAgentInTenant, replaceWebsiteKnowledge, createNotification } from "../db";
import { analyzeWebsite, detectAnalysisChanges } from "../websiteAnalyzer";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.post("/api/scheduled/websiteSync", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) {
        return res.status(403).json({ error: "cron-only endpoint" });
      }
      const agent = await getAgentBySyncTaskUid(user.taskUid);
      if (!agent || !agent.sourceWebsiteUrl) {
        return res.json({ ok: true, skipped: "orphan-or-no-url" });
      }

      const result = await analyzeWebsite(agent.sourceWebsiteUrl);
      const sourcePages = result.pages.map(page => ({ url: page.url, title: page.title }));
      const analysis = result.analysis;
      const sourceMap = new Map(sourcePages.map(page => [page.url.replace(/\/$/, ""), page]));
      const defaultSource = sourcePages[0];
      const knowledgeItems = [
        ...analysis.services.map(service => {
          const source = sourceMap.get(service.sourceUrl.replace(/\/$/, ""));
          if (!source) throw new Error("تعذر التحقق من مصدر إحدى الخدمات المستخرجة.");
          return { title: service.name, content: service.description, category: "Website service", sourceUrl: source.url, sourceTitle: source.title };
        }),
        ...analysis.faqs.map(faq => {
          const source = sourceMap.get(faq.sourceUrl.replace(/\/$/, ""));
          if (!source) throw new Error("تعذر التحقق من مصدر أحد الأسئلة المستخرجة.");
          return { title: `FAQ: ${faq.question}`.slice(0, 255), content: faq.answer, category: "Website FAQ", sourceUrl: source.url, sourceTitle: source.title };
        }),
      ];
      if (!knowledgeItems.length && defaultSource) knowledgeItems.push({ title: "ملخص النشاط من الموقع", content: analysis.businessSummary, category: "Website summary", sourceUrl: defaultSource.url, sourceTitle: defaultSource.title });

      const lastSnap = await getLastWebsiteSnapshot(agent.tenantId, agent.id);
      let changesDetected = 0;
      let changesSummary = "مزامنة دورية أولية للموقع.";
      if (lastSnap) {
        try {
          const prevAnalysis = JSON.parse(lastSnap.analysisJson);
          const diff = detectAnalysisChanges(prevAnalysis, analysis);
          changesDetected = diff.hasChanges ? 1 : 0;
          changesSummary = diff.summary;
        } catch {
          // Ignore parse error
        }
      }

      await createWebsiteSnapshot({
        tenantId: agent.tenantId,
        agentId: agent.id,
        websiteUrl: result.websiteUrl,
        analysisJson: JSON.stringify(analysis),
        changesDetected,
        changesSummary,
      });

      if (changesDetected) {
        await createNotification({
          tenantId: agent.tenantId,
          title: `تحديث مرصود في موقع ${agent.name}`,
          message: changesSummary,
          type: "general",
        });
      }

      await updateAgentInTenant(agent.tenantId, agent.id, {
        description: analysis.businessSummary,
        persona: analysis.persona,
        tone: analysis.tone,
        language: analysis.language,
        decisionRules: analysis.guardrails.join(" "),
        lastWebsiteSyncAt: new Date(),
      });
      await replaceWebsiteKnowledge({ tenantId: agent.tenantId, agentId: agent.id, items: knowledgeItems });

      return res.json({ ok: true, changesDetected, changesSummary });
    } catch (error: any) {
      console.error("[WebsiteSync Cron Error]:", error);
      return res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
