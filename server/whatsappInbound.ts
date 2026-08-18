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
import type { WhatsAppInboundMessage } from "./whatsappService";

export async function processWhatsAppInboundMessage(input: WhatsAppInboundMessage) {
  const integration = await getWhatsAppIntegrationByPhoneNumberId(input.phoneNumberId);
  if (!integration) return { accepted: false as const, reason: "unrecognized_phone_number" };
  const agent = await getAgentInTenant(integration.tenantId, integration.agentId);
  if (!agent || agent.status !== "active") return { accepted: false as const, reason: "inactive_agent" };

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
