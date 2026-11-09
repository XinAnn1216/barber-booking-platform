import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Field, Panel, ShopLayout, fieldClass } from "@/components/ShopLayout";
import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  formatMoney,
  splitIntoSlots,
  usePlatformSettings,
  type PlatformSettings,
} from "@/lib/platform";

type Barber = Tables<"barbers">;
type Service = Tables<"services">;
type Slot = Tables<"bookable_slots">;

export const CATEGORIES = ["cut", "color", "perm", "beard"] as const;
type Category = (typeof CATEGORIES)[number];

export default function ShopBookingsPage() {
  useDocumentTitle("Services & slots — Barberly");
  return <ShopLayout>{({ user }) => <BookingsInner shopId={user.id} />}</ShopLayout>;
}

function BookingsInner({ shopId }: { shopId: string }) {
  const settings = usePlatformSettings();
  const [barbers, setBarbers] = useState<Barber[] | null>(null);
  const [barberId, setBarberId] = useState<string>("");

  useEffect(() => {
    supabase
      .from("barbers")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at")
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setBarbers(data ?? []);
        if (data?.[0]) setBarberId((cur) => cur || data[0]!.id);
      });
  }, [shopId]);

  if (barbers === null) return null;

  if (barbers.length === 0) {
    return (
      <Panel title="Services & slots">
        <p className="text-muted-foreground">
          Add a barber first on{" "}
          <Link to="/shop" className="underline underline-offset-4">
            Shop setup
          </Link>
          , then come back to set services and bookable slots.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-4xl font-medium">Services & slots</h1>
          <p className="mt-2 text-muted-foreground">
            Pick a barber, then edit their menu and publish when they can be booked.
          </p>
        </div>
        <label className="ml-auto block space-y-1.5">
          <span className="text-sm font-medium">Barber</span>
          <select
            className={`${fieldClass} min-w-56`}
            value={barberId}
            onChange={(e) => setBarberId(e.target.value)}
          >
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {barberId && (
        <>
          <ServicesEditor key={`s-${barberId}`} barberId={barberId} settings={settings} />
          <SlotPublisher key={`t-${barberId}`} barberId={barberId} settings={settings} />
        </>
      )}
    </div>
  );
}

/* ───────────── Services & price editor ───────────── */

