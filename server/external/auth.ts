import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getIndependentSupabaseServerClient } from "./supabase";

export type IndependentIdentity = {
  supabaseUserId: string;
  email: string | undefined;
  name: string | undefined;
};

/**
 * Verifies a browser access token with the server-only Supabase client.
 * The existing Manus OAuth context remains active until routers explicitly opt
 * into this adapter in the independent deployment.
 */
export async function getIndependentIdentity(accessToken: string): Promise<IndependentIdentity | undefined> {
  const client = getIndependentSupabaseServerClient();
  if (!client || !accessToken) return undefined;

  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) return undefined;
  return toIndependentIdentity(data.user);
}

export function toIndependentIdentity(user: SupabaseUser): IndependentIdentity {
  return {
    supabaseUserId: user.id,
    email: user.email ?? undefined,
    name: typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : undefined,
  };
}
