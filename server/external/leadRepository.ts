import type { Pool } from "pg";
import type { IndependentLead } from "./agentRepository";

type Queryable = Pick<Pool, "query">;

export const LEAD_STATUSES = ["new", "contacted", "qualified", "closed"] as const;
export type IndependentLeadStatus = (typeof LEAD_STATUSES)[number];

const leadColumns = `id, "tenantId", "agentId", "conversationId", name, email, phone, notes, status, "createdAt", "updatedAt"`;

export function isLeadStatus(value: unknown): value is IndependentLeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}

export type ListIndependentLeadsOptions = { status?: IndependentLeadStatus; search?: string; limit?: number; offset?: number };

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, match => `\\${match}`);
}

export async function listIndependentLeads(client: Queryable, tenantId: number, agentId: number, options: ListIndependentLeadsOptions = {}) {
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 25), 1), 100);
  const offset = Math.max(Math.trunc(options.offset ?? 0), 0);
  const search = options.search?.trim() ? `%${escapeLike(options.search.trim().slice(0, 100))}%` : null;
  const params = [tenantId, agentId, options.status ?? null, search];
  const filter = `"tenantId" = $1 and "agentId" = $2
     and ($3::text is null or status = $3)
     and ($4::text is null or name ilike $4 or email ilike $4 or phone ilike $4 or notes ilike $4)`;
  const [rows, total, counts] = await Promise.all([
    client.query<IndependentLead>(
      `select ${leadColumns} from public.leads where ${filter} order by "createdAt" desc, id desc limit $5 offset $6`,
      [...params, limit, offset],
    ),
    client.query<{ count: string }>(`select count(*)::text as count from public.leads where ${filter}`, params),
    client.query<{ status: string; count: string }>(
      `select status, count(*)::text as count from public.leads where "tenantId" = $1 and "agentId" = $2 group by status`,
      [tenantId, agentId],
    ),
  ]);
  const statusCounts: Record<string, number> = { new: 0, contacted: 0, qualified: 0, closed: 0 };
  for (const row of counts.rows) statusCounts[row.status] = Number(row.count);
  return { leads: rows.rows, total: Number(total.rows[0]?.count ?? 0), statusCounts, limit, offset };
}

export async function updateIndependentLead(
  client: Queryable,
  tenantId: number,
  agentId: number,
  leadId: number,
  patch: { status?: IndependentLeadStatus; notes?: string | null },
) {
  const hasNotes = patch.notes !== undefined;
  const result = await client.query<IndependentLead>(
    `update public.leads
     set status = coalesce($4, status),
         notes = case when $5::boolean then $6 else notes end
     where id = $1 and "tenantId" = $2 and "agentId" = $3
     returning ${leadColumns}`,
    [leadId, tenantId, agentId, patch.status ?? null, hasNotes, hasNotes ? patch.notes : null],
  );
  return result.rows[0];
}

export type ConversationLeadInput = {
  tenantId: number;
  agentId: number;
  conversationId: number;
  name: string;
  phone: string | null;
  email: string | null;
  notes?: string | null;
  /** True when the customer typed their own name (handoff form), so it replaces an auto-generated one. */
  overrideName?: boolean;
};

/** One lead per conversation: fills missing contact details on an existing lead, otherwise inserts a new one. */
export async function ensureConversationLead(client: Queryable, input: ConversationLeadInput) {
  const updated = await client.query<{ id: number }>(
    `update public.leads
     set phone = coalesce(phone, $4), email = coalesce(email, $5), notes = coalesce($6, notes),
         name = case when $7::boolean then $8 else name end
     where "conversationId" = $1 and "tenantId" = $2 and "agentId" = $3
     returning id`,
    [input.conversationId, input.tenantId, input.agentId, input.phone, input.email, input.notes ?? null, input.overrideName === true, input.name],
  );
  if (updated.rows[0]) return { id: updated.rows[0].id, created: false as const };
  const inserted = await client.query<{ id: number }>(
    `insert into public.leads ("tenantId", "agentId", "conversationId", name, email, phone, notes, status)
     select $2, $3, $1, $4, $5, $6, $7, 'new'
     where not exists (select 1 from public.leads where "conversationId" = $1)
     returning id`,
    [input.conversationId, input.tenantId, input.agentId, input.name.slice(0, 255), input.email, input.phone, input.notes ?? null],
  );
  if (inserted.rows[0]) return { id: inserted.rows[0].id, created: true as const };
  return { id: undefined, created: false as const };
}