function ServicesEditor({ barberId, settings }: { barberId: string; settings: PlatformSettings }) {
  const [services, setServices] = useState<Service[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("barber_id", barberId)
      .order("created_at");
    if (error) toast.error(error.message);
    setServices(data ?? []);
  }, [barberId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(s: Service) {
    if (!window.confirm(`Delete "${s.name}"?`)) return;
    const { error } = await supabase.from("services").delete().eq("id", s.id);
    if (error) toast.error(error.message);
    await load();
  }

  return (
    <Panel
      title="服務與價格 / Services & prices"
      subtitle={`Prices are whole ${settings.currency.toUpperCase()} amounts (300 = ${formatMoney(300, settings)}). One slot = ${settings.slot_minutes} min.`}
    >
      {services.length > 0 && (
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Price</th>
                <th className="pb-2 font-medium">Slots</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {services.map((s) =>
                editingId === s.id ? (
                  <tr key={s.id}>
                    <td colSpan={5} className="py-2">
                      <ServiceForm
                        barberId={barberId}
                        service={s}
                        settings={settings}
                        onDone={async () => {
                          setEditingId(null);
                          await load();
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-2">{s.name}</td>
                    <td className="py-2 capitalize">{s.category}</td>
                    <td className="py-2">{formatMoney(s.price, settings)}</td>
                    <td className="py-2">
                      {s.required_slots} × {settings.slot_minutes} min
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setEditingId(s.id)}
                      >
                        Edit
                      </Button>{" "}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-destructive"
                        onClick={() => void remove(s)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
      <h3 className="mb-3 text-sm font-medium">Add a service</h3>
      <ServiceForm barberId={barberId} settings={settings} onDone={load} />
    </Panel>
  );
}

function ServiceForm({
  barberId,
  service,
  settings,
  onDone,
  onCancel,
}: {
  barberId: string;
  service?: Service;
  settings: PlatformSettings;
  onDone: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [category, setCategory] = useState<Category>(
    (service?.category as Category | undefined) ?? "cut",
  );
  const [price, setPrice] = useState(service ? String(service.price) : "");
  const [slots, setSlots] = useState(service ? String(service.required_slots) : "1");
  const [busy, setBusy] = useState(false);

  const priceNum = Number(price);
  const slotsNum = Number(slots);
  const valid =
    name.trim() !== "" &&
    price !== "" &&
    Number.isInteger(priceNum) &&
    priceNum >= 0 &&
    Number.isInteger(slotsNum) &&
    slotsNum >= 1;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    // price is stored as the whole amount in platform currency — no ×100 here.
    const fields = { name: name.trim(), category, price: priceNum, required_slots: slotsNum };
    const { error } = service
      ? await supabase.from("services").update(fields).eq("id", service.id)
      : await supabase.from("services").insert({ ...fields, barber_id: barberId });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(service ? "Service updated" : "Service added");
    if (!service) {
      setName("");
      setPrice("");
      setSlots("1");
    }
    await onDone();
  }

  return (
    <form onSubmit={save} className="grid items-end gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
      <Field label="名稱 Name">
        <input
          required
          className={fieldClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Classic cut"
        />
      </Field>
      <Field label="分類 Category">
        <select
          className={fieldClass}
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field label={`價格 Price (${settings.currency.toUpperCase()})`}>
        <input
          required
          type="number"
          min={0}
          step={1}
          className={fieldClass}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="300"
        />
      </Field>
      <Field label="所需時段數 Slots">
        <input
          required
          type="number"
          min={1}
          step={1}
          className={fieldClass}
          value={slots}
          onChange={(e) => setSlots(e.target.value)}
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="pill" className="h-11" disabled={busy || !valid}>
          {service ? "Save" : "Add"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" className="h-11 rounded-full" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

/* ───────────── Bookable slot publisher ───────────── */

function todayLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function SlotPublisher({ barberId, settings }: { barberId: string; settings: PlatformSettings }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [date, setDate] = useState(todayLocal());
  const [from, setFrom] = useState("10:00");
  const [to, setTo] = useState("18:00");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookable_slots")
      .select("*")
      .eq("barber_id", barberId)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at");
    if (error) toast.error(error.message);
    setSlots(data ?? []);
  }, [barberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const preview = useMemo(() => {
    const start = new Date(`${date}T${from}`);
    const end = new Date(`${date}T${to}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    return splitIntoSlots(start, end, settings.slot_minutes);
  }, [date, from, to, settings.slot_minutes]);

  async function publish(e: FormEvent) {
    e.preventDefault();
    const taken = new Set(slots.map((s) => new Date(s.starts_at).getTime()));
    const fresh = preview.filter((p) => !taken.has(new Date(p.starts_at).getTime()));
    if (fresh.length === 0) {
      toast.error(
        preview.length
          ? "Those slots are already published."
          : "Pick an end time after the start time.",
      );
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("bookable_slots")
      .insert(fresh.map((p) => ({ ...p, barber_id: barberId })));
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Published ${fresh.length} slot${fresh.length > 1 ? "s" : ""}`);
    await load();
  }

  async function remove(ids: string[]) {
    const { error } = await supabase.from("bookable_slots").delete().in("id", ids);
    if (error) toast.error(error.message);
    await load();
  }

  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

  async function shift(slot: Slot, value: string) {
    const start = new Date(value);
    if (Number.isNaN(start.getTime())) return;
    setEditing(null);
    const end = new Date(start.getTime() + settings.slot_minutes * 60_000);
    const { error } = await supabase
      .from("bookable_slots")
      .update({ starts_at: start.toISOString(), ends_at: end.toISOString() })
      .eq("id", slot.id);
    if (error) toast.error(error.message);
    await load();
  }

  const byDay = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = new Date(s.starts_at).toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    return [...groups.entries()];
  }, [slots]);

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const localInput = (iso: string) => {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  return (
    <Panel
      title="可預約時段 / Bookable slots"
      subtitle={`Each slot is ${settings.slot_minutes} minutes. Pick a time range and it's split into back-to-back slots.`}
    >
      <form onSubmit={publish} className="grid items-end gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <Field label="日期 Date">
          <input
            type="date"
            required
            className={fieldClass}
            value={date}
            min={todayLocal()}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="開始 From">
          <input
            type="time"
            required
            step={settings.slot_minutes * 60}
            className={fieldClass}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="結束 To">
          <input
            type="time"
            required
            step={settings.slot_minutes * 60}
            className={fieldClass}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
        <Button
          type="submit"
          variant="pill"
          className="h-11"
          disabled={busy || preview.length === 0}
        >
          Publish {preview.length || ""} slot{preview.length === 1 ? "" : "s"}
        </Button>
      </form>

      <div className="mt-8 space-y-5">
        {byDay.length === 0 && (
          <p className="text-sm text-muted-foreground">No upcoming slots published yet.</p>
        )}
        {byDay.map(([day, list]) => (
          <div key={day}>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-sm font-medium">{day}</h3>
              <span className="text-xs text-muted-foreground">{list.length} slots</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto rounded-full text-destructive"
                onClick={() => {
                  if (window.confirm(`Remove all ${list.length} slots on ${day}?`))
                    void remove(list.map((s) => s.id));
                }}
              >
                Clear day
              </Button>
            </div>
            <ul className="flex flex-wrap gap-2">
              {list.map((s) => (
                <li
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pl-3 pr-1 text-sm"
                >
                  {editing?.id === s.id ? (
                    <>
                      <input
                        type="datetime-local"
                        aria-label="New start time"
                        className="rounded-md bg-background px-2 py-0.5 text-xs outline-none"
                        step={settings.slot_minutes * 60}
                        value={editing.value}
                        onChange={(e) => setEditing({ id: s.id, value: e.target.value })}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 rounded-full px-2"
                        onClick={() => void shift(s, editing.value)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 rounded-full px-2"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="hover:underline"
                        title="Edit start time"
                        onClick={() => setEditing({ id: s.id, value: localInput(s.starts_at) })}
                      >
                        {time(s.starts_at)}–{time(s.ends_at)}
                      </button>
                      <button
                        type="button"
                        className="rounded-full p-1 text-muted-foreground hover:text-destructive"
                        onClick={() => void remove([s.id])}
                        aria-label="Delete slot"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}
