import { createHmac } from "node:crypto";
import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAgent: vi.fn(),
  addMessage: vi.fn(async () => undefined),
  reply: vi.fn(),
  resolveSession: vi.fn(),
  transcribe: vi.fn(),
  fetchMedia: vi.fn(async () => ({ url: "https://graph.facebook.com/m", mimeType: "audio/ogg" })),
  getPool: vi.fn(),
  updateStatus: vi.fn(async () => undefined),
}));

vi.mock("./agentRepository", () => ({ getIndependentAgentInTenant: mocks.getAgent, addIndependentConversationMessage: mocks.addMessage, updateIndependentConversationStatus: mocks.updateStatus }));
vi.mock("./chat", () => ({ generateIndependentAgentReplyForTenant: mocks.reply }));
vi.mock("./runtime", () => ({ resolveIndependentWorkspaceSession: mocks.resolveSession }));
vi.mock("./postgres", () => ({ getIndependentPostgresPool: mocks.getPool }));
vi.mock("../_core/voiceTranscription", () => ({ transcribeAudio: mocks.transcribe }));
vi.mock("../whatsappService", async importActual => ({ ...(await importActual<typeof import("../whatsappService")>()), fetchWhatsAppMediaUrl: mocks.fetchMedia }));

import { processIndependentWhatsAppMessage, registerIndependentWhatsAppRoutes } from "./whatsapp";

function fakePool(options: { integration?: unknown; conversation?: { id: number; status: string } } = {}) {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("from public.channel_integrations")) return { rows: options.integration ? [options.integration] : [] };
    if (sql.includes("select id, status from public.conversations")) return { rows: options.conversation ? [options.conversation] : [] };
    if (sql.includes("insert into public.conversations")) return { rows: [{ id: 50, status: "active" }] };
    if (sql.includes("from public.messages")) return { rows: [] };
    return { rows: [] };
  });
  return { query } as any;
}

let counter = 0;
const message = (over: Record<string, unknown> = {}) => ({ messageId: `wamid.${++counter}`, phoneNumberId: "111222333", senderPhone: "96279000000", content: "مرحبا", ...over });
const integration = { id: 1, tenantId: 7, agentId: 2 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAgent.mockResolvedValue({ id: 2, status: "active" });
  mocks.reply.mockResolvedValue({ kind: "success", reply: "أهلاً بك", agentId: 2 });
});

