import { getIndependentSupabaseBrowserClient } from "./supabase";

export function getIndependentEmailRedirectUrl(origin: string) {
  return `${origin}/external`;
}

export function getIndependentPasswordResetRedirectUrl(origin: string) {
  return `${origin}/reset-password`;
}

export async function sendIndependentPasswordReset(email: string, origin: string) {
  const client = getIndependentSupabaseBrowserClient();
  if (!client) throw new Error("Independent Supabase authentication is not configured.");
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: getIndependentPasswordResetRedirectUrl(origin),
  });
  if (error) throw error;
}

export async function updateIndependentPassword(password: string) {
  const client = getIndependentSupabaseBrowserClient();
  if (!client) throw new Error("Independent Supabase authentication is not configured.");
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}

export async function signInWithIndependentGoogle(origin: string) {
  const client = getIndependentSupabaseBrowserClient();
  if (!client) throw new Error("Independent Supabase authentication is not configured.");
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: getIndependentEmailRedirectUrl(origin) },
  });
  if (error) throw error;
}

export async function resendIndependentConfirmationEmail(email: string, origin: string) {
  const client = getIndependentSupabaseBrowserClient();
  if (!client) throw new Error("Independent Supabase authentication is not configured.");
  const { error } = await client.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: getIndependentEmailRedirectUrl(origin) },
  });
  if (error) throw error;
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
