import {
  addMessage,
  createConversation,
  createLead,
  createNotification,
  findLatestChannelConversation,
  getAgentInTenant,
  getKnowledgeForAgent,
  getWhatsAppIntegrationByPhoneNumberId,
  markConversationStatus,
  markWhatsAppIntegrationLive,
} from "./db";
import { buildAgentPrompt, containsEscalationKeyword, createAssistantReply, fallbackReply, getReplyLanguageInstruction } from "./agentEngine";
import { generateFastChatReply } from "./chatService";
import { fetchWhatsAppMediaUrl, type WhatsAppInboundMessage } from "./whatsappService";
import { transcribeAudio } from "./_core/voiceTranscription";

// Replaces a voice message's placeholder content with its transcript before any other
// handling (escalation keywords, lead capture, the LLM reply) sees it — so every existing
// code path downstream keeps treating it as ordinary text, unchanged.
async function resolveInboundContent(input: WhatsAppInboundMessage): Promise<{ content: string; transcriptionFailed: boolean }> {
  if (!input.audioMediaId) return { content: input.content, transcriptionFailed: false };
  try {
    const media = await fetchWhatsAppMediaUrl({ mediaId: input.audioMediaId });
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const result = await transcribeAudio({
      audioUrl: media.url,
      authorizationHeader: accessToken ? `Bearer ${accessToken}` : undefined,
    });
    if ("error" in result || !result.text.trim()) {
      console.error("[WhatsApp] Voice transcription failed", "error" in result ? result.code : "empty_transcript");
      return { content: input.content, transcriptionFailed: true };
    }
    return { content: result.text.trim(), transcriptionFailed: false };
  } catch (error) {
    console.error("[WhatsApp] Voice message handling failed", error instanceof Error ? error.message : "unknown");
    return { content: input.content, transcriptionFailed: true };
  }
}

export async function processWhatsAppInboundMessage(rawInput: WhatsAppInboundMessage) {
  const integration = await getWhatsAppIntegrationByPhoneNumberId(rawInput.phoneNumberId);
  if (!integration) return { accepted: false as const, reason: "unrecognized_phone_number" };
  const agent = await getAgentInTenant(integration.tenantId, integration.agentId);
  if (!agent || agent.status !== "active") return { accepted: false as const, reason: "inactive_agent" };

  const { content: resolvedContent, transcriptionFailed } = await resolveInboundContent(rawInput);
  const input = { ...rawInput, content: resolvedContent };

  await markWhatsAppIntegrationLive(integration.id);
  let conversation = await findLatestChannelConversation({
    tenantId: integration.tenantId,
    agentId: agent.id,
    channel: "whatsapp",
    customerPhone: input.senderPhone,
  });
  const isNewConversation = !conversation;
  if (!conversation) {
    conversation = await createConversation({
      tenantId: integration.tenantId,
      agentId: agent.id,
      channel: "whatsapp",
      customerName: input.customerName,
      customerPhone: input.senderPhone,
      status: "active",
    });
  }
  if (!conversation) return { accepted: false as const, reason: "conversation_unavailable" };

  await addMessage({ conversationId: conversation.id, sender: "customer", content: input.content });
  if (isNewConversation) {
    await createLead({
      tenantId: integration.tenantId,
      agentId: agent.id,
      conversationId: conversation.id,
      name: input.customerName || "عميل واتساب",
      phone: input.senderPhone,
      notes: input.content,
    });
  }

  if (transcriptionFailed) {
    const reply = createAssistantReply(agent.fallbackMessage || "استلمت رسالتك الصوتية لكن تعذّر تفريغها آلياً. سيتواصل معك أحد أعضاء الفريق قريباً.", true);
    await addMessage({ conversationId: conversation.id, sender: "agent", content: reply.content });
    await markConversationStatus(integration.tenantId, conversation.id, "escalated");
    await createNotification({
      tenantId: integration.tenantId,
      title: `تصعيد واتساب — رسالة صوتية (${agent.name})`,
      message: `تعذر تفريغ رسالة صوتية من ${input.customerName || input.senderPhone} في المحادثة #${conversation.id}. يرجى الاستماع لها يدوياً عبر واتساب.`,
      type: "escalation",
    });
    return { accepted: true as const, conversationId: conversation.id, reply: reply.content, escalated: true as const };
  }

  if (conversation.status === "escalated") {
    await createNotification({
      tenantId: integration.tenantId,
      title: `رسالة متابعة عبر واتساب (${agent.name})`,
      message: `${input.customerName || input.senderPhone} أرسل رسالة جديدة في محادثة مصعّدة #${conversation.id}.`,
      type: "escalation",
    });
    return { accepted: true as const, conversationId: conversation.id, handoff: true as const };
  }

  if (containsEscalationKeyword(input.content, agent.escalationKeyword)) {
    const reply = fallbackReply(agent);
    await addMessage({ conversationId: conversation.id, sender: "agent", content: reply.content });
    await markConversationStatus(integration.tenantId, conversation.id, "escalated");
    await createNotification({
      tenantId: integration.tenantId,
      title: `تصعيد واتساب جديد (${agent.name})`,
      message: `${input.customerName || input.senderPhone} طلب التواصل مع الفريق في المحادثة #${conversation.id}.`,
      type: "escalation",
    });
    return { accepted: true as const, conversationId: conversation.id, reply: reply.content, escalated: true as const };
  }

  try {
    const knowledge = await getKnowledgeForAgent(integration.tenantId, agent.id);
    const generated = await generateFastChatReply(agent.llmModel, [
      { role: "system", content: "أنت وكيل خدمة عملاء عبر واتساب. استخدم فقط المعرفة الرسمية المتاحة، واكتب جواباً واضحاً ومختصراً." },
      { role: "system", content: getReplyLanguageInstruction(agent, input.content) },
      { role: "user", content: buildAgentPrompt(agent, knowledge, input.content) },
    ]);
    const reply = createAssistantReply(generated.content);
    await addMessage({ conversationId: conversation.id, sender: "agent", content: reply.content });
    return { accepted: true as const, conversationId: conversation.id, reply: reply.content };
  } catch (error) {
    console.error("[WhatsApp] LLM request failed", error);
    const reply = createAssistantReply(agent.fallbackMessage || "وصلتني رسالتك. سيتواصل معك أحد أعضاء الفريق قريباً.", true);
    await addMessage({ conversationId: conversation.id, sender: "agent", content: reply.content });
    await markConversationStatus(integration.tenantId, conversation.id, "escalated");
    await createNotification({
      tenantId: integration.tenantId,
      title: `تصعيد واتساب تلقائي (${agent.name})`,
      message: `تعذر توليد رد آلي للمحادثة #${conversation.id}. يرجى متابعة العميل ${input.customerName || input.senderPhone}.`,
      type: "escalation",
    });
    return { accepted: true as const, conversationId: conversation.id, reply: reply.content, escalated: true as const };
  }
}
