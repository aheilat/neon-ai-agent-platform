import type { Pool } from "pg";

export type IndependentNeonUser = {
  id: number;
  openId: string;
  supabaseUserId: string;
  email: string | null;
  name: string | null;
  role: "user" | "admin";
};

type Queryable = Pick<Pool, "query">;

/**
 * Reads a Neon user through the Supabase identity mapping. All query values are
 * parameterized so an access-token identity cannot alter tenant lookup SQL.
 */
export async function findIndependentNeonUser(
  client: Queryable,
  supabaseUserId: string,
): Promise<IndependentNeonUser | undefined> {
  const result = await client.query<IndependentNeonUser>(
    `select id, "openId", "supabaseUserId", email, name, role
     from public.users
     where "supabaseUserId" = $1
     limit 1`,
    [supabaseUserId],
  );
  return result.rows[0];
}
