import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, longtext, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tenants (Workspaces for businesses or individuals)
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: int("ownerId").notNull(), // References users.id
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

export const tenantDataPolicies = mysqlTable("tenant_data_policies", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().unique(),
  retentionDays: int("retentionDays").default(90).notNull(),
  requireConsent: int("requireConsent").default(1).notNull(),
  allowModelTraining: int("allowModelTraining").default(0).notNull(),
  sectorProfile: varchar("sectorProfile", { length: 32 }).default("general").notNull(),
  minimizeSensitiveData: int("minimizeSensitiveData").default(0).notNull(),
  requireSensitiveHumanReview: int("requireSensitiveHumanReview").default(0).notNull(),
  deletionContactEmail: varchar("deletionContactEmail", { length: 320 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TenantDataPolicy = typeof tenantDataPolicies.$inferSelect;
export type InsertTenantDataPolicy = typeof tenantDataPolicies.$inferInsert;

// AI Agents
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  persona: longtext("persona"),
  tone: varchar("tone", { length: 50 }).default("professional").notNull(), // professional, friendly, formal, casual
  language: varchar("language", { length: 10 }).default("ar").notNull(), // ar, en, bilingual
  llmModel: varchar("llmModel", { length: 100 }).default("gpt-4o").notNull(), // gpt-4o, claude-3-5-sonnet, gpt-5
  decisionRules: longtext("decisionRules"),
  fallbackMessage: text("fallbackMessage"),
  escalationKeyword: varchar("escalationKeyword", { length: 100 }).default("موظف,human,agent").notNull(),
  capabilitiesJson: json("capabilitiesJson"),
  sourceWebsiteUrl: text("sourceWebsiteUrl"),
  lastWebsiteSyncAt: timestamp("lastWebsiteSyncAt"),
  syncCronTaskUid: varchar("syncCronTaskUid", { length: 65 }),
  syncIntervalHours: int("syncIntervalHours").default(24).notNull(),
  status: mysqlEnum("status", ["active", "paused", "draft"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// Knowledge Base Documents / FAQs
export const knowledgeBase = mysqlTable("knowledge_base", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  tenantId: int("tenantId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: longtext("content").notNull(),
  category: varchar("category", { length: 100 }).default("FAQ").notNull(),
  sourceUrl: text("sourceUrl"),
  sourceTitle: varchar("sourceTitle", { length: 255 }),
  sourceFetchedAt: timestamp("sourceFetchedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeBaseItem = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBaseItem = typeof knowledgeBase.$inferInsert;

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  agentId: int("agentId").notNull(),
  conversationId: int("conversationId"),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "closed"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

export const teamMembers = mysqlTable("team_members", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId"),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["owner", "admin", "agent", "viewer"]).default("agent").notNull(),
  status: mysqlEnum("status", ["active", "invited", "suspended"]).default("active").notNull(),
  availability: mysqlEnum("availability", ["online", "offline", "busy"]).default("online").notNull(),
  lastActiveAt: timestamp("lastActiveAt").defaultNow().notNull(),
  idleTimeoutMinutes: int("idleTimeoutMinutes").default(15).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

export const teamInvites = mysqlTable("team_invites", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["admin", "agent", "viewer"]).default("agent").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "accepted", "revoked"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeamInvite = typeof teamInvites.$inferSelect;
export type InsertTeamInvite = typeof teamInvites.$inferInsert;

export const teamMemberAssignments = mysqlTable("team_member_assignments", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  memberId: int("memberId").notNull(),
  targetType: mysqlEnum("targetType", ["agent", "channel"]).notNull(),
  targetId: varchar("targetId", { length: 100 }).notNull(), // agentId or channel name (e.g. whatsapp)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeamMemberAssignment = typeof teamMemberAssignments.$inferSelect;
export type InsertTeamMemberAssignment = typeof teamMemberAssignments.$inferInsert;

export const workspaceNotifications = mysqlTable("workspace_notifications", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  memberId: int("memberId"), // optional target team member
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["escalation", "assignment", "lead", "general"]).default("escalation").notNull(),
  isRead: int("isRead").default(0).notNull(), // 0 unread, 1 read
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkspaceNotification = typeof workspaceNotifications.$inferSelect;
export type InsertWorkspaceNotification = typeof workspaceNotifications.$inferInsert;

export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  memberId: int("memberId"),
  endpoint: text("endpoint").notNull(),
  p256dh: varchar("p256dh", { length: 255 }).notNull(),
  auth: varchar("auth", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PushSubscriptionRecord = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscriptionRecord = typeof pushSubscriptions.$inferInsert;

export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  escalationPush: int("escalationPush").default(1).notNull(), // 1 on, 0 off
  assignmentPush: int("assignmentPush").default(1).notNull(),
  leadPush: int("leadPush").default(1).notNull(),
  generalPush: int("generalPush").default(1).notNull(),
  soundAlerts: int("soundAlerts").default(1).notNull(), // 1 on, 0 off
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

// Conversations
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  tenantId: int("tenantId").notNull(),
  channel: varchar("channel", { length: 50 }).default("web").notNull(), // web, whatsapp, messenger, instagram, phone
  customerName: varchar("customerName", { length: 255 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerPhone: varchar("customerPhone", { length: 50 }),
  status: mysqlEnum("status", ["active", "escalated", "resolved"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// Messages
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  sender: mysqlEnum("sender", ["customer", "agent", "system", "human"]).notNull(),
  content: longtext("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Channel Integrations Settings
export const channelIntegrations = mysqlTable("channel_integrations", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  agentId: int("agentId").notNull(),
  channel: varchar("channel", { length: 50 }).notNull(), // whatsapp, messenger, instagram, phone
  isActive: int("isActive").default(0).notNull(), // 0 or 1
  configJson: json("configJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChannelIntegration = typeof channelIntegrations.$inferSelect;
export type InsertChannelIntegration = typeof channelIntegrations.$inferInsert;

// Private credentials returned by Meta Embedded Signup. This table is never
// exposed through client-facing channel queries; the token is encrypted before
// persistence and is scoped to exactly one tenant channel integration.
export const whatsappEmbeddedCredentials = mysqlTable("whatsapp_embedded_credentials", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  channelIntegrationId: int("channelIntegrationId").notNull(),
  whatsappBusinessAccountId: varchar("whatsappBusinessAccountId", { length: 100 }).notNull(),
  phoneNumberId: varchar("phoneNumberId", { length: 100 }).notNull(),
  businessPortfolioId: varchar("businessPortfolioId", { length: 100 }),
  encryptedBusinessToken: longtext("encryptedBusinessToken").notNull(),
  tokenVersion: varchar("tokenVersion", { length: 20 }).default("v1").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsAppEmbeddedCredential = typeof whatsappEmbeddedCredentials.$inferSelect;
export type InsertWhatsAppEmbeddedCredential = typeof whatsappEmbeddedCredentials.$inferInsert;

export const onboardingDrafts = mysqlTable("onboarding_drafts", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  payloadJson: json("payloadJson").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OnboardingDraft = typeof onboardingDrafts.$inferSelect;
export type InsertOnboardingDraft = typeof onboardingDrafts.$inferInsert;

export const websiteSnapshots = mysqlTable("website_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  agentId: int("agentId").notNull(),
  websiteUrl: text("websiteUrl").notNull(),
  analysisJson: longtext("analysisJson").notNull(),
  changesDetected: int("changesDetected").default(0).notNull(), // 0 no, 1 yes
  changesSummary: text("changesSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebsiteSnapshotRecord = typeof websiteSnapshots.$inferSelect;
export type InsertWebsiteSnapshotRecord = typeof websiteSnapshots.$inferInsert;

// Subscriptions & HyperPay Payments
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  planName: varchar("planName", { length: 50 }).default("starter").notNull(), // starter, professional, enterprise
  status: mysqlEnum("status", ["active", "trialing", "past_due", "canceled", "incomplete"]).default("incomplete").notNull(),
  billingCycle: mysqlEnum("billingCycle", ["trial", "monthly", "yearly"]).default("monthly").notNull(),
  amount: int("amount").notNull(), // in SAR/USD cents or minor units (e.g., 29900 for $299)
  currency: varchar("currency", { length: 10 }).default("SAR").notNull(),
  hyperPayCheckoutId: varchar("hyperPayCheckoutId", { length: 255 }),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const paymentTransactions = mysqlTable("payment_transactions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  subscriptionId: int("subscriptionId"),
  checkoutId: varchar("checkoutId", { length: 255 }).notNull(),
  paymentId: varchar("paymentId", { length: 255 }),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("SAR").notNull(),
  status: mysqlEnum("status", ["pending", "success", "failed", "refunded"]).default("pending").notNull(),
  responseCode: varchar("responseCode", { length: 50 }),
  responseMessage: text("responseMessage"),
  gatewayResponseJson: longtext("gatewayResponseJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;
