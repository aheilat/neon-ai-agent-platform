import { and, desc, eq, count, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Agent,
  InsertAgent,
  InsertConversation,
  InsertKnowledgeBaseItem,
  InsertMessage,
  InsertTenant,
  agents,
  channelIntegrations,
  whatsappEmbeddedCredentials,
  conversations,
  knowledgeBase,
  leads,
  messages,
  teamMembers,
  teamInvites,
  teamMemberAssignments,
  workspaceNotifications,
  pushSubscriptions,
  notificationPreferences,
  onboardingDrafts,
  tenants,
  users,
  websiteSnapshots,
  tenantDataPolicies,
  User,
  InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { decryptBusinessToken } from "./metaEmbeddedSignup";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function getTenantDataPolicy(tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(tenantDataPolicies).where(eq(tenantDataPolicies.tenantId, tenantId)).limit(1);
  return rows[0];
}

export async function upsertTenantDataPolicy(input: {
  tenantId: number;
  retentionDays: number;
  requireConsent: boolean;
  allowModelTraining: boolean;
  sectorProfile: "general" | "healthcare" | "financial" | "legal";
  minimizeSensitiveData: boolean;
  requireSensitiveHumanReview: boolean;
  deletionContactEmail?: string | null;
}) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(tenantDataPolicies).values({
    tenantId: input.tenantId,
    retentionDays: input.retentionDays,
    requireConsent: input.requireConsent ? 1 : 0,
    allowModelTraining: input.allowModelTraining ? 1 : 0,
    sectorProfile: input.sectorProfile,
    minimizeSensitiveData: input.minimizeSensitiveData ? 1 : 0,
    requireSensitiveHumanReview: input.requireSensitiveHumanReview ? 1 : 0,
    deletionContactEmail: input.deletionContactEmail || null,
  }).onDuplicateKeyUpdate({ set: {
    retentionDays: input.retentionDays,
    requireConsent: input.requireConsent ? 1 : 0,
    allowModelTraining: input.allowModelTraining ? 1 : 0,
    sectorProfile: input.sectorProfile,
    minimizeSensitiveData: input.minimizeSensitiveData ? 1 : 0,
    requireSensitiveHumanReview: input.requireSensitiveHumanReview ? 1 : 0,
    deletionContactEmail: input.deletionContactEmail || null,
    updatedAt: new Date(),
  } });
  return getTenantDataPolicy(input.tenantId);
}

export async function getOnboardingDraft(tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const drafts = await db.select().from(onboardingDrafts).where(eq(onboardingDrafts.tenantId, tenantId)).limit(1);
  return drafts[0];
}

export async function saveOnboardingDraft(tenantId: number, payloadJson: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await getOnboardingDraft(tenantId);
  if (existing) {
    await db.update(onboardingDrafts).set({ payloadJson }).where(eq(onboardingDrafts.id, existing.id));
  } else {
    await db.insert(onboardingDrafts).values({ tenantId, payloadJson });
  }
  return getOnboardingDraft(tenantId);
}

export async function clearOnboardingDraft(tenantId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(onboardingDrafts).where(eq(onboardingDrafts.tenantId, tenantId));
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getOrCreateTenant(user: User) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(tenants).where(eq(tenants.ownerId, user.id)).limit(1);
  if (existing[0]) return existing[0];

  const slugBase = (user.name || "workspace").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
  const slug = `${slugBase}-${user.id}`;
  const values: InsertTenant = {
    ownerId: user.id,
    name: user.name ? `${user.name} Workspace` : "My Workspace",
    slug,
  };
  await db.insert(tenants).values(values);
  const created = await db.select().from(tenants).where(eq(tenants.ownerId, user.id)).limit(1);
  return created[0];
}

export async function ensureDefaultAgent(tenantId: number) {
  const existing = await getTenantAgents(tenantId);
  if (existing[0]) return existing[0];
  return createAgentForTenant({
    tenantId,
    name: "Neon Concierge",
    description: "وكيل استقبال ذكي للرد على الاستفسارات وتحويلها إلى فرص.",
    persona: "مساعد استقبال ذكي، واضح، ودود، ويقود العميل إلى الخطوة العملية التالية.",
    tone: "friendly",
    language: "bilingual",
    decisionRules: "إذا طلب العميل سعراً أو موعداً، اجمع بياناته ووجّهه للخطوة التالية. إذا طلب موظفاً، صعّد المحادثة.",
    fallbackMessage: "أقدر أساعدك أكثر إذا شاركتني بعض التفاصيل، أو أقدر أحوّلك الآن لأحد أعضاء الفريق.",
    escalationKeyword: "موظف,موظفة,human,agent",
    capabilitiesJson: { enabled: ["answer", "qualify", "capture", "escalate"] },
    status: "active",
  });
}

