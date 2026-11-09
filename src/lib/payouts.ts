import { DISPLAY_TZ } from "@/lib/booking";

export type PayoutStatus = "pending_transfer" | "transferred" | "cancelled";

export const PAYOUT_STATUS: Record<PayoutStatus, { label: string; className: string }> = {
  pending_transfer: { label: "待轉帳 / Pending", className: "bg-accent text-accent-foreground" },
  transferred: { label: "已轉帳 / Transferred", className: "bg-primary text-primary-foreground" },
  cancelled: { label: "已取消 / Cancelled", className: "bg-muted text-muted-foreground" },
};

export function payoutStatus(s: string): { label: string; className: string } {
  return (
    PAYOUT_STATUS[s as PayoutStatus] ?? { label: s, className: "bg-muted text-muted-foreground" }
  );
}

type Money = { price: number; platform_cut: number; shop_cut: number };

/** Gross / platform cut / shop cut over a set of owed rows. */
export function totals(rows: Money[]): {
  count: number;
  gross: number;
  platform: number;
  shop: number;
} {
  return rows.reduce(
    (t, r) => ({
      count: t.count + 1,
      gross: t.gross + r.price,
      platform: t.platform + r.platform_cut,
      shop: t.shop + r.shop_cut,
    }),
    { count: 0, gross: 0, platform: 0, shop: 0 },
  );
}

/** Same split the DB uses: platform = round(price × pct), shop = the rest, so they sum to price. */
export function split(price: number, pct: number): { platform_cut: number; shop_cut: number } {
  const platform_cut = Math.round(price * pct);
  return { platform_cut, shop_cut: price - platform_cut };
}

const monthFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TZ,
  year: "numeric",
  month: "2-digit",
});

/** 'YYYY-MM' of an instant in the display timezone. */
export function monthKey(iso: string): string {
  return monthFmt.format(new Date(iso)).slice(0, 7);
}

/** 'YYYY-MM-DD' (display timezone) for comparing against <input type="date"> values. */
export function dateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
