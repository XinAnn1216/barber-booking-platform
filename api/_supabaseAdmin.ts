// Server-only Supabase client using the service-role (secret) key, for the Stripe functions.
// It bypasses RLS, so it must never be imported from src/ (the browser bundle).
import { createClient } from "@supabase/supabase-js";

const url = (process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "").trim();
const secretKey = (process.env["SUPABASE_SECRET_KEY"] ?? "").trim();

// New-format sb_secret_ keys are opaque strings, not JWTs: send them as the apikey header and
// drop the default "Authorization: Bearer <key>" header, like the browser client does.
const opaqueKeyFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  if (headers.get("Authorization") === `Bearer ${secretKey}`) headers.delete("Authorization");
  headers.set("apikey", secretKey);
  return fetch(input, { ...init, headers });
};

export const supabaseAdmin = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: opaqueKeyFetch },
});

/** Returns the signed-in user's id from a "Bearer <access token>" header, or null. */
export async function userIdFromAuthHeader(header: string | undefined): Promise<string | null> {
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    console.warn("[auth] getUser failed", error?.status, error?.message);
    return null;
  }
  return data.user.id;
}
