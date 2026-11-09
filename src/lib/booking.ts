/** All buyer-facing times are shown in the shops' timezone, and labelled as such. */
export const DISPLAY_TZ = "Asia/Taipei";
export const DISPLAY_TZ_LABEL = "台北時間";

export type SlotWindow = { id: string; starts_at: string; ends_at: string };

export type ServiceCategory = "cut" | "color" | "perm" | "beard";

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  cut: "Cut 剪髮",
  color: "Color 染髮",
  perm: "Perm 燙髮",
  beard: "Beard 鬍子",
};

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 'YYYY-MM-DD' of an instant, in the display timezone (so boundary slots land on the right day). */
export function dayKey(iso: string): string {
  return dayKeyFmt.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-TW", {
    timeZone: DISPLAY_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-TW", {
    timeZone: DISPLAY_TZ,
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    timeZone: DISPLAY_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Free slots sorted by start time. */
export function sortSlots<T extends SlotWindow>(slots: T[]): T[] {
  return [...slots].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
}

/**
 * For each free slot that can START a booking needing `n` back-to-back slots, the ids of the
 * n slots it would hold. `free` must contain only unheld slots: a held slot in the middle
 * breaks the run, so the slot before it can't start an n-slot booking.
 */
export function startRuns(free: SlotWindow[], n: number): Map<string, string[]> {
  const sorted = sortSlots(free);
  const out = new Map<string, string[]>();
  if (n < 1) return out;
  sorted.forEach((first, i) => {
    const run = [first];
    for (const next of sorted.slice(i + 1, i + n)) {
      if (Date.parse(next.starts_at) !== Date.parse(run[run.length - 1]!.ends_at)) break;
      run.push(next);
    }
    if (run.length === n)
      out.set(
        first.id,
        run.map((s) => s.id),
      );
  });
  return out;
}

/** Groups slots by display-timezone day, in time order. */
export function groupByDay<T extends SlotWindow>(slots: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const s of sortSlots(slots)) {
    const k = dayKey(s.starts_at);
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  return [...groups.entries()];
}

/** Only same-origin paths are allowed as a post-login redirect. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
