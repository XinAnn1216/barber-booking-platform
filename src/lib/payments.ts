import { supabase } from "@/integrations/supabase/client";

/**
 * Asks the server for a Stripe Checkout page for one of the signed-in customer's
 * pending_payment bookings and returns its URL. The amount is set on the server from the
 * booking's price snapshot.
 */
export async function createCheckoutUrl(bookingId: string): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("請先登入。");
  const res = await fetch("/api/bookings/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ booking_id: bookingId }),
  });
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !body.url) throw new Error(body.error ?? "無法建立付款頁面。");
  return body.url;
}