export async function getTenantAgents(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agents).where(eq(agents.tenantId, tenantId)).orderBy(desc(agents.updatedAt));
}

export async function getPublicAgent(agentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  return result[0];
}

export async function getAgentInTenant(tenantId: number, agentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agents).where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId))).limit(1);
  return result[0];
}

export async function createAgentForTenant(input: InsertAgent) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(agents).values({
    ...input,
    capabilitiesJson: input.capabilitiesJson ?? { enabled: ["answer", "qualify", "capture", "escalate"] },
  });
  const result = await db.select().from(agents).where(and(eq(agents.tenantId, input.tenantId), eq(agents.name, input.name))).orderBy(desc(agents.id)).limit(1);
  return result[0];
}

export async function updateAgentInTenant(tenantId: number, agentId: number, patch: Partial<InsertAgent>) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(agents).set(patch).where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)));
  return getAgentInTenant(tenantId, agentId);
}

export async function getKnowledgeForAgent(tenantId: number, agentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(knowledgeBase).where(and(eq(knowledgeBase.tenantId, tenantId), eq(knowledgeBase.agentId, agentId))).orderBy(desc(knowledgeBase.updatedAt));
}

export async function createKnowledgeItem(input: InsertKnowledgeBaseItem) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(knowledgeBase).values(input);
  const result = await db.select().from(knowledgeBase).where(and(eq(knowledgeBase.tenantId, input.tenantId), eq(knowledgeBase.agentId, input.agentId), eq(knowledgeBase.title, input.title))).orderBy(desc(knowledgeBase.id)).limit(1);
  return result[0];
}

export async function deleteKnowledgeItem(tenantId: number, itemId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(knowledgeBase).where(and(eq(knowledgeBase.id, itemId), eq(knowledgeBase.tenantId, tenantId)));
}

export async function replaceWebsiteKnowledge(input: {
  tenantId: number;
  agentId: number;
  items: Array<Pick<InsertKnowledgeBaseItem, "title" | "content" | "category" | "sourceUrl" | "sourceTitle">>;
}) {
  const db = await getDb();
  if (!db) return [];
  const websiteCategories = ["Website service", "Website FAQ", "Website summary"];
  await db.delete(knowledgeBase).where(and(
    eq(knowledgeBase.tenantId, input.tenantId),
    eq(knowledgeBase.agentId, input.agentId),
    inArray(knowledgeBase.category, websiteCategories),
  ));
  const created = [];
  for (const item of input.items) {
    await db.insert(knowledgeBase).values({
      tenantId: input.tenantId,
      agentId: input.agentId,
      title: item.title,
      content: item.content,
      category: item.category,
      sourceUrl: item.sourceUrl,
      sourceTitle: item.sourceTitle,
      sourceFetchedAt: new Date(),
    });
    const row = await db.select().from(knowledgeBase).where(and(
      eq(knowledgeBase.tenantId, input.tenantId),
      eq(knowledgeBase.agentId, input.agentId),
      eq(knowledgeBase.title, item.title),
    )).orderBy(desc(knowledgeBase.id)).limit(1);
    if (row[0]) created.push(row[0]);
  }
  return created;
}

export async function createWebsiteSnapshot(input: {
  tenantId: number;
  agentId: number;
  websiteUrl: string;
  analysisJson: string;
  changesDetected: number;
  changesSummary?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(websiteSnapshots).values(input);
  const row = await db.select().from(websiteSnapshots).where(and(
    eq(websiteSnapshots.tenantId, input.tenantId),
    eq(websiteSnapshots.agentId, input.agentId),
  )).orderBy(desc(websiteSnapshots.id)).limit(1);
  return row[0];
}

export async function getLastWebsiteSnapshot(tenantId: number, agentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const row = await db.select().from(websiteSnapshots).where(and(
    eq(websiteSnapshots.tenantId, tenantId),
    eq(websiteSnapshots.agentId, agentId),
  )).orderBy(desc(websiteSnapshots.id)).limit(1);
  return row[0];
}

export async function getWebsiteSnapshotsHistory(tenantId: number, agentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(websiteSnapshots).where(and(
    eq(websiteSnapshots.tenantId, tenantId),
    eq(websiteSnapshots.agentId, agentId),
  )).orderBy(desc(websiteSnapshots.createdAt)).limit(20);
}

export async function getSnapshotById(tenantId: number, snapshotId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const row = await db.select().from(websiteSnapshots).where(and(
    eq(websiteSnapshots.id, snapshotId),
    eq(websiteSnapshots.tenantId, tenantId),
  )).limit(1);
  return row[0];
}

export async function getAgentBySyncTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const row = await db.select().from(agents).where(eq(agents.syncCronTaskUid, taskUid)).limit(1);
  return row[0];
}

