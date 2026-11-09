import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Star, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Field, Panel, ShopLayout, fieldClass, textareaClass } from "@/components/ShopLayout";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { isOnboarded, type Profile } from "@/lib/auth";

type Barber = Tables<"barbers">;
type Photo = Tables<"barber_photos">;

const PHOTO_BUCKET = "barber-photos";

export default function ShopSetupPage() {
  useDocumentTitle("Shop setup — Barberly");
  return (
    <ShopLayout>
      {({ user, profile, reload }) => (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-medium">Shop setup</h1>
            <p className="mt-2 text-muted-foreground">
              {isOnboarded(profile)
                ? "Your shop is set up. Add barbers, photos, then publish services and slots."
                : "Fill in your shop name and payout account to finish signing up as a shop."}
            </p>
          </div>
          <PayoutSettings profile={profile} onSaved={reload} />
          <MyBarbers shopId={user.id} />
        </div>
      )}
    </ShopLayout>
  );
}

function PayoutSettings({ profile, onSaved }: { profile: Profile; onSaved: () => Promise<void> }) {
  const [shopName, setShopName] = useState(profile.display_name ?? "");
  const [accountName, setAccountName] = useState(profile.bank_account_name ?? "");
  const [accountNumber, setAccountNumber] = useState(profile.bank_account_number ?? "");
  const [busy, setBusy] = useState(false);
  const complete = isOnboarded({
    display_name: shopName,
    bank_account_name: accountName,
    bank_account_number: accountNumber,
  });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!complete) {
      toast.error("Shop name, account name and account number are all required.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: shopName.trim(),
        bank_account_name: accountName.trim(),
        bank_account_number: accountNumber.trim(),
      })
      .eq("id", profile.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Payout settings saved");
    await onSaved();
  }

  return (
    <Panel
      title="撥款設定 / Payout settings"
      subtitle="Shared by all of your barbers. 先用測試資料即可 / use test data first."
    >
      <form onSubmit={save} className="grid gap-4 md:grid-cols-3">
        <Field
          label="店名 Shop name *"
          hint="你的理髮店名稱，會顯示在撥款紀錄上 / your shop's name, shown on payout records"
        >
          <input
            required
            className={fieldClass}
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="Downtown Cuts"
          />
        </Field>
        <Field
          label="匯款戶名 Account name *"
          hint="你的理髮店收款的銀行帳戶 / the bank account where your shop gets paid"
        >
          <input
            required
            className={fieldClass}
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
          />
        </Field>
        <Field label="匯款帳號 Account number *">
          <input
            required
            className={fieldClass}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            inputMode="numeric"
          />
        </Field>
        <div className="md:col-span-3">
          <Button type="submit" variant="pill" disabled={busy || !complete}>
            {busy ? "Saving…" : isOnboarded(profile) ? "Save changes" : "Finish shop signup"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function MyBarbers({ shopId }: { shopId: string }) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at");
    if (error) toast.error(error.message);
    setBarbers(data ?? []);
    setLoaded(true);
  }, [shopId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Panel title="我的理髮師 / My barbers" subtitle="A shop can list as many barbers as it runs.">
      <div className="space-y-6">
        {loaded && barbers.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">No barbers yet. Add your first one below.</p>
        )}
        {barbers.map((b) => (
          <BarberCard key={b.id} barber={b} onChanged={load} />
        ))}
        {adding ? (
          <BarberForm
            shopId={shopId}
            onDone={async () => {
              setAdding(false);
              await load();
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <Button variant="outline" className="rounded-full" onClick={() => setAdding(true)}>
            + {barbers.length ? "新增一位理髮師 / Add another barber" : "新增理髮師 / Add a barber"}
          </Button>
        )}
        {barbers.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Next: set services, prices and bookable slots on{" "}
            <Link to="/shop/bookings" className="underline underline-offset-4">
              Services & slots
            </Link>
            .
          </p>
        )}
      </div>
    </Panel>
  );
}

