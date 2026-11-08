import { getIndependentSupabaseBrowserClient } from "./supabase";

export function getIndependentEmailRedirectUrl(origin: string) {
  return `${origin}/external`;
}

export function getIndependentPasswordResetRedirectUrl(origin: string) {
  return `${origin}/reset-password`;
}

export type PasswordRecoveryLink = { kind: "none" } | { kind: "ready" } | { kind: "error"; message: string };

/**
 * Reads the link Supabase sends in the reset email. A valid link carries `type=recovery` plus a token
 * (in the hash, or in the query for PKCE links); an expired one carries an `otp_*` error code instead.
 */
export function readPasswordRecoveryLink(hash: string, search = ""): PasswordRecoveryLink {
  const fromHash = new URLSearchParams(hash.replace(/^#/, ""));
  const fromQuery = new URLSearchParams(search.replace(/^\?/, ""));
  const get = (key: string) => fromHash.get(key) ?? fromQuery.get(key);
  if (/^otp/i.test(get("error_code") ?? "")) {
    return { kind: "error", message: "رابط الاستعادة منتهي أو سبق استخدامه. اطلب رابطاً جديداً من الأسفل." };
  }
  if (get("type") === "recovery" && (get("access_token") || get("code") || get("token_hash"))) return { kind: "ready" };
  return { kind: "none" };
}

/** Where a recovery link must be sent when it lands on another page (for example /login), or null. */
export function getRecoveryRedirectTarget(pathname: string, search: string, hash: string): string | null {
  if (pathname === "/reset-password") return null;
  return readPasswordRecoveryLink(hash, search).kind === "none" ? null : `/reset-password${search}${hash}`;
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