export async function createLead(input: { tenantId: number; agentId: number; conversationId?: number; name: string; email?: string; phone?: string; notes?: string }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(leads).values(input);
  const result = await db.select().from(leads).where(and(eq(leads.tenantId, input.tenantId), eq(leads.agentId, input.agentId))).orderBy(desc(leads.id)).limit(1);
  return result[0];
}

export async function getTenantLeads(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads).where(eq(leads.tenantId, tenantId)).orderBy(desc(leads.updatedAt));
}

export async function getTenantConversations(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conversations).where(eq(conversations.tenantId, tenantId)).orderBy(desc(conversations.updatedAt));
}

export async function getTeamMembers(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teamMembers).where(eq(teamMembers.tenantId, tenantId)).orderBy(desc(teamMembers.createdAt));
}

export async function addTeamMember(input: { tenantId: number; name: string; email: string; role: "admin" | "agent" | "viewer" }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(teamMembers).values({ tenantId: input.tenantId, name: input.name, email: input.email, role: input.role, status: "active" });
  const result = await db.select().from(teamMembers).where(and(eq(teamMembers.tenantId, input.tenantId), eq(teamMembers.email, input.email))).orderBy(desc(teamMembers.id)).limit(1);
  return result[0];
}

export async function updateTeamMemberRole(tenantId: number, memberId: number, role: "admin" | "agent" | "viewer" | "owner") {
  const db = await getDb();
  if (!db) return;
  await db.update(teamMembers).set({ role }).where(and(eq(teamMembers.id, memberId), eq(teamMembers.tenantId, tenantId)));
}

export async function removeTeamMember(tenantId: number, memberId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(teamMembers).where(and(eq(teamMembers.id, memberId), eq(teamMembers.tenantId, tenantId)));
}

export async function updateMemberAvailability(tenantId: number, memberId: number, availability: "online" | "offline" | "busy") {
  const db = await getDb();
  if (!db) return;
  await db.update(teamMembers).set({ availability, lastActiveAt: new Date() }).where(and(eq(teamMembers.id, memberId), eq(teamMembers.tenantId, tenantId)));
}

export async function updateMemberActivity(tenantId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const member = await db.select().from(teamMembers).where(and(eq(teamMembers.tenantId, tenantId), eq(teamMembers.userId, userId))).limit(1);
  if (member[0]) {
    const now = new Date();
    // Check idle timeout
    const diffMinutes = (now.getTime() - new Date(member[0].lastActiveAt).getTime()) / (1000 * 60);
    let availability = member[0].availability;
    if (availability === "online" && diffMinutes > member[0].idleTimeoutMinutes) {
      availability = "offline";
    }
    await db.update(teamMembers).set({ lastActiveAt: now, availability }).where(eq(teamMembers.id, member[0].id));
  }
}

export async function setMemberIdleTimeout(tenantId: number, memberId: number, idleTimeoutMinutes: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(teamMembers).set({ idleTimeoutMinutes }).where(and(eq(teamMembers.id, memberId), eq(teamMembers.tenantId, tenantId)));
}

export async function getTeamInvites(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teamInvites).where(eq(teamInvites.tenantId, tenantId)).orderBy(desc(teamInvites.createdAt));
}

export async function createTeamInvite(input: { tenantId: number; email: string; role: "admin" | "agent" | "viewer" }) {
  const db = await getDb();
  if (!db) return undefined;
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  await db.insert(teamInvites).values({ tenantId: input.tenantId, email: input.email, role: input.role, token, status: "pending" });
  const result = await db.select().from(teamInvites).where(and(eq(teamInvites.tenantId, input.tenantId), eq(teamInvites.token, token))).limit(1);
  return result[0];
}

export async function getTeamAssignments(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teamMemberAssignments).where(eq(teamMemberAssignments.tenantId, tenantId));
}

