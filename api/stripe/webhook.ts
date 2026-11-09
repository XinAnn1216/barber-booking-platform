// POST /api/stripe/webhook — the only place a booking becomes paid.
// Verifies the Stripe signature on the RAW body, then flips pending_payment -> paid and stamps
// paid_at. No commission split here: that is computed when a payout is built (M2.2).
import Stripe from "stripe";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../_supabaseAdmin.js";

// The signature is an HMAC of the exact bytes Stripe sent, so the body must not be parsed first.
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] ?? "");

async function rawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req)
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const buf = await rawBody(req);
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      typeof sig === "string" ? sig : "",
      (process.env["STRIPE_WEBHOOK_SECRET"] ?? "").trim(),
    );
  } catch {
    return res.status(400).json({ error: "signature verification failed" });
  }

  if (event.type !== "checkout.session.completed") return res.status(200).json({ received: true });

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return res.status(200).json({ received: true });

  const bookingId = session.metadata?.["booking_id"];
  if (!bookingId) return res.status(400).json({ error: "missing booking_id metadata" });

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // Idempotent: the status guard means a re-delivered event matches zero rows and changes nothing.
  // The UNIQUE index on stripe_payment_intent_id backstops a concurrent double delivery.
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntent,
    })
    .eq("id", bookingId)
    .eq("status", "pending_payment")
    .select("id");

  if (error) {
    if (error.code === "23505") return res.status(200).json({ received: true, duplicate: true });
    console.error("[webhook] update failed", error);
    return res.status(500).json({ error: "update failed" }); // non-2xx -> Stripe retries
  }
  if (!data?.length) {
    // Already paid (a retry), or cancelled before payment landed. Log it so a paid-but-cancelled
    // booking can be refunded by hand.
    console.warn("[webhook] no pending_payment booking to flip", { bookingId, paymentIntent });
  }
  return res.status(200).json({ received: true });
}
