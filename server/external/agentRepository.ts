import type { Pool } from "pg";

export type IndependentAgent = {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  persona: string | null;
  tone: string;
  language: string;
  llmModel: string;
  decisionRules: string | null;
  fallbackMessage: string | null;
  escalationKeyword: string;
  capabilitiesJson: Record<string, unknown> | null;
  status: "active" | "paused" | "draft";
  createdAt: Date;
  updatedAt: Date;
};

export type IndependentKnowledgeItem = {
  id: number;
  agentId: number;
  tenantId: number;
  title: string;
  content: string;
  category: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceFetchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type IndependentConversation = {
  id: number;
  agentId: number;
  tenantId: number;
  channel: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  status: "active" | "escalated" | "resolved";
  createdAt: Date;
  updatedAt: Date;
};

export type CreateIndependentAgentInput = Pick<
  IndependentAgent,
  | "tenantId"
  | "name"
  | "description"
  | "persona"
  | "tone"
  | "language"
  | "llmModel"
  | "decisionRules"
  | "fallbackMessage"
  | "escalationKeyword"
  | "capabilitiesJson"
  | "status"
>;

export type UpdateIndependentAgentProfileInput = Pick<
  IndependentAgent,
  "name" | "description" | "persona" | "tone" | "language" | "status"
>;

export type UpdateIndependentAgentWebsiteProposalInput = UpdateIndependentAgentProfileInput & Pick<
  IndependentAgent,
  "decisionRules" | "fallbackMessage" | "escalationKeyword"
>;

export type CreateIndependentKnowledgeInput = Pick<
  IndependentKnowledgeItem,
  "tenantId" | "agentId" | "title" | "content" | "category" | "sourceUrl" | "sourceTitle"
>;

export type IndependentHandoffContact = {
  name: string | null;
  phone: string | null;
  email: string | null;
};

export type CreateIndependentLeadInput = {
  tenantId: number;
  agentId: number;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  conversationId: number | null;
};

export type CreateIndependentConversationInput = Pick<IndependentConversation, "tenantId" | "agentId" | "channel">;

type Queryable = Pick<Pool, "query">;

const agentColumns = `
  id, "tenantId", name, description, persona, tone, language, "llmModel",
  "decisionRules", "fallbackMessage", "escalationKeyword", "capabilitiesJson",
  status, "createdAt", "updatedAt"`;

const knowledgeColumns = `
  id, "agentId", "tenantId", title, content, category, "sourceUrl", "sourceTitle",
  "sourceFetchedAt", "createdAt", "updatedAt"`;

const conversationColumns = `
  id, "agentId", "tenantId", channel, "customerName", "customerEmail", "customerPhone", status, "createdAt", "updatedAt"`;

export async function listIndependentTenantAgents(client: Queryable, tenantId: number) {
  const result = await client.query<IndependentAgent>(
    `select ${agentColumns}
     from public.agents
     where "tenantId" = $1
     order by "updatedAt" desc`,
    [tenantId],
  );
  return result.rows;
}

export async function getIndependentAgentInTenant(client: Queryable, tenantId: number, agentId: number) {
  const result = await client.query<IndependentAgent>(
    `select ${agentColumns}
     from public.agents
     where "tenantId" = $1 and id = $2
     limit 1`,
    [tenantId, agentId],
  );
  return result.rows[0];
}

export async function createIndependentAgent(client: Queryable, input: CreateIndependentAgentInput) {
  const result = await client.query<IndependentAgent>(
    `insert into public.agents (
       "tenantId", name, description, persona, tone, language, "llmModel",
       "decisionRules", "fallbackMessage", "escalationKeyword", "capabilitiesJson", status
     ) values (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12
     ) returning ${agentColumns}`,
    [
      input.tenantId,
      input.name,
      input.description,
      input.persona,
      input.tone,
      input.language,
      input.llmModel,
      input.decisionRules,
      input.fallbackMessage,
      input.escalationKeyword,
      JSON.stringify(input.capabilitiesJson ?? { enabled: ["answer", "qualify", "capture", "escalate"] }),
      input.status,
    ],
  );
  return result.rows[0];
}

export async function updateIndependentAgentProfile(
  client: Queryable,
  tenantId: number,
  agentId: number,
  input: UpdateIndependentAgentProfileInput,
) {
  const result = await client.query<IndependentAgent>(
    `update public.agents
     set name = $3,
         description = $4,
         persona = $5,
         tone = $6,
         language = $7,
         status = $8,
         "updatedAt" = now()
     where "tenantId" = $1 and id = $2
     returning ${agentColumns}`,
    [tenantId, agentId, input.name, input.description, input.persona, input.tone, input.language, input.status],
  );
  return result.rows[0];
}

export async function updateIndependentAgentFromWebsiteProposal(
  client: Queryable,
  tenantId: number,
  agentId: number,
  input: UpdateIndependentAgentWebsiteProposalInput,
) {
  const result = await client.query<IndependentAgent>(
    `update public.agents
     set name = $3,
         description = $4,
         persona = $5,
         tone = $6,
         language = $7,
         status = $8,
         "decisionRules" = $9,
         "fallbackMessage" = $10,
         "escalationKeyword" = $11,
         "updatedAt" = now()
     where "tenantId" = $1 and id = $2
     returning ${agentColumns}`,
    [tenantId, agentId, input.name, input.description, input.persona, input.tone, input.language, input.status, input.decisionRules, input.fallbackMessage, input.escalationKeyword],
  );
  return result.rows[0];
}

export async function updateIndependentAgentHandoffContact(
  client: Queryable,
  tenantId: number,
  agentId: number,
  contact: IndependentHandoffContact,
) {
  const result = await client.query<IndependentAgent>(
    `update public.agents
     set "capabilitiesJson" = coalesce("capabilitiesJson", '{}'::jsonb) || jsonb_build_object(
       'handoffContact', jsonb_build_object('name', $3::text, 'phone', $4::text, 'email', $5::text)
     ),
     "updatedAt" = now()
     where "tenantId" = $1 and id = $2
     returning ${agentColumns}`,
    [tenantId, agentId, contact.name, contact.phone, contact.email],
  );
  return result.rows[0];
}

export async function createIndependentHandoffLead(client: Queryable, input: CreateIndependentLeadInput) {
  const result = await client.query<{ id: number; createdAt: Date }>(
    `insert into public.leads ("tenantId", "agentId", "conversationId", name, email, phone, notes, status)
     values ($1, $2, $3, $4, $5, $6, $7, 'new')
     returning id, "createdAt"`,
    [input.tenantId, input.agentId, input.conversationId, input.name, input.email, input.phone, input.notes],
  );
  return result.rows[0];
}

export async function createIndependentConversation(client: Queryable, input: CreateIndependentConversationInput) {
  const result = await client.query<IndependentConversation>(
    `insert into public.conversations ("tenantId", "agentId", channel)
     values ($1, $2, $3)
     returning ${conversationColumns}`,
    [input.tenantId, input.agentId, input.channel],
  );
  return result.rows[0];
}

export async function getIndependentConversationInTenant(client: Queryable, tenantId: number, agentId: number, conversationId: number) {
  const result = await client.query<IndependentConversation>(
    `select ${conversationColumns}
     from public.conversations
     where "tenantId" = $1 and "agentId" = $2 and id = $3
     limit 1`,
    [tenantId, agentId, conversationId],
  );
  return result.rows[0];
}

export async function addIndependentConversationMessage(
  client: Queryable,
  conversationId: number,
  sender: "customer" | "agent" | "system" | "human",
  content: string,
) {
  await client.query(
    `insert into public.messages ("conversationId", sender, content) values ($1, $2, $3)`,
    [conversationId, sender, content],
  );
}

export async function updateIndependentConversationStatus(
  client: Queryable,
  tenantId: number,
  agentId: number,
  conversationId: number,
  status: IndependentConversation["status"],
) {
  const result = await client.query<IndependentConversation>(
    `update public.conversations
     set status = $4, "updatedAt" = now()
     where "tenantId" = $1 and "agentId" = $2 and id = $3
     returning ${conversationColumns}`,
    [tenantId, agentId, conversationId, status],
  );
  return result.rows[0];
}

export async function ensureIndependentDefaultAgent(client: Queryable, tenantId: number) {
  const existing = await listIndependentTenantAgents(client, tenantId);
  if (existing[0]) return existing[0];

  return createIndependentAgent(client, {
    tenantId,
    name: "Neon Concierge",
    description: "وكيل استقبال ذكي للرد على الاستفسارات وتحويلها إلى فرص.",
    persona: "مساعد استقبال ذكي، واضح، ودود، ويقود العميل إلى الخطوة العملية التالية.",
    tone: "friendly",
    language: "bilingual",
    llmModel: "claude-haiku-4-5",
    decisionRules: "إذا طلب العميل سعراً أو موعداً، اجمع بياناته ووجّهه للخطوة التالية. إذا طلب موظفاً، صعّد المحادثة.",
    fallbackMessage: "أقدر أساعدك أكثر إذا شاركتني بعض التفاصيل، أو أقدر أحوّلك الآن لأحد أعضاء الفريق.",
    escalationKeyword: "موظف,موظفة,human,agent",
    capabilitiesJson: { enabled: ["answer", "qualify", "capture", "escalate"] },
    status: "active",
  });
}

export async function listIndependentKnowledgeForAgent(client: Queryable, tenantId: number, agentId: number) {
  const result = await client.query<IndependentKnowledgeItem>(
    `select ${knowledgeColumns}
     from public.knowledge_base
     where "tenantId" = $1 and "agentId" = $2
     order by "updatedAt" desc`,
    [tenantId, agentId],
  );
  return result.rows;
}

export async function createIndependentKnowledgeItem(client: Queryable, input: CreateIndependentKnowledgeInput) {
  const result = await client.query<IndependentKnowledgeItem>(
    `insert into public.knowledge_base (
       "tenantId", "agentId", title, content, category, "sourceUrl", "sourceTitle", "sourceFetchedAt"
     ) values (
       $1, $2, $3, $4, $5, $6, $7, case when $6::text is null then null else now() end
     ) returning ${knowledgeColumns}`,
    [input.tenantId, input.agentId, input.title, input.content, input.category, input.sourceUrl, input.sourceTitle],
  );
  return result.rows[0];
}
