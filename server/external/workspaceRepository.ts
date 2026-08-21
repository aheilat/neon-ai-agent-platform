import type { Pool } from "pg";
import type { IndependentNeonUser } from "./identityRepository";

export type IndependentWorkspace = {
  id: number;
  ownerId: number;
  name: string;
  slug: string;
};

type Queryable = Pick<Pool, "query">;

function workspaceSlug(user: IndependentNeonUser) {
  const base = (user.name || "workspace")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "workspace";
  return `${base}-${user.id}`;
}

export async function getOrCreateIndependentWorkspace(
  client: Queryable,
  user: IndependentNeonUser,
): Promise<IndependentWorkspace> {
  const existing = await client.query<IndependentWorkspace>(
    `select id, "ownerId", name, slug
     from public.tenants
     where "ownerId" = $1
     limit 1`,
    [user.id],
  );
  if (existing.rows[0]) return existing.rows[0];

  const created = await client.query<IndependentWorkspace>(
    `insert into public.tenants ("ownerId", name, slug)
     values ($1, $2, $3)
     returning id, "ownerId", name, slug`,
    [user.id, user.name ? `${user.name} Workspace` : "My Workspace", workspaceSlug(user)],
  );
  return created.rows[0];
}
