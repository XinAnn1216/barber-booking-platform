import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/buyer/SiteHeader";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { homePathFor, useSession } from "@/lib/auth";
import { DISPLAY_TZ_LABEL, formatDateTime, formatTime } from "@/lib/booking";
import { errMessage } from "@/lib/errors";
import { createCheckoutUrl } from "@/lib/payments";
import { formatMoney, usePlatformSettings } from "@/lib/platform";

type Row = {
  id: string;
  status: string;
  price: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  services: {
    name: string;
    barber_id: string;
    barbers: { id: string; name: string; address: string | null } | null;
  } | null;
};

const STATUS: Record<string, { label: string; className: string }> = {
  pending_payment: { label: "已預約・待付款", className: "bg-accent text-accent-foreground" },
  paid: { label: "已付款", className: "bg-primary text-primary-foreground" },
  cancelled: { label: "已取消", className: "bg-muted text-muted-foreground" },
};

/** The signed-in customer's own bookings (RLS returns only their rows), with cancel. */
export default function MyBookingsPage() {
  useDocumentTitle("My bookings — Barberly");
  const navigate = useNavigate();
  const session = useSession();
  const { user, role, loading } = session;
  const settings = usePlatformSettings();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [cancelling, setCancelling] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate(`/login?next=${encodeURIComponent("/bookings")}`, { replace: true });
    else if (role !== "customer") navigate(homePathFor(role), { replace: true });
  }, [loading, user, role, navigate]);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings_with_start")
      .select(
        "id, status, price, starts_at, ends_at, created_at, services(name, barber_id, barbers(id, name, address))",
      )
      .order("starts_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(errMessage(error, "Couldn't load your bookings."));
    setRows(((data as Row[] | null) ?? []).filter((r) => r.id));
  }, []);

  useEffect(() => {
    if (user && role === "customer") void load();
  }, [user, role, load]);

  async function cancel(row: Row) {
    setBusy(true);
    // Only the status changes; the database trigger frees the held slots.
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", row.id);
    setBusy(false);
    setCancelling(null);
    if (error) {
      toast.error(errMessage(error, "Couldn't cancel this booking."));
      return;
    }
    toast.success("預約已取消，時段已釋出。");
    await load();
  }

  async function pay(row: Row) {
    setPaying(row.id);
    try {
      window.location.assign(await createCheckoutUrl(row.id));
    } catch (e) {
      setPaying(null);
      toast.error(errMessage(e, "無法前往付款頁面。"));
    }
  }

  if (loading || !user || role !== "customer")
    return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader session={session} />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-4">
        <h1 className="text-4xl font-medium">我的預約 / My bookings</h1>
        <p className="mt-2 text-sm text-muted-foreground">時間為{DISPLAY_TZ_LABEL}。</p>

        {rows === null ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-[2rem] bg-walnut p-10 text-center shadow-lift">
            <p>你還沒有任何預約。</p>
            <Button asChild variant="pill" className="mt-6">
              <Link to="/barbers">找理髮師</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {rows.map((r) => {
              const st = STATUS[r.status] ?? { label: r.status, className: "bg-muted" };
              const barber = r.services?.barbers;
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-4 rounded-3xl bg-walnut p-5 shadow-lift"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {barber ? (
                        <Link
                          to={`/barbers/${barber.id}`}
                          className="text-lg font-medium hover:underline"
                        >
                          {barber.name}
                        </Link>
                      ) : (
                        <span className="text-lg font-medium">—</span>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}
                      >
                        {st.label}
                      </span>
                    </div>
                    <p className="text-sm">{r.services?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.starts_at
                        ? `${formatDateTime(r.starts_at)}${r.ends_at ? `–${formatTime(r.ends_at)}` : ""}`
                        : "時間未記錄"}
                      {barber?.address ? ` · ${barber.address}` : ""}
                    </p>
                  </div>
                  <span className="font-medium">{formatMoney(r.price, settings)}</span>
                  {r.status === "pending_payment" && (
                    <Button variant="pill" disabled={paying !== null} onClick={() => void pay(r)}>
                      {paying === r.id ? "前往付款…" : "付款 / Pay"}
                    </Button>
                  )}
                  {r.status === "pending_payment" && (
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setCancelling(r)}
                    >
                      取消 / Cancel
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <AlertDialog
        open={cancelling !== null}
        onOpenChange={(o) => !o && !busy && setCancelling(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>取消這筆預約？</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelling?.services?.barbers?.name} · {cancelling?.services?.name}
              {cancelling?.starts_at ? ` · ${formatDateTime(cancelling.starts_at)}` : ""}
              。取消後時段會釋出給其他人預約。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>保留預約</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (cancelling) void cancel(cancelling);
              }}
            >
              {busy ? "取消中…" : "確認取消"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
