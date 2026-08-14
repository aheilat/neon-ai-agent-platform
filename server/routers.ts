import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  addMessage,
  createAgentForTenant,
  createConversation,
  createKnowledgeItem,
  deleteKnowledgeItem,
  createLead,
  getTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  updateMemberAvailability,
  getTeamInvites,
  createTeamInvite,
  getTeamAssignments,
  setTeamAssignment,
  getTenantNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  savePushSubscription,
  getTenantPushSubscriptions,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  ensureDefaultAgent,
  getAgentAndTenant,
  getPublicAgent,
  getAgentInTenant,
  getConversationWithMessages,
  getKnowledgeForAgent,
  getOrCreateTenant,
  getTenantAgents,
  getTenantConversations,
  getTenantStats,
  listChannelIntegrations,
  markConversationStatus,
  updateAgentInTenant,
  upsertChannelIntegration,
} from "./db";
import { buildAgentPrompt, containsEscalationKeyword, createAssistantReply, fallbackReply, normalizeLlmContent, toSafeAgentSettings } from "./agentEngine";

const agentInput = z.object({
  name: z.string().min(2).max(255),
  description: z.string().max(1000).optional(),
  persona: z.string().max(5000).optional(),
  tone: z.string().max(50).default("professional"),
  language: z.enum(["ar", "en", "bilingual"]).default("bilingual"),
  decisionRules: z.string().max(5000).optional(),
  fallbackMessage: z.string().max(1000).optional(),
  escalationKeyword: z.string().max(200).optional(),
  status: z.enum(["active", "paused", "draft"]).default("active"),
});

