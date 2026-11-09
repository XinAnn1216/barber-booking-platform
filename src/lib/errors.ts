/**
 * Supabase returns a PostgrestError, a plain `{ message, details, hint, code }` object rather
 * than an Error instance, so `err instanceof Error` misses it. Read `.message` off either shape.
 */
export function errMessage(err: unknown, fallback = "Something went wrong."): string {
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fallback;
}
