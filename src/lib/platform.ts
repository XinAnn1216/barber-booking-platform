import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlatformSettings = {
  currency: string;
  currency_minor_units: number;
  slot_minutes: number;
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  currency: "twd",
  currency_minor_units: 0,
  slot_minutes: 30,
};

/** Reads the single platform_settings row (currency + slot length). Falls back to defaults. */
export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("currency, currency_minor_units, slot_minutes")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings(data);
      });
  }, []);
  return settings;
}

/** `price` is stored in whole currency units (300 = NT$300); this only formats it for display. */
export function formatMoney(amount: number, settings: PlatformSettings): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: settings.currency.toUpperCase(),
      minimumFractionDigits: settings.currency_minor_units,
      maximumFractionDigits: settings.currency_minor_units,
    }).format(amount);
  } catch {
    return `${settings.currency.toUpperCase()} ${amount}`;
  }
}

/** Splits [start, end) into back-to-back windows of `minutes` length. A trailing partial window is dropped. */
export function splitIntoSlots(
  start: Date,
  end: Date,
  minutes: number,
): { starts_at: string; ends_at: string }[] {
  const out: { starts_at: string; ends_at: string }[] = [];
  const step = minutes * 60_000;
  for (let t = start.getTime(); t + step <= end.getTime(); t += step) {
    out.push({ starts_at: new Date(t).toISOString(), ends_at: new Date(t + step).toISOString() });
  }
  return out;
}
