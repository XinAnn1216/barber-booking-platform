import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Panel, ShopLayout } from "@/components/ShopLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { formatDateTime } from "@/lib/booking";
import { errMessage } from "@/lib/errors";
import { formatMoney, usePlatformSettings } from "@/lib/platform";
import { monthKey, payoutStatus, split, totals } from "@/lib/payouts";

type Owed = Tables<"owed_bookings">;
type Payout = Tables<"payouts">;
type InPayout = {
  id: string;
  price: number;
  paid_at: string | null;
  payout_id: string | null;
  services: { name: string; barbers: { name: string; shop_id: string } | null } | null;
};

/** Read-only mirror for a shop: what's still owed vs already in a payout (all barbers combined). */
export default function ShopEarningsPage() {
  useDocumentTitle("Earnings — Barberly");
  return <ShopLayout>{({ user }) => <EarningsInner shopId={user.id} />}</ShopLayout>;
}

function EarningsInner({ shopId }: { shopId: string }) {
  const settings = usePlatformSettings();
  const money = (n: number) => formatMoney(n, settings);
  const [owed, setOwed] = useState<Owed[] | null>(null);
  const [batched, setBatched] = useState<InPayout[] | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  useEffect(() => {
    void (async () => {
      const [o, b, p] = await Promise.all([
        supabase
          .from("owed_bookings")
          .select("*")
          .eq("shop_id", shopId)
          .order("paid_at", { ascending: false }),
        supabase
          .from("bookings")
          .select("id, price, paid_at, payout_id, services(name, barbers(name, shop_id))")
          .eq("status", "paid")
          .not("payout_id", "is", null)
          .order("paid_at", { ascending: false }),
        supabase
          .from("payouts")
          .select("*")
          .eq("shop_id", shopId)
          .neq("status", "cancelled")
          .order("created_at", { ascending: false }),
      ]);
      const err = o.error ?? b.error ?? p.error;
      if (err) toast.error(errMessage(err, "Couldn't load earnings."));
      setOwed(o.data ?? []);
      setBatched(
        ((b.data ?? []) as unknown as InPayout[]).filter(
          (r) => r.services?.barbers?.shop_id === shopId,
        ),
      );
      setPayouts(p.data ?? []);
    })();
  }, [shopId]);

  const payoutById = useMemo(() => new Map(payouts.map((p) => [p.id, p])), [payouts]);

  // Every paid booking with its split: owed ones from the view, batched ones at their payout's rate.
  const allRows = useMemo(() => {
    const rows: {
      paid_at: string | null;
      price: number;
      platform_cut: number;
      shop_cut: number;
    }[] = [];
    (owed ?? []).forEach((r) =>
      rows.push({
        paid_at: r.paid_at,
        price: r.price ?? 0,
        platform_cut: r.platform_cut ?? 0,
        shop_cut: r.shop_cut ?? 0,
      }),
    );
    (batched ?? []).forEach((r) => {
      const p = r.payout_id ? payoutById.get(r.payout_id) : undefined;
      if (!p) return;
      rows.push({ paid_at: r.paid_at, price: r.price, ...split(r.price, Number(p.platform_pct)) });
    });
    return rows;
  }, [owed, batched, payoutById]);

  if (owed === null || batched === null) return <Skeleton className="h-64 rounded-[2rem]" />;

  const thisMonth = monthKey(new Date().toISOString());
  const month = totals(allRows.filter((r) => r.paid_at && monthKey(r.paid_at) === thisMonth));
  const ever = totals(allRows);
  const owedTotal = totals(
    owed.map((r) => ({
      price: r.price ?? 0,
      platform_cut: r.platform_cut ?? 0,
      shop_cut: r.shop_cut ?? 0,
    })),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-medium">收入 / Earnings</h1>
        <p className="mt-2 text-muted-foreground">
          平台會分批結算並撥款給你 / We settle and pay out your earnings in batches.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["本月 / This month", month],
          ["累計 / All time", ever],
        ].map(([label, t]) => {
          const s = t as ReturnType<typeof totals>;
          return (
            <div key={label as string} className="rounded-3xl bg-walnut p-5 shadow-lift">
              <p className="text-sm text-muted-foreground">{label as string}</p>
              <p className="mt-2 text-3xl font-medium">{money(s.shop)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {s.count} 筆預約 · 總額 {money(s.gross)} · 平台抽成 {money(s.platform)}
              </p>
            </div>
          );
        })}
      </div>

      <Panel title="尚未撥款 / Owed" subtitle={`還沒納入撥款，共 ${money(owedTotal.shop)}`}>
        {owed.length === 0 ? (
          <p className="text-muted-foreground">目前沒有待撥款的預約。</p>
        ) : (
          <ul className="divide-y divide-border">
            {owed.map((r) => (
              <li key={r.booking_id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="min-w-0 flex-1">
                  {r.barber_name}
                  {r.service_name ? ` · ${r.service_name}` : ""}
                  <span className="block text-muted-foreground">
                    {r.paid_at ? formatDateTime(r.paid_at) : ""}
                  </span>
                </span>
                <span className="text-muted-foreground">{money(r.price ?? 0)}</span>
                <span className="font-medium">你的收入 {money(r.shop_cut ?? 0)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="已納入撥款 / In a payout">
        {payouts.length === 0 ? (
          <p className="text-muted-foreground">還沒有撥款。</p>
        ) : (
          <div className="space-y-6">
            {payouts.map((p) => {
              const st = payoutStatus(p.status);
              const rows = batched.filter((b) => b.payout_id === p.id);
              return (
                <div key={p.id} className="rounded-3xl bg-background/60 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}
                    >
                      {st.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {p.status === "transferred" && p.marked_transferred_at
                        ? `轉帳於 ${formatDateTime(p.marked_transferred_at)}`
                        : `建立於 ${formatDateTime(p.created_at)}`}
                    </span>
                    <span className="ml-auto font-medium">
                      {money(p.shop_cut)}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / {p.bookings_count} 筆
                      </span>
                    </span>
                  </div>
                  {p.note && <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>}
                  <ul className="mt-3 space-y-1 text-sm">
                    {rows.map((r) => (
                      <li key={r.id} className="flex gap-3">
                        <span className="flex-1">
                          {r.services?.barbers?.name} · {r.services?.name}
                          <span className="text-muted-foreground">
                            {" "}
                            · {r.paid_at ? formatDateTime(r.paid_at) : ""}
                          </span>
                        </span>
                        <span className="text-muted-foreground">{money(r.price)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
