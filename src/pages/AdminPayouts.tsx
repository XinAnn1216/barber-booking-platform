import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
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
import { fieldClass } from "@/components/ShopLayout";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { homePathFor, useSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/booking";
import { errMessage } from "@/lib/errors";
import { formatMoney, usePlatformSettings } from "@/lib/platform";
import { dateKey, monthKey, payoutStatus, totals } from "@/lib/payouts";

type Owed = Tables<"owed_bookings">;
type Payout = Tables<"payouts">;
type Person = { id: string; email: string | null; display_name: string | null };
type Bank = { id: string; bank_account_name: string | null; bank_account_number: string | null };

/** Admin-only payout builder (owed pool → one-shop batch) and the payouts ledger. */
export default function AdminPayoutsPage() {
  useDocumentTitle("Payouts — Barberly admin");
  const navigate = useNavigate();
  const session = useSession();
  const { user, role, loading } = session;

  // Route guard (UX only). RLS + the admin-only RPCs are the real enforcement.
  useEffect(() => {
    if (loading) return;
    if (!user) navigate(`/login?next=${encodeURIComponent("/admin/payouts")}`, { replace: true });
    else if (role !== "admin") navigate(homePathFor(role), { replace: true });
  }, [loading, user, role, navigate]);

  if (loading || !user || role !== "admin") return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader session={session} />
      <main className="mx-auto max-w-7xl space-y-10 px-6 pb-24 pt-4">
        <PayoutsInner />
      </main>
    </div>
  );
}

