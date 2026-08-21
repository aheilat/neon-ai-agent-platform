import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "../_core/env";

export type IndependentSupabaseStatus = {
  configured: boolean;
  missing: string[];
};

export function getIndependentSupabaseStatus(): IndependentSupabaseStatus {
  const missing: string[] = [];
  if (!ENV.supabaseUrl) missing.push("SUPABASE_URL");
  if (!ENV.supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return { configured: missing.length === 0, missing };
}

/**
 * Server-only client for the future independent Express runtime. It deliberately
 * returns undefined until separately owned Supabase credentials are configured.
 * Never expose the service-role key to browser code.
 */
export function getIndependentSupabaseServerClient(): SupabaseClient | undefined {
  const status = getIndependentSupabaseStatus();
  if (!status.configured) return undefined;
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