export async function setTeamAssignment(input: { tenantId: number; memberId: number; targetType: "agent" | "channel"; targetId: string; assign: boolean }) {
  const db = await getDb();
  if (!db) return;
  if (input.assign) {
    const existing = await db.select().from(teamMemberAssignments).where(and(eq(teamMemberAssignments.tenantId, input.tenantId), eq(teamMemberAssignments.memberId, input.memberId), eq(teamMemberAssignments.targetType, input.targetType), eq(teamMemberAssignments.targetId, input.targetId))).limit(1);
    if (existing.length === 0) {
      await db.insert(teamMemberAssignments).values({ tenantId: input.tenantId, memberId: input.memberId, targetType: input.targetType, targetId: input.targetId });
    }
  } else {
    await db.delete(teamMemberAssignments).where(and(eq(teamMemberAssignments.tenantId, input.tenantId), eq(teamMemberAssignments.memberId, input.memberId), eq(teamMemberAssignments.targetType, input.targetType), eq(teamMemberAssignments.targetId, input.targetId)));
  }
}

export async function getTenantNotifications(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workspaceNotifications).where(eq(workspaceNotifications.tenantId, tenantId)).orderBy(desc(workspaceNotifications.createdAt)).limit(50);
}

export async function createNotification(input: { tenantId: number; memberId?: number; title: string; message: string; type?: "escalation" | "assignment" | "lead" | "general" }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(workspaceNotifications).values({
    tenantId: input.tenantId,
    memberId: input.memberId ?? null,
    title: input.title,
    message: input.message,
    type: input.type || "escalation",
    isRead: 0,
  });
}

export async function markNotificationRead(tenantId: number, notificationId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(workspaceNotifications).set({ isRead: 1 }).where(and(eq(workspaceNotifications.id, notificationId), eq(workspaceNotifications.tenantId, tenantId)));
}

export async function markAllNotificationsRead(tenantId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(workspaceNotifications).set({ isRead: 1 }).where(eq(workspaceNotifications.tenantId, tenantId));
}

export async function savePushSubscription(input: { tenantId: number; endpoint: string; p256dh: string; auth: string }) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(pushSubscriptions).where(and(eq(pushSubscriptions.tenantId, input.tenantId), eq(pushSubscriptions.endpoint, input.endpoint))).limit(1);
  if (existing.length === 0) {
    await db.insert(pushSubscriptions).values(input);
  }
}

export async function getTenantPushSubscriptions(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.tenantId, tenantId));
}

export async function getUserNotificationPreferences(tenantId: number, userId: number) {
  const db = await getDb();
  if (!db) return { escalationPush: 1, assignmentPush: 1, leadPush: 1, generalPush: 1, soundAlerts: 1 };
  const result = await db.select().from(notificationPreferences).where(and(eq(notificationPreferences.tenantId, tenantId), eq(notificationPreferences.userId, userId))).limit(1);
  if (result[0]) return result[0];
  // default record
  await db.insert(notificationPreferences).values({ tenantId, userId, escalationPush: 1, assignmentPush: 1, leadPush: 1, generalPush: 1, soundAlerts: 1 });
  const created = await db.select().from(notificationPreferences).where(and(eq(notificationPreferences.tenantId, tenantId), eq(notificationPreferences.userId, userId))).limit(1);
  return created[0] || { escalationPush: 1, assignmentPush: 1, leadPush: 1, generalPush: 1, soundAlerts: 1 };
}

export async function updateUserNotificationPreferences(input: { tenantId: number; userId: number; escalationPush: number; assignmentPush: number; leadPush: number; generalPush: number; soundAlerts: number }) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(notificationPreferences).where(and(eq(notificationPreferences.tenantId, input.tenantId), eq(notificationPreferences.userId, input.userId))).limit(1);
  if (existing.length === 0) {
    await db.insert(notificationPreferences).values(input);
  } else {
    await db.update(notificationPreferences).set({
      escalationPush: input.escalationPush,
      assignmentPush: input.assignmentPush,
      leadPush: input.leadPush,
      generalPush: input.generalPush,
      soundAlerts: input.soundAlerts,
    }).where(and(eq(notificationPreferences.tenantId, input.tenantId), eq(notificationPreferences.userId, input.userId)));
  }
}

export async function getConversationWithMessages(tenantId: number, conversationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conversation = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId))).limit(1);
  if (!conversation[0]) return undefined;
  const items = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  return { conversation: conversation[0], messages: items };
}