function PayoutsInner() {
  const settings = usePlatformSettings();
  const money = (n: number) => formatMoney(n, settings);

  const [owed, setOwed] = useState<Owed[] | null>(null);
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [people, setPeople] = useState<Map<string, Person>>(new Map());
  const [banks, setBanks] = useState<Map<string, Bank>>(new Map());

  const [shopFilter, setShopFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [building, setBuilding] = useState(false);

  const [marking, setMarking] = useState<Payout | null>(null);
  const [bankRef, setBankRef] = useState("");
  const [cancelling, setCancelling] = useState<Payout | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    const [o, p] = await Promise.all([
      supabase.from("owed_bookings").select("*").order("paid_at", { ascending: false }),
      supabase.from("payouts").select("*").order("created_at", { ascending: false }),
    ]);
    if (o.error) toast.error(errMessage(o.error, "Couldn't load owed bookings."));
    if (p.error) toast.error(errMessage(p.error, "Couldn't load payouts."));
    const owedRows = o.data ?? [];
    const payoutRows = p.data ?? [];

    // Names and bank details come from profiles in a separate fetch (no embeds on the view).
    const ids = new Set<string>();
    owedRows.forEach((r) => r.customer_id && ids.add(r.customer_id));
    const shopIds = new Set<string>();
    owedRows.forEach((r) => r.shop_id && shopIds.add(r.shop_id));
    payoutRows.forEach((r) => shopIds.add(r.shop_id));
    const all = [...new Set([...ids, ...shopIds])];
    if (all.length) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, display_name, bank_account_name, bank_account_number")
        .in("id", all);
      if (error) toast.error(errMessage(error, "Couldn't load shop and customer details."));
      setPeople(new Map((data ?? []).map((x) => [x.id, x])));
      setBanks(new Map((data ?? []).filter((x) => shopIds.has(x.id)).map((x) => [x.id, x])));
    }
    setOwed(owedRows);
    setPayouts(payoutRows);
    setSelected(
      (cur) => new Set([...cur].filter((id) => owedRows.some((r) => r.booking_id === id))),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shops = useMemo(() => {
    const m = new Map<string, string>();
    (owed ?? []).forEach((r) => r.shop_id && m.set(r.shop_id, r.shop_name ?? "(未命名店家)"));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [owed]);

  const customerLabel = useCallback(
    (id: string | null) => {
      const p = id ? people.get(id) : undefined;
      return p?.display_name || p?.email || "—";
    },
    [people],
  );

  const visible = useMemo(() => {
    const q = customerFilter.trim().toLowerCase();
    return (owed ?? []).filter((r) => {
      if (shopFilter && r.shop_id !== shopFilter) return false;
      if (q && !customerLabel(r.customer_id).toLowerCase().includes(q)) return false;
      const d = r.paid_at ? dateKey(r.paid_at) : "";
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [owed, shopFilter, customerFilter, fromDate, toDate, customerLabel]);

  const selectedRows = (owed ?? []).filter((r) => r.booking_id && selected.has(r.booking_id));
  const selectedShop = selectedRows[0]?.shop_id ?? null;
  const sel = totals(
    selectedRows.map((r) => ({
      price: r.price ?? 0,
      platform_cut: r.platform_cut ?? 0,
      shop_cut: r.shop_cut ?? 0,
    })),
  );

  function toggle(r: Owed) {
    if (!r.booking_id) return;
    const id = r.booking_id;
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else {
        if (selectedShop && r.shop_id !== selectedShop) {
          toast.error("一筆撥款只能包含同一間店家的預約。 A payout can only include one shop.");
          return cur;
        }
        next.add(id);
      }
      return next;
    });
  }

  function selectShopThisMonth() {
    if (!shopFilter) return;
    const thisMonth = monthKey(new Date().toISOString());
    const ids = (owed ?? [])
      .filter((r) => r.shop_id === shopFilter && r.paid_at && monthKey(r.paid_at) === thisMonth)
      .map((r) => r.booking_id!)
      .filter(Boolean);
    if (ids.length === 0)
      toast.message("這間店本月沒有欠款。 Nothing owed this month for this shop.");
    setSelected(new Set(ids));
  }

  async function build() {
    if (selected.size === 0) return;
    setBuilding(true);
    const { error } = await supabase.rpc("build_payout", {
      p_booking_ids: [...selected],
      ...(note.trim() ? { p_note: note.trim() } : {}),
    });
    setBuilding(false);
    if (error) {
      toast.error(errMessage(error, "Couldn't build the payout."));
      void load();
      return;
    }
    toast.success("已建立撥款（待轉帳）。 Payout created.");
    setSelected(new Set());
    setNote("");
    void load();
  }

  async function markTransferred() {
    if (!marking) return;
    setActing(true);
    const { error } = await supabase.rpc("mark_payout_transferred", {
      p_payout_id: marking.id,
      ...(bankRef.trim() ? { p_bank_reference: bankRef.trim() } : {}),
    });
    setActing(false);
    if (error) toast.error(errMessage(error, "Couldn't mark it transferred."));
    else toast.success("已標記為已轉帳。 Marked as transferred.");
    setMarking(null);
    setBankRef("");
    void load();
  }

  async function cancel() {
    if (!cancelling) return;
    setActing(true);
    const { error } = await supabase.rpc("cancel_payout", { p_payout_id: cancelling.id });
    setActing(false);
    if (error) toast.error(errMessage(error, "Couldn't cancel the payout."));
    else toast.success("撥款已取消，預約退回欠款池。 Payout cancelled.");
    setCancelling(null);
    void load();
  }

  const markingBank = marking ? banks.get(marking.shop_id) : undefined;

  return (
    <>
      <section>
        <h1 className="text-4xl font-medium">撥款 / Payouts</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          勾選同一間店家還沒撥款的預約，建立一筆撥款；到網銀轉帳後再回來標記「已轉帳」。
        </p>
      </section>

      <section className="rounded-[2rem] bg-walnut p-6 shadow-lift md:p-8">
        <h2 className="text-2xl font-medium">欠款池 / Owed bookings</h2>
        <p className="mt-1 text-sm text-muted-foreground">已付款、尚未納入任何撥款的預約。</p>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <select
            className={fieldClass}
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
          >
            <option value="">所有店家 / All shops</option>
            {shops.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <input
            className={fieldClass}
            placeholder="客人 / Customer"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
          />
          <input
            type="date"
            aria-label="Paid from"
            className={fieldClass}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <input
            type="date"
            aria-label="Paid to"
            className={fieldClass}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            disabled={!shopFilter}
            onClick={selectShopThisMonth}
          >
            全選此店本月欠款
          </Button>
          {selected.size > 0 && (
            <Button variant="ghost" className="rounded-full" onClick={() => setSelected(new Set())}>
              清除勾選
            </Button>
          )}
        </div>

        {owed === null ? (
          <Skeleton className="mt-6 h-40 rounded-3xl" />
        ) : visible.length === 0 ? (
          <p className="mt-6 text-muted-foreground">目前沒有符合條件的欠款。 Nothing owed.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="w-10 py-2" />
                  <th className="py-2">店家 / Shop</th>
                  <th className="py-2">理髮師 / Barber</th>
                  <th className="py-2">客人 / Customer</th>
                  <th className="py-2">付款時間 / Paid</th>
                  <th className="py-2 text-right">金額</th>
                  <th className="py-2 text-right">平台抽成</th>
                  <th className="py-2 text-right">店家應得</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const checked = !!r.booking_id && selected.has(r.booking_id);
                  const otherShop = !!selectedShop && r.shop_id !== selectedShop;
                  return (
                    <tr
                      key={r.booking_id}
                      className={`border-t border-border ${otherShop ? "opacity-50" : ""}`}
                    >
                      <td className="py-2">
                        <input
                          type="checkbox"
                          aria-label="Select booking"
                          className="h-4 w-4"
                          checked={checked}
                          disabled={otherShop}
                          onChange={() => toggle(r)}
                        />
                      </td>
                      <td className="py-2">{r.shop_name ?? "—"}</td>
                      <td className="py-2">
                        {r.barber_name}
                        {r.service_name ? (
                          <span className="text-muted-foreground"> · {r.service_name}</span>
                        ) : null}
                      </td>
                      <td className="py-2">{customerLabel(r.customer_id)}</td>
                      <td className="py-2">{r.paid_at ? formatDateTime(r.paid_at) : "—"}</td>
                      <td className="py-2 text-right">{money(r.price ?? 0)}</td>
                      <td className="py-2 text-right">{money(r.platform_cut ?? 0)}</td>
                      <td className="py-2 text-right font-medium">{money(r.shop_cut ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-3xl bg-background/60 p-4">
          <div className="text-sm">
            已選 {sel.count} 筆 · 總額 {money(sel.gross)} · 平台抽成 {money(sel.platform)} ·{" "}
            <span className="font-medium">店家應得 {money(sel.shop)}</span>
          </div>
          <input
            className={`${fieldClass} max-w-xs`}
            placeholder="備註（選填）/ Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            variant="pill"
            className="ml-auto"
            disabled={selected.size === 0 || building}
            onClick={() => void build()}
          >
            {building ? "建立中…" : "建立撥款 / Build payout"}
          </Button>
        </div>
      </section>

      <section className="rounded-[2rem] bg-walnut p-6 shadow-lift md:p-8">
        <h2 className="text-2xl font-medium">撥款紀錄 / Payouts</h2>
        {payouts === null ? (
          <Skeleton className="mt-6 h-32 rounded-3xl" />
        ) : payouts.length === 0 ? (
          <p className="mt-6 text-muted-foreground">還沒有撥款紀錄。 No payouts yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">店家 / Shop</th>
                  <th className="py-2">建立 / Created</th>
                  <th className="py-2 text-right">筆數</th>
                  <th className="py-2 text-right">總額</th>
                  <th className="py-2 text-right">平台抽成</th>
                  <th className="py-2 text-right">店家應得</th>
                  <th className="py-2">狀態 / Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => {
                  const st = payoutStatus(p.status);
                  const pending = p.status === "pending_transfer";
                  return (
                    <tr key={p.id} className="border-t border-border align-top">
                      <td className="py-2">
                        {p.shop_name ?? "—"}
                        {p.note ? (
                          <div className="text-xs text-muted-foreground">{p.note}</div>
                        ) : null}
                      </td>
                      <td className="py-2">{formatDateTime(p.created_at)}</td>
                      <td className="py-2 text-right">{p.bookings_count}</td>
                      <td className="py-2 text-right">{money(p.gross)}</td>
                      <td className="py-2 text-right">
                        {money(p.platform_cut)}
                        <div className="text-xs text-muted-foreground">
                          {Math.round(Number(p.platform_pct) * 100)}%
                        </div>
                      </td>
                      <td className="py-2 text-right font-medium">{money(p.shop_cut)}</td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}
                        >
                          {st.label}
                        </span>
                        {p.marked_transferred_at && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(p.marked_transferred_at)}
                            {p.bank_reference ? ` · ${p.bank_reference}` : ""}
                          </div>
                        )}
                      </td>
                      <td className="py-2">
                        {pending && (
                          <div className="flex justify-end gap-2">
                            <Button variant="pill" size="sm" onClick={() => setMarking(p)}>
                              標記為已轉帳
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={() => setCancelling(p)}
                            >
                              取消
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AlertDialog open={marking !== null} onOpenChange={(o) => !o && !acting && setMarking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>標記為已轉帳？</AlertDialogTitle>
            <AlertDialogDescription>
              請先在網銀轉 {marking ? money(marking.shop_cut) : ""} 給 {marking?.shop_name}。
              {markingBank && (
                <>
                  <br />
                  戶名：{markingBank.bank_account_name ?? "—"} · 帳號：
                  {markingBank.bank_account_number ?? "—"}
                </>
              )}
              <br />
              標記後這筆撥款無法再取消。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            className={fieldClass}
            placeholder="轉帳備註 / 交易序號（選填）"
            value={bankRef}
            onChange={(e) => setBankRef(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>返回</AlertDialogCancel>
            <AlertDialogAction
              disabled={acting}
              onClick={(e) => {
                e.preventDefault();
                void markTransferred();
              }}
            >
              {acting ? "處理中…" : "確認已轉帳"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={cancelling !== null}
        onOpenChange={(o) => !o && !acting && setCancelling(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>取消這筆撥款？</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelling?.shop_name} · {cancelling?.bookings_count} 筆 ·{" "}
              {cancelling ? money(cancelling.shop_cut) : ""}。
              取消後這些預約會退回欠款池，撥款紀錄會保留為「已取消」。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>保留</AlertDialogCancel>
            <AlertDialogAction
              disabled={acting}
              onClick={(e) => {
                e.preventDefault();
                void cancel();
              }}
            >
              {acting ? "處理中…" : "取消撥款"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
