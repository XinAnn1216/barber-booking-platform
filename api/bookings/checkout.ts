// POST /api/bookings/checkout  { booking_id }
// Creates a Stripe Checkout Session for the signed-in customer's own pending_payment booking and
// returns { url }. The amount comes from the booking's price snapshot, never from the client.
import Stripe from "stripe";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin, userIdFromAuthHeader } from "../_supabaseAdmin.js";

const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] ?? "");

// Stripe's zero-decimal currencies. Everything else (TWD included) is charged in 1/100 units,
// so NT$300 -> unit_amount 30000. platform_settings.currency_minor_units is display-only.
const ZERO_DECIMAL = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

type BookingRow = {
  id: string;
  customer_id: string;
  status: string;
  price: number;
  services: {
    name: string;
    barber_id: string;
    barbers: { id: string; name: string } | null;
  } | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const userId = await userIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "請先登入" });

  const bookingId = (req.body as { booking_id?: unknown } | undefined)?.booking_id;
  if (typeof bookingId !== "string" || !bookingId) {
    return res.status(400).json({ error: "booking_id is required" });
  }

  // bookings has no barber_id: the barber is reached through service_id -> services.barber_id.
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_id, status, price, services(name, barber_id, barbers(id, name))")
    .eq("id", bookingId)
    .maybeSingle();
  const booking = data as BookingRow | null;
  if (error) return res.status(500).json({ error: "could not load the booking" });
  if (!booking || booking.customer_id !== userId) {
    return res.status(404).json({ error: "找不到這筆預約" });
  }
  if (booking.status !== "pending_payment") {
    return res.status(409).json({ error: "這筆預約不是待付款狀態" });
  }

  const { data: cfg, error: cfgError } = await supabaseAdmin
    .from("platform_settings")
    .select("currency")
    .single();
  if (cfgError || !cfg) return res.status(500).json({ error: "could not load platform settings" });
  const currency = String(cfg.currency).toLowerCase();
  const factor = ZERO_DECIMAL.has(currency) ? 1 : 100;

  const serviceName = booking.services?.name ?? "預約";
  const barberName = booking.services?.barbers?.name ?? "";
  const barberId = booking.services?.barber_id ?? "";

  const origin =
    (req.headers.origin as string | undefined) ??
    `https://${(req.headers["x-forwarded-host"] as string | undefined) ?? req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: barberName ? `${serviceName} @ ${barberName}` : serviceName },
            unit_amount: booking.price * factor,
          },
          quantity: 1,
        },
      ],
      // booking_id is the only key the webhook needs; it is set here by the server, so it can't be forged.
      metadata: { booking_id: booking.id, customer_id: booking.customer_id },
      client_reference_id: booking.id,
      success_url: `${origin}/bookings/success?booking_id=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: barberId ? `${origin}/barbers/${barberId}` : `${origin}/bookings`,
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error("[checkout] stripe error", e);
    return res.status(502).json({ error: "無法建立付款頁面，請稍後再試" });
  }
}
