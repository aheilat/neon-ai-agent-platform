import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generate: vi.fn(async () => ({ content: "أهلاً، كيف يمكنني مساعدتك؟", model: "claude-haiku-4-5" })),
  addMessage: vi.fn(async () => undefined),
  getIntegration: vi.fn(),
  getAgent: vi.fn(),
  createConversation: vi.fn(async () => ({ id: 9, status: "active" })),
  createNotification: vi.fn(async () => undefined),
  markConversationStatus: vi.fn(async () => undefined),
  fetchMediaUrl: vi.fn(async () => ({ url: "https://graph.facebook.com/media-1", mimeType: "audio/ogg" })),
  transcribe: vi.fn(async () => ({ task: "transcribe", language: "ar", duration: 3, text: "أحتاج شاحنة مبردة", segments: [] })),
}));

vi.mock("./chatService", () => ({ generateFastChatReply: mocks.generate }));
vi.mock("./_core/voiceTranscription", () => ({ transcribeAudio: mocks.transcribe }));
vi.mock("./whatsappService", async (importActual) => ({
  ...(await importActual<typeof import("./whatsappService")>()),
  fetchWhatsAppMediaUrl: mocks.fetchMediaUrl,
}));
vi.mock("./db", () => ({
  getWhatsAppIntegrationByPhoneNumberId: mocks.getIntegration,
  getAgentInTenant: mocks.getAgent,
  markWhatsAppIntegrationLive: vi.fn(async () => undefined),
  findLatestChannelConversation: vi.fn(async () => undefined),
  createConversation: mocks.createConversation,
  addMessage: mocks.addMessage,
  createLead: vi.fn(async () => undefined),
  createNotification: mocks.createNotification,
  getKnowledgeForAgent: vi.fn(async () => []),
  markConversationStatus: mocks.markConversationStatus,
}));

import { processWhatsAppInboundMessage } from "./whatsappInbound";

describe("WhatsApp inbound routing", () => {
  const message = { phoneNumberId: "phone-id", senderPhone: "+96875192909", customerName: "عبدالله", content: "أريد شاحنة مبردة", messageId: "wamid.test", timestamp: new Date() };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getIntegration.mockResolvedValue({ id: 3, tenantId: 1, agentId: 2 });
    mocks.getAgent.mockResolvedValue({ id: 2, tenantId: 1, name: "Oman Drive", status: "active", llmModel: "auto", persona: "مساعد", tone: "professional", language: "ar", decisionRules: "أجب بدقة", fallbackMessage: "الفريق متاح", escalationKeyword: "موظف" });
  });

  it("accepts an inbound message and uses the shared fast model router", async () => {
    const result = await processWhatsAppInboundMessage(message);

    expect(mocks.generate).toHaveBeenCalledWith("auto", expect.any(Array));
    expect(result).toMatchObject({ accepted: true, conversationId: 9, reply: "أهلاً، كيف يمكنني مساعدتك؟" });
    expect(mocks.addMessage).toHaveBeenCalledTimes(2);
  });

  it("transcribes a voice message and routes the transcript through the normal pipeline", async () => {
    const voiceMessage = { ...message, content: "[رسالة صوتية قيد التفريغ]", audioMediaId: "media-1" };
    const result = await processWhatsAppInboundMessage(voiceMessage);

    expect(mocks.fetchMediaUrl).toHaveBeenCalledWith({ mediaId: "media-1" });
    expect(mocks.transcribe).toHaveBeenCalledWith(expect.objectContaining({ audioUrl: "https://graph.facebook.com/media-1" }));
    // The LLM prompt is built from the transcript, not the placeholder.
    expect(mocks.generate).toHaveBeenCalledWith("auto", expect.arrayContaining([
      expect.objectContaining({ content: expect.stringContaining("أحتاج شاحنة مبردة") }),
    ]));
    expect(result).toMatchObject({ accepted: true, reply: "أهلاً، كيف يمكنني مساعدتك؟" });
  });

  it("escalates to a human when voice transcription fails, without calling the LLM", async () => {
    mocks.transcribe.mockResolvedValueOnce({ error: "Transcription service request failed", code: "TRANSCRIPTION_FAILED" });
    const voiceMessage = { ...message, content: "[رسالة صوتية قيد التفريغ]", audioMediaId: "media-1" };
    const result = await processWhatsAppInboundMessage(voiceMessage);

    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.markConversationStatus).toHaveBeenCalledWith(1, 9, "escalated");
    expect(mocks.createNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "escalation", title: expect.stringContaining("رسالة صوتية") }));
    expect(result).toMatchObject({ accepted: true, escalated: true });
  });

  it("rejects an unrecognized number without creating a conversation", async () => {
    mocks.getIntegration.mockResolvedValue(undefined);
    const result = await processWhatsAppInboundMessage(message);

    expect(result).toEqual({ accepted: false, reason: "unrecognized_phone_number" });
    expect(mocks.createConversation).not.toHaveBeenCalled();
    expect(mocks.addMessage).not.toHaveBeenCalled();
  });

  it("rejects an inactive agent without creating a conversation", async () => {
    mocks.getAgent.mockResolvedValue({ id: 2, tenantId: 1, status: "paused" });
    const result = await processWhatsAppInboundMessage(message);

    expect(result).toEqual({ accepted: false, reason: "inactive_agent" });
    expect(mocks.createConversation).not.toHaveBeenCalled();
    expect(mocks.addMessage).not.toHaveBeenCalled();
  });
});
