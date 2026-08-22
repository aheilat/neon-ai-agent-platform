import { getIndependentSupabaseBrowserClient } from "./supabase";

export function getIndependentEmailRedirectUrl(origin: string) {
  return `${origin}/external`;
}

export async function signInToIndependentNeon(email: string, password: string) {
  const client = getIndependentSupabaseBrowserClient();
  if (!client) throw new Error("Independent Supabase authentication is not configured.");
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpForIndependentNeon(email: string, password: string, origin: string) {
  const client = getIndependentSupabaseBrowserClient();
  if (!client) throw new Error("Independent Supabase authentication is not configured.");
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: getIndependentEmailRedirectUrl(origin) },
  });
  if (error) throw error;
  return { confirmationRequired: !data.session };
}