async function workspaceForUser(user: NonNullable<Parameters<typeof getOrCreateTenant>[0]>) {
  const tenant = await getOrCreateTenant(user);
  if (!tenant) throw new Error("Workspace is not available yet");
  return tenant;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  workspace: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      const defaultAgent = await ensureDefaultAgent(tenant.id);
      const [agents, stats, conversations, integrations] = await Promise.all([
        getTenantAgents(tenant.id),
        getTenantStats(tenant.id),
        getTenantConversations(tenant.id),
        listChannelIntegrations(tenant.id),
      ]);
      return {
        tenant,
        defaultAgent: defaultAgent ? toSafeAgentSettings(defaultAgent) : undefined,
        agents: agents.map(toSafeAgentSettings),
        stats,
        conversations,
        integrations,
      };
    }),
  }),

  agents: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      return getTenantAgents(tenant.id);
    }),
    create: protectedProcedure.input(agentInput).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      return createAgentForTenant({ tenantId: tenant.id, ...input });
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), patch: agentInput.partial() })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      return updateAgentInTenant(tenant.id, input.id, input.patch);
    }),
  }),

  knowledge: router({
    list: protectedProcedure.input(z.object({ agentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      const agent = await getAgentInTenant(tenant.id, input.agentId);
      if (!agent) throw new Error("Agent not found in workspace");
      return getKnowledgeForAgent(tenant.id, agent.id);
    }),
    create: protectedProcedure.input(z.object({ agentId: z.number().int().positive(), title: z.string().min(2).max(255), content: z.string().min(10).max(30000), category: z.string().max(100).default("FAQ") })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      const agent = await getAgentInTenant(tenant.id, input.agentId);
      if (!agent) throw new Error("Agent not found in workspace");
      return createKnowledgeItem({ tenantId: tenant.id, agentId: agent.id, title: input.title, content: input.content, category: input.category });
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await deleteKnowledgeItem(tenant.id, input.id);
      return { success: true };
    }),
  }),

  conversations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      return getTenantConversations(tenant.id);
    }),
    detail: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      return getConversationWithMessages(tenant.id, input.id);
    }),
    setStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["active", "escalated", "resolved"]) })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await markConversationStatus(tenant.id, input.id, input.status);
      return { success: true };
    }),
  }),

  analytics: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      return getTenantStats(tenant.id);
    }),
  }),

  channels: router({
    list: protectedProcedure.input(z.object({ agentId: z.number().int().positive().optional() }).optional()).query(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      return listChannelIntegrations(tenant.id, input?.agentId);
    }),
    configure: protectedProcedure.input(z.object({ agentId: z.number().int().positive(), channel: z.enum(["whatsapp", "messenger", "instagram", "phone", "web"]), isActive: z.boolean(), configJson: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      const agent = await getAgentInTenant(tenant.id, input.agentId);
      if (!agent) throw new Error("Agent not found in workspace");
      return upsertChannelIntegration({ tenantId: tenant.id, agentId: input.agentId, channel: input.channel, isActive: input.isActive ? 1 : 0, configJson: input.configJson });
    }),
  }),

  chat: router({
    reply: protectedProcedure.input(z.object({
      agentId: z.number().int().positive(),
      conversationId: z.number().int().positive().optional(),
      message: z.string().min(1).max(5000),
      channel: z.enum(["web", "whatsapp", "messenger", "instagram", "phone"]).default("web"),
      customerName: z.string().max(255).optional(),
      customerEmail: z.string().email().max(320).optional(),
      customerPhone: z.string().max(50).optional(),
    })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      const agent = await getAgentInTenant(tenant.id, input.agentId);
      if (!agent) throw new Error("Agent not found in workspace");
      if (agent.status !== "active") return { ...fallbackReply(agent), conversationId: input.conversationId ?? null };

      let conversationId = input.conversationId;
      let history = input.conversationId ? await getConversationWithMessages(tenant.id, input.conversationId) : undefined;
      if (conversationId && !history) throw new Error("Conversation not found in workspace");
      if (!conversationId) {
        const conversation = await createConversation({
          tenantId: tenant.id,
          agentId: agent.id,
          channel: input.channel,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          status: "active",
        });
        if (!conversation) throw new Error("Conversation could not be created");
        conversationId = conversation.id;
        history = { conversation, messages: [] };
      }

      await addMessage({ conversationId, sender: "customer", content: input.message });
      const escalated = containsEscalationKeyword(input.message, agent.escalationKeyword);
      if (escalated) {
        const reply = fallbackReply(agent);
        await addMessage({ conversationId, sender: "agent", content: reply.content });
        await markConversationStatus(tenant.id, conversationId, "escalated");
        return { ...reply, conversationId };
      }

      const knowledge = await getKnowledgeForAgent(tenant.id, agent.id);
      const prompt = buildAgentPrompt(agent, knowledge, input.message);
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "أنت وكيل خدمة عملاء متعدد اللغات. كن دقيقاً، لا تختلق معلومات، ووجّه العميل إلى خطوة عملية." },
            ...(history?.messages.slice(-8).map(item => ({ role: item.sender === "customer" ? "user" as const : "assistant" as const, content: item.content })) ?? []),
            { role: "user", content: prompt },
          ],
        });
        const content = normalizeLlmContent(response.choices?.[0]?.message?.content);
        const reply = createAssistantReply(content);
        await addMessage({ conversationId, sender: "agent", content: reply.content });
        return { ...reply, conversationId };
      } catch (error) {
        console.error("[AI Agent] LLM request failed", error);
        const reply = createAssistantReply(agent.fallbackMessage || "حالياً ما قدرت أوصل للمحرك الذكي. خلّني أحوّلك للفريق.", true);
        await addMessage({ conversationId, sender: "agent", content: reply.content });
        await markConversationStatus(tenant.id, conversationId, "escalated");
        return { ...reply, conversationId };
      }
    }),
    publicReply: publicProcedure.input(z.object({
      agentId: z.number().int().positive(),
      conversationId: z.number().int().positive().optional(),
      message: z.string().min(1).max(5000),
      customerName: z.string().max(255).optional(),
      customerEmail: z.string().email().max(320).optional(),
      customerPhone: z.string().max(50).optional(),
    })).mutation(async ({ input }) => {
      const agent = await getPublicAgent(input.agentId);
      if (!agent) throw new Error("Agent not found");
      let conversationId = input.conversationId;
      let history = input.conversationId ? await getConversationWithMessages(agent.tenantId, input.conversationId) : undefined;
      if (conversationId && !history) throw new Error("Conversation not found");
      if (!conversationId) {
        const conversation = await createConversation({ tenantId: agent.tenantId, agentId: agent.id, channel: "web", customerName: input.customerName, customerEmail: input.customerEmail, customerPhone: input.customerPhone, status: "active" });
        if (!conversation) throw new Error("Conversation could not be created");
        conversationId = conversation.id;
        history = { conversation, messages: [] };
      }
      await addMessage({ conversationId, sender: "customer", content: input.message });
      if (input.customerName || input.customerEmail || input.customerPhone) {
        await createLead({ tenantId: agent.tenantId, agentId: agent.id, conversationId, name: input.customerName || "زائر مهتم", email: input.customerEmail, phone: input.customerPhone, notes: input.message });
      }
      if (containsEscalationKeyword(input.message, agent.escalationKeyword)) {
        const reply = fallbackReply(agent);
        await addMessage({ conversationId, sender: "agent", content: reply.content });
        await markConversationStatus(agent.tenantId, conversationId, "escalated");
        await createNotification({
          tenantId: agent.tenantId,
          title: `تصعيد محادثة جديدة (${agent.name})`,
          message: `طلب العميل التحدث لموظف في المحادثة #${conversationId}. يرجى المراجعة والتدخل.`,
          type: "escalation",
        });
        return { ...reply, conversationId };
      }
      try {
        const knowledge = await getKnowledgeForAgent(agent.tenantId, agent.id);
        const response = await invokeLLM({ messages: [{ role: "system", content: "أنت وكيل خدمة عملاء متعدد اللغات. لا تخترع معلومات، واكتب رداً مفيداً." }, ...(history?.messages.slice(-8).map(item => ({ role: item.sender === "customer" ? "user" as const : "assistant" as const, content: item.content })) ?? []), { role: "user", content: buildAgentPrompt(agent, knowledge, input.message) }] });
        const reply = createAssistantReply(normalizeLlmContent(response.choices?.[0]?.message?.content));
        await addMessage({ conversationId, sender: "agent", content: reply.content });
        return { ...reply, conversationId };
      } catch (error) {
        console.error("[Public Widget] LLM request failed", error);
        const reply = createAssistantReply(agent.fallbackMessage || "أقدر أساعدك أكثر إذا شاركتني تفاصيل إضافية.", true);
        await addMessage({ conversationId, sender: "agent", content: reply.content });
        return { ...reply, conversationId };
      }
    }),
  }),

  team: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      const members = await getTeamMembers(tenant.id);
      const invites = await getTeamInvites(tenant.id);
      const assignments = await getTeamAssignments(tenant.id);
      return { members, invites, assignments };
    }),
    invite: protectedProcedure.input(z.object({ email: z.string().email(), role: z.enum(["admin", "agent", "viewer"]).default("agent") })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      const invite = await createTeamInvite({ tenantId: tenant.id, email: input.email, role: input.role });
      const name = input.email.split("@")[0];
      await addTeamMember({ tenantId: tenant.id, name: name.charAt(0).toUpperCase() + name.slice(1), email: input.email, role: input.role });
      return { success: true, invite };
    }),
    updateRole: protectedProcedure.input(z.object({ memberId: z.number().int().positive(), role: z.enum(["admin", "agent", "viewer", "owner"]) })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await updateTeamMemberRole(tenant.id, input.memberId, input.role);
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ memberId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await removeTeamMember(tenant.id, input.memberId);
      return { success: true };
    }),
    setAvailability: protectedProcedure.input(z.object({ memberId: z.number().int().positive(), availability: z.enum(["online", "offline", "busy"]) })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await updateMemberAvailability(tenant.id, input.memberId, input.availability);
      return { success: true };
    }),
    setAssignment: protectedProcedure.input(z.object({ memberId: z.number().int().positive(), targetType: z.enum(["agent", "channel"]), targetId: z.string(), assign: z.boolean() })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await setTeamAssignment({ tenantId: tenant.id, memberId: input.memberId, targetType: input.targetType, targetId: input.targetId, assign: input.assign });
      return { success: true };
    }),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      return getTenantNotifications(tenant.id);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await markNotificationRead(tenant.id, input.id);
      return { success: true };
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      await markAllNotificationsRead(tenant.id);
      return { success: true };
    }),
    subscribe: protectedProcedure.input(z.object({
      endpoint: z.string(),
      keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
      }),
    })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await savePushSubscription({
        tenantId: tenant.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      });
      return { success: true };
    }),
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await workspaceForUser(ctx.user);
      return getUserNotificationPreferences(tenant.id, ctx.user.id);
    }),
    updatePreferences: protectedProcedure.input(z.object({
      escalationPush: z.boolean(),
      assignmentPush: z.boolean(),
      leadPush: z.boolean(),
      generalPush: z.boolean(),
    })).mutation(async ({ ctx, input }) => {
      const tenant = await workspaceForUser(ctx.user);
      await updateUserNotificationPreferences({
        tenantId: tenant.id,
        userId: ctx.user.id,
        escalationPush: input.escalationPush ? 1 : 0,
        assignmentPush: input.assignmentPush ? 1 : 0,
        leadPush: input.leadPush ? 1 : 0,
        generalPush: input.generalPush ? 1 : 0,
      });
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
