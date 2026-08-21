import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function hasIndependentSupabaseBrowserConfig() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
}

/**
 * Independent browser client. It remains disabled for the current managed
 * environment until the Render/Vercel public Supabase variables are configured.
 */
export function getIndependentSupabaseBrowserClient(): SupabaseClient | undefined {
  if (!hasIndependentSupabaseBrowserConfig()) return undefined;
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    );
  }
  return client;
}