export async function createConversation(input: InsertConversation) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(conversations).values(input);
  const result = await db.select().from(conversations).where(and(eq(conversations.tenantId, input.tenantId), eq(conversations.agentId, input.agentId))).orderBy(desc(conversations.id)).limit(1);
  return result[0];
}

export async function addMessage(input: InsertMessage) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(messages).values(input);
  const result = await db.select().from(messages).where(eq(messages.conversationId, input.conversationId)).orderBy(desc(messages.id)).limit(1);
  return result[0];
}

export async function markConversationStatus(tenantId: number, conversationId: number, status: "active" | "escalated" | "resolved") {
  const db = await getDb();
  if (!db) return;
  await db.update(conversations).set({ status }).where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)));
}

export async function updateConversationContact(input: { tenantId: number; conversationId: number; customerName: string; customerEmail?: string; customerPhone: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(conversations).set({
    customerName: input.customerName,
    customerEmail: input.customerEmail || null,
    customerPhone: input.customerPhone,
  }).where(and(eq(conversations.id, input.conversationId), eq(conversations.tenantId, input.tenantId)));
}

export async function getTenantStats(tenantId: number) {
  const db = await getDb();
  if (!db) return { conversations: 0, active: 0, escalated: 0, resolved: 0, messages: 0 };
  const conversationRows = await db.select({ status: conversations.status, total: count() }).from(conversations).where(eq(conversations.tenantId, tenantId)).groupBy(conversations.status);
  const messageRows = await db.select({ total: count() }).from(messages).innerJoin(conversations, eq(messages.conversationId, conversations.id)).where(eq(conversations.tenantId, tenantId));
  const totals = { conversations: 0, active: 0, escalated: 0, resolved: 0, messages: Number(messageRows[0]?.total ?? 0) };
  for (const row of conversationRows) {
    const value = Number(row.total);
    totals.conversations += value;
    totals[row.status] += value;
  }
  return totals;
}

export async function listChannelIntegrations(tenantId: number, agentId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = agentId ? and(eq(channelIntegrations.tenantId, tenantId), eq(channelIntegrations.agentId, agentId)) : eq(channelIntegrations.tenantId, tenantId);
  return db.select().from(channelIntegrations).where(conditions).orderBy(desc(channelIntegrations.updatedAt));
}

export async function upsertChannelIntegration(input: { tenantId: number; agentId: number; channel: string; isActive: number; configJson?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(channelIntegrations).where(and(eq(channelIntegrations.tenantId, input.tenantId), eq(channelIntegrations.agentId, input.agentId), eq(channelIntegrations.channel, input.channel))).limit(1);
  if (existing[0]) {
    await db.update(channelIntegrations).set({ isActive: input.isActive, configJson: input.configJson }).where(eq(channelIntegrations.id, existing[0].id));
    return { ...existing[0], isActive: input.isActive, configJson: input.configJson };
  }
  await db.insert(channelIntegrations).values(input);
  const created = await db.select().from(channelIntegrations).where(and(eq(channelIntegrations.tenantId, input.tenantId), eq(channelIntegrations.agentId, input.agentId), eq(channelIntegrations.channel, input.channel))).limit(1);
  return created[0];
}

export async function getWhatsAppIntegrationByPhoneNumberId(phoneNumberId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(channelIntegrations).where(eq(channelIntegrations.channel, "whatsapp"));
  return rows.find(row => {
    const config = row.configJson as { phoneNumberId?: string } | null;
    return config?.phoneNumberId === phoneNumberId;
  });
}

export async function upsertWhatsAppEmbeddedCredential(input: {
  tenantId: number;
  channelIntegrationId: number;
  whatsappBusinessAccountId: string;
  phoneNumberId: string;
  businessPortfolioId?: string;
  encryptedBusinessToken: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(whatsappEmbeddedCredentials).where(and(
    eq(whatsappEmbeddedCredentials.tenantId, input.tenantId),
    eq(whatsappEmbeddedCredentials.channelIntegrationId, input.channelIntegrationId),
  )).limit(1);
  if (existing[0]) {
    await db.update(whatsappEmbeddedCredentials).set({
      whatsappBusinessAccountId: input.whatsappBusinessAccountId,
      phoneNumberId: input.phoneNumberId,
      businessPortfolioId: input.businessPortfolioId || null,
      encryptedBusinessToken: input.encryptedBusinessToken,
      tokenVersion: "v1",
    }).where(eq(whatsappEmbeddedCredentials.id, existing[0].id));
  } else {
    await db.insert(whatsappEmbeddedCredentials).values({
      tenantId: input.tenantId,
      channelIntegrationId: input.channelIntegrationId,
      whatsappBusinessAccountId: input.whatsappBusinessAccountId,
      phoneNumberId: input.phoneNumberId,
      businessPortfolioId: input.businessPortfolioId,
      encryptedBusinessToken: input.encryptedBusinessToken,
      tokenVersion: "v1",
    });
  }
  const saved = await db.select().from(whatsappEmbeddedCredentials).where(and(
    eq(whatsappEmbeddedCredentials.tenantId, input.tenantId),
    eq(whatsappEmbeddedCredentials.channelIntegrationId, input.channelIntegrationId),
  )).limit(1);
  return saved[0];
}

export async function getEmbeddedBusinessTokenForPhoneNumberId(phoneNumberId: string) {
  const integration = await getWhatsAppIntegrationByPhoneNumberId(phoneNumberId);
  if (!integration) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  const credential = await db.select().from(whatsappEmbeddedCredentials).where(and(
    eq(whatsappEmbeddedCredentials.tenantId, integration.tenantId),
    eq(whatsappEmbeddedCredentials.channelIntegrationId, integration.id),
    eq(whatsappEmbeddedCredentials.phoneNumberId, phoneNumberId),
  )).limit(1);
  if (!credential[0]) return undefined;
  return decryptBusinessToken(credential[0].encryptedBusinessToken);
}

export async function markWhatsAppIntegrationLive(integrationId: number) {
  const db = await getDb();
  if (!db) return;
  const rows = await db.select().from(channelIntegrations).where(eq(channelIntegrations.id, integrationId)).limit(1);
  const integration = rows[0];
  if (!integration) return;
  const config = { ...((integration.configJson as Record<string, unknown> | null) || {}), setupStatus: "connected", lastWebhookAt: new Date().toISOString() };
  await db.update(channelIntegrations).set({ isActive: 1, configJson: config }).where(eq(channelIntegrations.id, integrationId));
}

export async function findLatestChannelConversation(input: { tenantId: number; agentId: number; channel: string; customerPhone: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(conversations).where(and(
    eq(conversations.tenantId, input.tenantId),
    eq(conversations.agentId, input.agentId),
    eq(conversations.channel, input.channel),
    eq(conversations.customerPhone, input.customerPhone),
  )).orderBy(desc(conversations.id)).limit(1);
  return rows[0];
}

export async function getAgentAndTenant(user: User, agentId: number) {
  const tenant = await getOrCreateTenant(user);
  if (!tenant) return undefined;
  const agent = await getAgentInTenant(tenant.id, agentId);
  return agent ? { tenant, agent } : undefined;
}

export type DbAgent = Agent;

// Subscriptions & HyperPay Database Helpers
import { subscriptions, paymentTransactions } from "../drizzle/schema";

export async function getSubscriptionByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return null;
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).limit(1);
  return sub || null;
}

export async function upsertSubscription(data: {
  tenantId: number;
  planName: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete";
  billingCycle?: "trial" | "monthly" | "yearly";
  amount: number;
  currency?: string;
  hyperPayCheckoutId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getSubscriptionByTenant(data.tenantId);
  if (existing) {
    await db.update(subscriptions)
      .set({
        planName: data.planName,
        status: data.status,
        billingCycle: data.billingCycle || "monthly",
        amount: data.amount,
        currency: data.currency || "SAR",
        hyperPayCheckoutId: data.hyperPayCheckoutId,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.tenantId, data.tenantId));
    return getSubscriptionByTenant(data.tenantId);
  } else {
    await db.insert(subscriptions).values({
      tenantId: data.tenantId,
      planName: data.planName,
      status: data.status,
      billingCycle: data.billingCycle || "monthly",
      amount: data.amount,
      currency: data.currency || "SAR",
      hyperPayCheckoutId: data.hyperPayCheckoutId,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
    });
    return getSubscriptionByTenant(data.tenantId);
  }
}

export async function createPaymentTransaction(data: {
  tenantId: number;
  subscriptionId?: number;
  checkoutId: string;
  paymentId?: string;
  amount: number;
  currency?: string;
  status: "pending" | "success" | "failed" | "refunded";
  responseCode?: string;
  responseMessage?: string;
  gatewayResponseJson?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(paymentTransactions).values({
    tenantId: data.tenantId,
    subscriptionId: data.subscriptionId,
    checkoutId: data.checkoutId,
    paymentId: data.paymentId,
    amount: data.amount,
    currency: data.currency || "SAR",
    status: data.status,
    responseCode: data.responseCode,
    responseMessage: data.responseMessage,
    gatewayResponseJson: data.gatewayResponseJson,
  });
}

export async function getTenantTransactions(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(paymentTransactions).where(eq(paymentTransactions.tenantId, tenantId)).orderBy(desc(paymentTransactions.createdAt));
}

// Usage metrics helper for billing & quota dashboard
export async function getTenantUsage(tenantId: number) {
  const db = await getDb();
  if (!db) return { agentsCount: 0, conversationsCount: 0, knowledgeCount: 0 };
  
  const agentRows = await db.select({ total: count() }).from(agents).where(eq(agents.tenantId, tenantId));
  const convRows = await db.select({ total: count() }).from(conversations).where(eq(conversations.tenantId, tenantId));
  const kbRows = await db.select({ total: count() }).from(knowledgeBase).where(eq(knowledgeBase.tenantId, tenantId));

  return {
    agentsCount: Number(agentRows[0]?.total ?? 0),
    conversationsCount: Number(convRows[0]?.total ?? 0),
    knowledgeCount: Number(kbRows[0]?.total ?? 0),
  };
}

function classifyEscalationReason(message: string | undefined) {
  const normalized = (message || "").toLowerCase();
  if (/(موظف|موظفة|بشري|تواصل|human|agent|representative|call me)/.test(normalized)) return "طلب العميل التواصل مع الفريق";
  if (/(سعر|أسعار|عرض سعر|quote|price|pricing|offer)/.test(normalized)) return "سؤال سعر أو عرض يحتاج مراجعة المعرفة";
  if (/(شكوى|مشكلة|complaint|problem|refund|استرجاع)/.test(normalized)) return "مشكلة أو شكوى تحتاج متابعة بشرية";
  return "حالة تحتاج مراجعة سياق المحادثة";
}

function classifyMessageLanguageStyle(message: string) {
  const hasArabic = /[\u0600-\u06FF]/.test(message);
  const hasLatin = /[A-Za-z]/.test(message);
  const isArabizi = /\b(?:ana|3ndi|3and|shlon|shlonak|keef|kif|mafi|kh|7|5|9)\b/i.test(message);
  if (hasArabic && hasLatin) return "عربي + English";
  if (hasArabic && /(وش|شلون|هلا|أبغى|ابي|عندي|مافي)/.test(message)) return "عربية خليجية محتملة";
  if (hasArabic) return "عربية";
  if (isArabizi) return "Arabizi";
  return "English / أخرى";
}

export async function getAgentQualityStats(tenantId: number, agentId: number) {
  const db = await getDb();
  if (!db) {
    return {
      totalConversations: 0,
      resolvedCount: 0,
      escalatedCount: 0,
      activeCount: 0,
      resolutionRate: 0,
      escalationRate: 0,
      knowledgeItemCount: 0,
      channels: [] as Array<{ channel: string; count: number }>,
      languageStyles: [] as Array<{ style: string; count: number }>,
      escalationReasons: [] as Array<{ reason: string; count: number }>,
      knowledgeGaps: [] as Array<{ conversationId: number; channel: string; reason: string; sample: string; createdAt: Date }>,
      capturedLeadCount: 0,
      missedOpportunityCount: 0,
      captureRate: 0,
      channelCaptureMetrics: [] as Array<{ channel: string; conversations: number; captured: number; missed: number; captureRate: number }>,
    };
  }

  const [conversationRows, knowledgeRows, leadRows] = await Promise.all([
    db.select().from(conversations).where(and(eq(conversations.tenantId, tenantId), eq(conversations.agentId, agentId))).orderBy(desc(conversations.updatedAt)),
    db.select({ total: count() }).from(knowledgeBase).where(and(eq(knowledgeBase.tenantId, tenantId), eq(knowledgeBase.agentId, agentId))),
    db.select().from(leads).where(and(eq(leads.tenantId, tenantId), eq(leads.agentId, agentId))),
  ]);
  const conversationIds = conversationRows.map(conversation => conversation.id);
  const messageRows = conversationIds.length
    ? await db.select().from(messages).where(inArray(messages.conversationId, conversationIds)).orderBy(desc(messages.createdAt))
    : [];
  const latestCustomerMessage = new Map<number, string>();
  for (const message of messageRows) {
    if (message.sender === "customer" && !latestCustomerMessage.has(message.conversationId)) latestCustomerMessage.set(message.conversationId, message.content);
  }

  const resolvedCount = conversationRows.filter(conversation => conversation.status === "resolved").length;
  const escalatedConversations = conversationRows.filter(conversation => conversation.status === "escalated");
  const escalatedCount = escalatedConversations.length;
  const activeCount = conversationRows.filter(conversation => conversation.status === "active").length;
  const completedCount = resolvedCount + escalatedCount;
  const channelCounts = new Map<string, number>();
  for (const conversation of conversationRows) channelCounts.set(conversation.channel, (channelCounts.get(conversation.channel) || 0) + 1);
  const languageStyleCounts = new Map<string, number>();
  for (const sample of Array.from(latestCustomerMessage.values())) {
    const style = classifyMessageLanguageStyle(sample);
    languageStyleCounts.set(style, (languageStyleCounts.get(style) || 0) + 1);
  }

  const leadConversationIds = new Set(leadRows.map(lead => lead.conversationId).filter((conversationId): conversationId is number => typeof conversationId === "number"));
  const channelCapture = new Map<string, { conversations: number; captured: number; missed: number }>();
  const commercialIntentPattern = /عرض\s*سعر|طلب\s*سعر|سعر|تكلفة|حجز|موعد|شراء|اطلب|quote|price|cost|book|booking|appointment|buy|purchase/i;
  let capturedLeadCount = 0;
  let missedOpportunityCount = 0;
  for (const conversation of conversationRows) {
    const sample = latestCustomerMessage.get(conversation.id) || "";
    const hasCommercialIntent = commercialIntentPattern.test(sample);
    const hasCapturedContact = leadConversationIds.has(conversation.id) || Boolean(conversation.customerEmail || conversation.customerPhone);
    const channel = channelCapture.get(conversation.channel) || { conversations: 0, captured: 0, missed: 0 };
    channel.conversations += 1;
    if (hasCommercialIntent && hasCapturedContact) {
      capturedLeadCount += 1;
      channel.captured += 1;
    }
    if (hasCommercialIntent && !hasCapturedContact && (conversation.status === "resolved" || conversation.status === "escalated")) {
      missedOpportunityCount += 1;
      channel.missed += 1;
    }
    channelCapture.set(conversation.channel, channel);
  }

  const knowledgeGaps = escalatedConversations.slice(0, 6).map(conversation => {
    const sample = latestCustomerMessage.get(conversation.id) || "لم تسجل رسالة عميل قابلة للعرض لهذه المحادثة.";
    return {
      conversationId: conversation.id,
      channel: conversation.channel,
      reason: classifyEscalationReason(sample),
      sample: sample.slice(0, 180),
      createdAt: conversation.createdAt,
    };
  });
  const reasonCounts: Record<string, number> = {};
  for (const gap of knowledgeGaps) reasonCounts[gap.reason] = (reasonCounts[gap.reason] || 0) + 1;

  return {
    totalConversations: conversationRows.length,
    resolvedCount,
    escalatedCount,
    activeCount,
    resolutionRate: completedCount ? Math.round((resolvedCount / completedCount) * 100) : 0,
    escalationRate: conversationRows.length ? Math.round((escalatedCount / conversationRows.length) * 100) : 0,
    knowledgeItemCount: Number(knowledgeRows[0]?.total ?? 0),
    channels: Array.from(channelCounts.entries()).map(([channel, count]) => ({ channel, count })),
    languageStyles: Array.from(languageStyleCounts.entries()).map(([style, count]) => ({ style, count })).sort((a, b) => b.count - a.count),
    escalationReasons: Object.entries(reasonCounts).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    knowledgeGaps,
    capturedLeadCount,
    missedOpportunityCount,
    captureRate: capturedLeadCount + missedOpportunityCount ? Math.round((capturedLeadCount / (capturedLeadCount + missedOpportunityCount)) * 100) : 0,
    channelCaptureMetrics: Array.from(channelCapture.entries()).map(([channel, metric]) => ({
      channel,
      ...metric,
      captureRate: metric.captured + metric.missed ? Math.round((metric.captured / (metric.captured + metric.missed)) * 100) : 0,
    })).sort((a, b) => b.conversations - a.conversations),
  };
}
