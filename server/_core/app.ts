import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { sdk } from "./sdk";
import { getAgentBySyncTaskUid, getLastWebsiteSnapshot, createWebsiteSnapshot, updateAgentInTenant, replaceWebsiteKnowledge, createNotification, getEmbeddedBusinessTokenForPhoneNumberId } from "../db";
import { analyzeWebsite, detectAnalysisChanges } from "../websiteAnalyzer";
import { createContext } from "./context";
import { extractWhatsAppInboundMessages, sendWhatsAppText, verifyWhatsAppSignature, verifyWhatsAppWebhook } from "../whatsappService";
import { processWhatsAppInboundMessage } from "../whatsappInbound";
import { getIndependentRuntimeHealth } from "../external/health";

/**
 * Creates Neon’s HTTP application without binding a port.
 *
 * The managed runtime invokes this application from `index.ts`; Vercel invokes
 * the same application through `api/[...path].ts`. Keeping routing in one
 * place prevents drift between the two deployment targets.
 */
export async function createNeonApp() {
  const app = express();

  app.get("/api/health", async (_req, res) => {
    const health = await getIndependentRuntimeHealth();
    return res.status(health.ok ? 200 : 503).json(health);
  });

  app.get("/api/webhooks/whatsapp", (req, res) => {
    const challenge = verifyWhatsAppWebhook(req.query as Record<string, string | string[] | undefined>, process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN);
    if (!challenge) return res.status(403).json({ error: "Webhook verification failed" });
    return res.status(200).send(challenge);
  });

  app.post("/api/webhooks/whatsapp", express.raw({ type: "application/json", limit: "3mb" }), (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    if (!verifyWhatsAppSignature(rawBody, req.get("x-hub-signature-256") || undefined, process.env.WHATSAPP_APP_SECRET)) {
      console.warn("[WhatsApp Webhook] Rejected event with an invalid signature");
      return res.status(401).json({ error: "Invalid WhatsApp signature" });
    }
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }
    const incomingMessages = extractWhatsAppInboundMessages(payload);
    console.info("[WhatsApp Webhook] Accepted event", { incomingMessageCount: incomingMessages.length });
    res.status(200).send("EVENT_RECEIVED");
    for (const message of incomingMessages) {
      void processWhatsAppInboundMessage(message).then(async result => {
        console.info("[WhatsApp Webhook] Processing result", {
          accepted: result.accepted,
          reason: "reason" in result ? result.reason : undefined,
          hasReply: "reply" in result && Boolean(result.reply),
          handoff: "handoff" in result && Boolean(result.handoff),
        });
        if (result.accepted && result.reply) {
          try {
            const customerBusinessToken = await getEmbeddedBusinessTokenForPhoneNumberId(message.phoneNumberId);
            await sendWhatsAppText({ phoneNumberId: message.phoneNumberId, to: message.senderPhone, body: result.reply, accessToken: customerBusinessToken });
            console.info("[WhatsApp Webhook] Automated reply sent");
          } catch (error) {
            console.error("[WhatsApp Webhook] Failed to send automated reply", error);
          }
        }
      }).catch(error => console.error("[WhatsApp Webhook] Failed to process message", error));
    }
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.post("/api/scheduled/websiteSync", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only endpoint" });
      const agent = await getAgentBySyncTaskUid(user.taskUid);
      if (!agent || !agent.sourceWebsiteUrl) return res.json({ ok: true, skipped: "orphan-or-no-url" });

      const result = await analyzeWebsite(agent.sourceWebsiteUrl);
      const sourcePages = result.pages.map(page => ({ url: page.url, title: page.title }));
      const sourceMap = new Map(sourcePages.map(page => [page.url.replace(/\/$/, ""), page]));
      const defaultSource = sourcePages[0];
      const knowledgeItems = [
        ...result.analysis.services.map(service => {
          const source = sourceMap.get(service.sourceUrl.replace(/\/$/, ""));
          if (!source) throw new Error("تعذر التحقق من مصدر إحدى الخدمات المستخرجة.");
          return { title: service.name, content: service.description, category: "Website service", sourceUrl: source.url, sourceTitle: source.title };
        }),
        ...result.analysis.faqs.map(faq => {
          const source = sourceMap.get(faq.sourceUrl.replace(/\/$/, ""));
          if (!source) throw new Error("تعذر التحقق من مصدر أحد الأسئلة المستخرجة.");
          return { title: `FAQ: ${faq.question}`.slice(0, 255), content: faq.answer, category: "Website FAQ", sourceUrl: source.url, sourceTitle: source.title };
        }),
      ];
      if (!knowledgeItems.length && defaultSource) {
        knowledgeItems.push({ title: "ملخص النشاط من الموقع", content: result.analysis.businessSummary, category: "Website summary", sourceUrl: defaultSource.url, sourceTitle: defaultSource.title });
      }

      const lastSnap = await getLastWebsiteSnapshot(agent.tenantId, agent.id);
      let changesDetected = 0;
      let changesSummary = "مزامنة دورية أولية للموقع.";
      if (lastSnap) {
        try {
          const diff = detectAnalysisChanges(JSON.parse(lastSnap.analysisJson), result.analysis);
          changesDetected = diff.hasChanges ? 1 : 0;
          changesSummary = diff.summary;
        } catch {
          // A corrupted historic snapshot must not prevent the next successful sync.
        }
      }

      await createWebsiteSnapshot({ tenantId: agent.tenantId, agentId: agent.id, websiteUrl: result.websiteUrl, analysisJson: JSON.stringify(result.analysis), changesDetected, changesSummary });
      if (changesDetected) {
        await createNotification({ tenantId: agent.tenantId, title: `تحديث مرصود في موقع ${agent.name}`, message: changesSummary, type: "general" });
      }
      await updateAgentInTenant(agent.tenantId, agent.id, {
        description: result.analysis.businessSummary,
        persona: result.analysis.persona,
        tone: result.analysis.tone,
        language: result.analysis.language,
        decisionRules: result.analysis.guardrails.join(" "),
        lastWebsiteSyncAt: new Date(),
      });
      await replaceWebsiteKnowledge({ tenantId: agent.tenantId, agentId: agent.id, items: knowledgeItems });
      return res.json({ ok: true, changesDetected, changesSummary });
    } catch (error: any) {
      console.error("[WebsiteSync Cron Error]:", error);
      return res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app;
}
