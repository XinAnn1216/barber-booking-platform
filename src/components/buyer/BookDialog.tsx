import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Service } from "@/lib/barbers";
import {
  CATEGORY_LABELS,
  DISPLAY_TZ_LABEL,
  formatDay,
  formatTime,
  groupByDay,
  startRuns,
  type ServiceCategory,
  type SlotWindow,
} from "@/lib/booking";
import { errMessage } from "@/lib/errors";
import { createCheckoutUrl } from "@/lib/payments";
import { formatMoney, type PlatformSettings } from "@/lib/platform";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberName: string;
  services: Service[];
  freeSlots: SlotWindow[];
  settings: PlatformSettings;
  initialServiceId?: string | null;
  /** Called after a booking is created, so the page can reload its free slots. */
  onBooked: () => void;
};

/**
 * Service → date → start slot → confirm. Confirm creates the booking (status pending_payment,
 * which holds the slots) and then sends the customer to Stripe Checkout to pay for it. The
 * booking only becomes paid when Stripe's webhook reports the payment.
 */
export function BookDialog({
  open,
  onOpenChange,
  barberName,
  services,
  freeSlots,
  settings,
  initialServiceId,
  onBooked,
}: Props) {
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [startId, setStartId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setServiceId(initialServiceId ?? null);
      setDay(null);
      setStartId(null);
    }
  }, [open, initialServiceId]);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const n = service?.required_slots ?? 0;
  const runs = useMemo(
    () => (service ? startRuns(freeSlots, n) : new Map<string, string[]>()),
    [service, freeSlots, n],
  );
  const days = useMemo(
    () => groupByDay(freeSlots).filter(([, slots]) => slots.some((s) => runs.has(s.id))),
    [freeSlots, runs],
  );
  const activeDay = day && days.some(([k]) => k === day) ? day : (days[0]?.[0] ?? null);
  const daySlots = days.find(([k]) => k === activeDay)?.[1] ?? [];
  const held = new Set(startId ? (runs.get(startId) ?? []) : []);
  const chosen = freeSlots.filter((s) => held.has(s.id));
  const first = chosen[0];
  const last = chosen[chosen.length - 1];
  const summary =
    first && last
      ? `${formatDay(first.starts_at)} ${formatTime(first.starts_at)}–${formatTime(last.ends_at)}`
      : null;

  function pickService(id: string) {
    setServiceId(id);
    setStartId(null);
  }

  async function confirm() {
    if (!service || !startId) return;
    setBusy(true);
    const { data: bookingId, error } = await supabase.rpc("create_booking", {
      p_service_id: service.id,
      p_start_slot_id: startId,
    });
    if (error || !bookingId) {
      setBusy(false);
      toast.error(errMessage(error, "Could not complete the booking."));
      onBooked(); // refresh: the slots may have just been taken
      setStartId(null);
      return;
    }
    try {
      window.location.assign(await createCheckoutUrl(bookingId));
    } catch (e) {
      // The booking exists and holds the slots; the customer can pay from 我的預約.
      setBusy(false);
      toast.error(errMessage(e, "無法前往付款頁面。"), {
        description: `已保留 ${barberName}：${service.name}，${summary}。可以到「我的預約」完成付款。`,
      });
      onOpenChange(false);
      onBooked();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[2rem] bg-walnut">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium">預約 {barberName}</DialogTitle>
          <DialogDescription>
            先選服務，再選日期和開始時間。時間皆為{DISPLAY_TZ_LABEL}。
          </DialogDescription>
        </DialogHeader>

        <section>
          <h3 className="text-sm font-medium">1. 服務 / Service</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pickService(s.id)}
                aria-pressed={serviceId === s.id}
                className={`rounded-2xl border p-3 text-left transition ${serviceId === s.id ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border bg-background hover:bg-secondary"}`}
              >
                <span className="block font-medium">{s.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {CATEGORY_LABELS[s.category as ServiceCategory] ?? s.category} ·{" "}
                  {s.required_slots * settings.slot_minutes} 分鐘（{s.required_slots} 個時段）
                </span>
                <span className="mt-1 block text-sm font-medium">
                  {formatMoney(s.price, settings)}
                </span>
              </button>
            ))}
          </div>
        </section>

        {service && (
          <section>
            <h3 className="text-sm font-medium">2. 日期 / Date</h3>
            {days.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                目前沒有足夠的連續空檔可以做這個服務（需要連續 {n} 個時段）。
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {days.map(([k, slots]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setDay(k);
                      setStartId(null);
                    }}
                    aria-pressed={activeDay === k}
                    className={`rounded-full border px-4 py-1.5 text-sm transition ${activeDay === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-secondary"}`}
                  >
                    {formatDay(slots[0]!.starts_at)}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {service && activeDay && (
          <section>
            <h3 className="text-sm font-medium">3. 開始時間 / Start time</h3>
            {n > 1 && (
              <p className="mt-1 text-xs text-muted-foreground">
                此服務會連續佔用 {n} 個時段（{n * settings.slot_minutes}{" "}
                分鐘）。標示「時段不足」的時間後面湊不滿 {n} 格，所以不能從那裡開始。
              </p>
            )}
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {daySlots.map((s) => {
                const canStart = runs.has(s.id);
                const inRange = held.has(s.id);
                const isStart = s.id === startId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!canStart}
                    onClick={() => setStartId(s.id)}
                    aria-pressed={isStart}
                    className={`flex flex-col items-center rounded-xl border px-2 py-2 text-sm transition ${
                      inRange
                        ? "border-primary bg-primary text-primary-foreground"
                        : canStart
                          ? "border-border bg-background hover:bg-secondary"
                          : "cursor-not-allowed border-dashed border-border bg-muted/40 text-muted-foreground"
                    } ${isStart ? "ring-2 ring-ring ring-offset-2 ring-offset-walnut" : ""}`}
                  >
                    <span>{formatTime(s.starts_at)}</span>
                    {!canStart && !inRange && (
                      <span className="text-[10px] leading-tight">時段不足</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <div className="rounded-2xl bg-background p-4 text-sm">
          {service ? (
            <>
              <div className="flex items-center justify-between">
                <span>{service.name}</span>
                <span className="text-lg font-medium">{formatMoney(service.price, settings)}</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {summary
                  ? `你的預約：${summary}（連佔 ${n} 個時段，${DISPLAY_TZ_LABEL}）`
                  : "請選一個開始時間。"}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">請先選一個服務，價格會顯示在這裡。</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            取消 / Cancel
          </Button>
          <Button variant="pill" onClick={confirm} disabled={!service || !startId || busy}>
            {busy ? "前往付款…" : "確認並付款 / Confirm & pay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
