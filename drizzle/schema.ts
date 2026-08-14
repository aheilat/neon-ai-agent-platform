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

// AI Agents
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  persona: longtext("persona"),
  tone: varchar("tone", { length: 50 }).default("professional").notNull(), // professional, friendly, formal, casual
  language: varchar("language", { length: 10 }).default("ar").notNull(), // ar, en, bilingual
  decisionRules: longtext("decisionRules"),
  fallbackMessage: text("fallbackMessage"),
  escalationKeyword: varchar("escalationKeyword", { length: 100 }).default("موظف,human,agent").notNull(),
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
