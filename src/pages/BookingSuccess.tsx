import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/buyer/SiteHeader";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useSession } from "@/lib/auth";

const POLL_MS = 2000;
const GIVE_UP_MS = 60_000;

type State = "checking" | "paid" | "slow" | "missing";

/**
 * Where Stripe sends the customer after paying. It only READS the booking and waits for the
 * webhook to mark it paid; it never changes anything (the webhook is the source of truth).
 */
export default function BookingSuccessPage() {
  useDocumentTitle("Payment — Barberly");
  const [params] = useSearchParams();
  const bookingId = params.get("booking_id");
  const navigate = useNavigate();
  const session = useSession();
  const { user, loading } = session;
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    if (!loading && !user) {
      navigate(
        `/login?next=${encodeURIComponent(`/bookings/success?booking_id=${bookingId ?? ""}`)}`,
        {
          replace: true,
        },
      );
    }
  }, [loading, user, bookingId, navigate]);

  useEffect(() => {
    if (!user || !bookingId) {
      if (!bookingId) setState("missing");
      return;
    }
    let stopped = false;
    const started = Date.now();
    async function poll() {
      const { data } = await supabase
        .from("bookings")
        .select("status")
        .eq("id", bookingId!)
        .maybeSingle();
      if (stopped) return;
      if (!data) return setState("missing");
      if (data.status === "paid") return setState("paid");
      if (Date.now() - started > GIVE_UP_MS) return setState("slow");
      timer = window.setTimeout(poll, POLL_MS);
    }
    let timer = window.setTimeout(poll, 0);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [user, bookingId]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader session={session} />
      <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
        <div className="rounded-[2rem] bg-walnut p-10 text-center shadow-lift">
          {state === "checking" && (
            <>
              <h1 className="text-3xl font-medium">付款處理中…</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                正在等 Stripe 通知付款結果，通常幾秒內就會完成。
              </p>
            </>
          )}
          {state === "paid" && (
            <>
              <h1 className="text-3xl font-medium">預約成功！</h1>
              <p className="mt-3 text-sm text-muted-foreground">付款已完成，你的時段已確認。</p>
            </>
          )}
          {state === "slow" && (
            <>
              <h1 className="text-3xl font-medium">還在確認付款</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Stripe 的通知比平常慢。你的時段已經保留，稍後到「我的預約」查看狀態即可。
              </p>
            </>
          )}
          {state === "missing" && (
            <>
              <h1 className="text-3xl font-medium">找不到這筆預約</h1>
              <p className="mt-3 text-sm text-muted-foreground">請到「我的預約」查看。</p>
            </>
          )}
          <Button asChild variant="pill" className="mt-8">
            <Link to="/bookings">我的預約</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