function BarberForm({
  shopId,
  barber,
  onDone,
  onCancel,
}: {
  shopId: string;
  barber?: Barber;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(barber?.name ?? "");
  const [intro, setIntro] = useState(barber?.intro ?? "");
  const [address, setAddress] = useState(barber?.address ?? "");
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const fields = {
      name: name.trim(),
      intro: intro.trim() || null,
      address: address.trim() || null,
    };
    const { error } = barber
      ? await supabase.from("barbers").update(fields).eq("id", barber.id)
      : await supabase.from("barbers").insert({ ...fields, shop_id: shopId });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(barber ? "Barber updated" : "Barber added");
    await onDone();
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-3xl border border-border p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="名稱 Name *">
          <input
            required
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="地址 Address">
          <input
            className={fieldClass}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>
      </div>
      <Field label="簡介 Intro">
        <textarea
          className={textareaClass}
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          placeholder="簡短介紹一下這位理髮師 / a short bio"
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="pill" disabled={busy || !name.trim()}>
          {busy ? "Saving…" : "Save barber"}
        </Button>
        <Button type="button" variant="ghost" className="rounded-full" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function BarberCard({ barber, onChanged }: { barber: Barber; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);

  async function remove() {
    if (!window.confirm(`Delete ${barber.name}? Their services, slots and photos are removed too.`))
      return;
    const { data: photos } = await supabase
      .from("barber_photos")
      .select("storage_path")
      .eq("barber_id", barber.id);
    if (photos?.length)
      await supabase.storage.from(PHOTO_BUCKET).remove(photos.map((p) => p.storage_path));
    const { error } = await supabase.from("barbers").delete().eq("id", barber.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Barber deleted");
    await onChanged();
  }

  if (editing) {
    return (
      <BarberForm
        shopId={barber.shop_id}
        barber={barber}
        onDone={async () => {
          setEditing(false);
          await onChanged();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <article className="rounded-3xl border border-border p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-xl">{barber.name}</h3>
          {barber.address && <p className="text-sm text-muted-foreground">{barber.address}</p>}
          {barber.intro && <p className="mt-2 whitespace-pre-line text-sm">{barber.intro}</p>}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-destructive"
          onClick={remove}
        >
          Delete
        </Button>
      </div>
      <PhotoManager barberId={barber.id} />
    </article>
  );
}

function PhotoManager({ barberId }: { barberId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("barber_photos")
      .select("*")
      .eq("barber_id", barberId)
      .order("sort_order")
      .order("created_at");
    if (error) toast.error(error.message);
    setPhotos(data ?? []);
  }, [barberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const urlFor = (path: string) =>
    supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let order = photos.reduce((m, p) => Math.max(m, p.sort_order), -1) + 1;
    for (const file of Array.from(files)) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${barberId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (up.error) {
        toast.error(`${file.name}: ${up.error.message}`);
        continue;
      }
      const { error } = await supabase
        .from("barber_photos")
        .insert({ barber_id: barberId, storage_path: path, sort_order: order++ });
      if (error) {
        toast.error(error.message);
        await supabase.storage.from(PHOTO_BUCKET).remove([path]);
      }
    }
    setUploading(false);
    await load();
  }

  async function update(
    photo: Photo,
    fields: Partial<Pick<Photo, "caption" | "is_featured" | "sort_order">>,
  ) {
    const { error } = await supabase.from("barber_photos").update(fields).eq("id", photo.id);
    if (error) toast.error(error.message);
    await load();
  }

  async function move(index: number, delta: number) {
    const other = photos[index + delta];
    const photo = photos[index];
    if (!photo || !other) return;
    await Promise.all([
      supabase
        .from("barber_photos")
        .update({ sort_order: index + delta })
        .eq("id", photo.id),
      supabase.from("barber_photos").update({ sort_order: index }).eq("id", other.id),
    ]);
    await load();
  }

  async function remove(photo: Photo) {
    const st = await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
    if (st.error) {
      toast.error(st.error.message);
      return;
    }
    const { error } = await supabase.from("barber_photos").delete().eq("id", photo.id);
    if (error) toast.error(error.message);
    await load();
  }

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <h4 className="text-sm font-medium">作品照 / Sample hairstyle photos</h4>
        <label className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-full border border-input px-4 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload photos"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {photos.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No photos yet. Upload some of this barber's past work.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-2xl bg-background">
              <div className="relative aspect-square">
                <img
                  src={urlFor(p.storage_path)}
                  alt={p.caption ?? "Sample hairstyle"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => void update(p, { is_featured: !p.is_featured })}
                  className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${p.is_featured ? "bg-primary text-primary-foreground" : "bg-background/80 text-foreground"}`}
                  aria-pressed={p.is_featured}
                >
                  <Star className="h-3 w-3" /> {p.is_featured ? "精選 Featured" : "Feature"}
                </button>
              </div>
              <div className="space-y-2 p-2">
                <input
                  className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs outline-none"
                  placeholder="Caption"
                  defaultValue={p.caption ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value.trim() || null;
                    if (v !== p.caption) void update(p, { caption: v });
                  }}
                />
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={i === 0}
                    onClick={() => void move(i, -1)}
                    aria-label="Move earlier"
                  >
                    ←
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={i === photos.length - 1}
                    onClick={() => void move(i, 1)}
                    aria-label="Move later"
                  >
                    →
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-destructive"
                    onClick={() => void remove(p)}
                    aria-label="Delete photo"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