describe("processIndependentWhatsAppMessage", () => {
  it("ignores numbers that are not registered", async () => {
    const send = vi.fn();
    const result = await processIndependentWhatsAppMessage(message() as any, { getPool: () => fakePool(), send } as any);
    expect(result).toMatchObject({ accepted: false, reason: "unrecognized_phone_number" });
    expect(send).not.toHaveBeenCalled();
  });

  it("answers a text message through the Independent AI and stores both sides", async () => {
    const send = vi.fn(async () => ({}));
    const result = await processIndependentWhatsAppMessage(message() as any, { getPool: () => fakePool({ integration }), send } as any);
    expect(result).toMatchObject({ accepted: true, reply: "أهلاً بك" });
    expect(mocks.reply).toHaveBeenCalledWith(7, expect.objectContaining({ agentId: 2, message: "مرحبا" }));
    expect(mocks.addMessage).toHaveBeenCalledWith(expect.anything(), 50, "customer", "مرحبا");
    expect(mocks.addMessage).toHaveBeenCalledWith(expect.anything(), 50, "agent", "أهلاً بك");
    expect(send).toHaveBeenCalledWith({ phoneNumberId: "111222333", to: "96279000000", body: "أهلاً بك" });
  });

  it("does not auto-reply when a human owns the conversation", async () => {
    const send = vi.fn();
    const result = await processIndependentWhatsAppMessage(message() as any, { getPool: () => fakePool({ integration, conversation: { id: 9, status: "escalated" } }), send } as any);
    expect(result).toMatchObject({ accepted: true, reason: "escalated_to_human" });
    expect(mocks.addMessage).toHaveBeenCalledWith(expect.anything(), 9, "customer", "مرحبا");
    expect(mocks.reply).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  describe("customer asks for a human", () => {
    const agentRow = { id: 2, status: "active", name: "Neon", language: "ar", capabilitiesJson: { handoffContact: { email: "owner@example.com" } } };

    it("escalates, tells the customer, e-mails the owner and does not call the AI", async () => {
      mocks.getAgent.mockResolvedValue(agentRow);
      const send = vi.fn(async () => ({}));
      const notifyEscalation = vi.fn(async () => true);
      const result = await processIndependentWhatsAppMessage(message({ content: "أريد التحدث مع موظف", customerName: "Ahmed" }) as any, { getPool: () => fakePool({ integration }), send, notifyEscalation } as any);
      expect(result).toMatchObject({ accepted: true, reason: "escalated_by_customer_request" });
      expect(mocks.updateStatus).toHaveBeenCalledWith(expect.anything(), 7, 2, 50, "escalated");
      expect(notifyEscalation).toHaveBeenCalledWith(agentRow, { conversationId: 50, channel: "whatsapp", reason: "human_request", customerName: "Ahmed", customerPhone: "96279000000", customerMessage: "أريد التحدث مع موظف" });
      expect(send).toHaveBeenCalledWith({ phoneNumberId: "111222333", to: "96279000000", body: expect.stringContaining("تم تحويل طلبك") });
      expect(mocks.reply).not.toHaveBeenCalled();
      expect(mocks.addMessage).toHaveBeenCalledWith(expect.anything(), 50, "customer", "أريد التحدث مع موظف");
      expect(mocks.addMessage).toHaveBeenCalledWith(expect.anything(), 50, "system", expect.stringContaining("الفريق البشري"));
    });

    it("reports a complaint and a sales request with their own reason", async () => {
      mocks.getAgent.mockResolvedValue(agentRow);
      const notifyEscalation = vi.fn(async () => true);
      const deps = { getPool: () => fakePool({ integration }), send: vi.fn(async () => ({})), notifyEscalation } as any;
      await processIndependentWhatsAppMessage(message({ content: "عندي شكوى على الخدمة" }) as any, deps);
      await processIndependentWhatsAppMessage(message({ content: "حولني لقسم المبيعات" }) as any, deps);
      expect(notifyEscalation.mock.calls.map(call => (call as any[])[1].reason)).toEqual(["complaint", "sales_request"]);
    });

    it("still replies to the customer when the owner e-mail or the acknowledgement fails", async () => {
      mocks.getAgent.mockResolvedValue({ ...agentRow, language: "bilingual" });
      const notifyEscalation = vi.fn(async () => { throw new Error("mail down"); });
      const send = vi.fn(async () => { throw new Error("graph down"); });
      const result = await processIndependentWhatsAppMessage(message({ content: "I want to talk to a human" }) as any, { getPool: () => fakePool({ integration }), send, notifyEscalation } as any);
      expect(result).toMatchObject({ accepted: true, reason: "escalated_by_customer_request" });
      expect(mocks.updateStatus).toHaveBeenCalled();
      expect(send).toHaveBeenCalledWith(expect.objectContaining({ body: expect.stringContaining("passed your request") }));
    });

    it("does not escalate an ordinary question or e-mail twice for an already escalated conversation", async () => {
      mocks.getAgent.mockResolvedValue(agentRow);
      const notifyEscalation = vi.fn(async () => true);
      const send = vi.fn(async () => ({}));
      await processIndependentWhatsAppMessage(message({ content: "ما هي خدمات Neon AI Agents؟" }) as any, { getPool: () => fakePool({ integration }), send, notifyEscalation } as any);
      expect(mocks.updateStatus).not.toHaveBeenCalled();
      expect(notifyEscalation).not.toHaveBeenCalled();
      expect(mocks.reply).toHaveBeenCalledTimes(1);

      const result = await processIndependentWhatsAppMessage(message({ content: "أريد التحدث مع موظف" }) as any, { getPool: () => fakePool({ integration, conversation: { id: 9, status: "escalated" } }), send, notifyEscalation } as any);
      expect(result).toMatchObject({ reason: "escalated_to_human" });
      expect(notifyEscalation).not.toHaveBeenCalled();
    });

    it("escalates from a transcribed voice message but not when the transcript failed", async () => {
      mocks.getAgent.mockResolvedValue(agentRow);
      const notifyEscalation = vi.fn(async () => true);
      const send = vi.fn(async () => ({}));
      mocks.transcribe.mockResolvedValueOnce({ text: "أريد التحدث مع موظف" });
      const voice = await processIndependentWhatsAppMessage(message({ content: "", audioMediaId: "m1" }) as any, { getPool: () => fakePool({ integration }), send, notifyEscalation } as any);
      expect(voice).toMatchObject({ reason: "escalated_by_customer_request" });
      mocks.transcribe.mockResolvedValueOnce({ error: "x" });
      notifyEscalation.mockClear();
      await processIndependentWhatsAppMessage(message({ content: "", audioMediaId: "m2" }) as any, { getPool: () => fakePool({ integration }), send, notifyEscalation } as any);
      expect(notifyEscalation).not.toHaveBeenCalled();
    });
  });

  it("ignores duplicate deliveries of the same message id", async () => {
    const send = vi.fn(async () => ({}));
    const deps = { getPool: () => fakePool({ integration }), send } as any;
    const m = message() as any;
    await processIndependentWhatsAppMessage(m, deps);
    const second = await processIndependentWhatsAppMessage(m, deps);
    expect(second).toMatchObject({ accepted: false, reason: "duplicate_message" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("uses the transcript of a voice message", async () => {
    mocks.transcribe.mockResolvedValue({ text: "أحتاج عرض سعر" });
    const send = vi.fn(async () => ({}));
    await processIndependentWhatsAppMessage(message({ content: "[رسالة صوتية قيد التفريغ]", audioMediaId: "media-1" }) as any, { getPool: () => fakePool({ integration }), send } as any);
    expect(mocks.reply).toHaveBeenCalledWith(7, expect.objectContaining({ message: "أحتاج عرض سعر" }));
  });

  it("asks for text when a voice message cannot be transcribed", async () => {
    mocks.transcribe.mockResolvedValue({ error: "x", code: "SERVICE_ERROR" });
    const send = vi.fn(async () => ({}));
    const result = await processIndependentWhatsAppMessage(message({ content: "[رسالة صوتية قيد التفريغ]", audioMediaId: "media-2" }) as any, { getPool: () => fakePool({ integration }), send } as any);
    expect(result.reply).toContain("كتابةً");
    expect(mocks.reply).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("WhatsApp webhook routes", () => {
  async function serve() {
    const app = express();
    registerIndependentWhatsAppRoutes(app);
    const server = app.listen(0);
    const port = (server.address() as any).port;
    return { base: `http://127.0.0.1:${port}`, close: () => server.close() };
  }

  it("verifies the Meta challenge only with the right token", async () => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "tok";
    const { base, close } = await serve();
    const ok = await fetch(`${base}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=tok&hub.challenge=abc`);
    const bad = await fetch(`${base}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=no&hub.challenge=abc`);
    close();
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("abc");
    expect(bad.status).toBe(403);
  });

  it("rejects an unsigned event and accepts a correctly signed one", async () => {
    process.env.WHATSAPP_APP_SECRET = "secret";
    mocks.getPool.mockReturnValue(undefined);
    const { base, close } = await serve();
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const unsigned = await fetch(`${base}/api/webhooks/whatsapp`, { method: "POST", headers: { "content-type": "application/json" }, body });
    const signature = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;
    const signed = await fetch(`${base}/api/webhooks/whatsapp`, { method: "POST", headers: { "content-type": "application/json", "x-hub-signature-256": signature }, body });
    close();
    expect(unsigned.status).toBe(401);
    expect(signed.status).toBe(200);
  });

  it("requires a signed-in workspace to link a number", async () => {
    mocks.resolveSession.mockResolvedValue(undefined);
    mocks.getPool.mockReturnValue(fakePool());
    const { base, close } = await serve();
    const res = await fetch(`${base}/api/external/agents/2/whatsapp`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phoneNumberId: "111222333" }) });
    close();
    expect(res.status).toBe(401);
  });

  it("links a number to an agent of the caller's workspace", async () => {
    mocks.resolveSession.mockResolvedValue({ workspace: { id: 7 } });
    const pool = fakePool();
    mocks.getPool.mockReturnValue(pool);
    const { base, close } = await serve();
    const res = await fetch(`${base}/api/external/agents/2/whatsapp`, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer t" }, body: JSON.stringify({ phoneNumberId: "111222333" }) });
    close();
    expect(res.status).toBe(200);
    expect(mocks.getAgent).toHaveBeenCalledWith(pool, 7, 2);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("insert into public.channel_integrations"), [7, 2, JSON.stringify({ phoneNumberId: "111222333" })]);
  });
});
