import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Scissors, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/buyer/SiteHeader";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useSession } from "@/lib/auth";
import { photoUrl, repPhoto, type Barber, type Photo, type Service } from "@/lib/barbers";
import { CATEGORY_LABELS, type ServiceCategory } from "@/lib/booking";
import { errMessage } from "@/lib/errors";
import { formatMoney, usePlatformSettings } from "@/lib/platform";

type BarberCard = Barber & {
  services: Pick<Service, "category" | "price">[];
  barber_photos: Pick<Photo, "storage_path" | "is_featured" | "sort_order" | "created_at">[];
};

const CHIPS: { key: "all" | ServiceCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "cut", label: "Cut" },
  { key: "color", label: "Color" },
  { key: "perm", label: "Perm" },
  { key: "beard", label: "Beard" },
];

/** Public browse page: every barber as a marketplace-style card. */
export default function BarbersPage() {
  useDocumentTitle("Find your barber — Barberly");
  const navigate = useNavigate();
  const session = useSession();
  const settings = usePlatformSettings();
  const [barbers, setBarbers] = useState<BarberCard[] | null>(null);
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<"all" | ServiceCategory>("all");
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    supabase
      .from("barbers")
      .select(
        "*, services(category, price), barber_photos(storage_path, is_featured, sort_order, created_at)",
      )
      .order("created_at")
      .then(({ data, error }) => {
        if (error) toast.error(errMessage(error, "Couldn't load barbers."));
        setBarbers((data as BarberCard[] | null) ?? []);
      });
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (barbers ?? []).filter((b) => {
      const text = [b.name, b.address, b.intro].join(" ").toLowerCase();
      if (q && !text.includes(q)) return false;
      if (chip !== "all" && !b.services.some((s) => s.category === chip)) return false;
      return true;
    });
  }, [barbers, query, chip]);

  async function becomeShop() {
    setUpgrading(true);
    const { data, error } = await supabase.rpc("become_shop");
    setUpgrading(false);
    if (error || data !== "shop") {
      toast.error(errMessage(error, "Couldn't switch this account to a shop."));
      return;
    }
    toast.success("You're a shop now. Let's set it up.");
    navigate("/shop");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader session={session} />

      <section className="mx-auto max-w-7xl px-6 pt-4">
        <div className="rounded-[2rem] bg-velvet px-6 py-10 text-center md:py-14">
          <h1 className="text-4xl font-medium md:text-5xl">Find your barber</h1>
          <p className="mt-3 text-muted-foreground">
            瀏覽所有理髮師，挑一位喜歡的作品風格，直接預約時段。
          </p>
          <div className="mx-auto mt-8 flex max-w-md items-center rounded-full bg-walnut p-1.5 shadow-lift">
            <Search className="ml-4 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋名稱或地址 / Search name or address"
              aria-label="Search barbers"
              className="h-11 flex-1 bg-transparent px-3 text-sm outline-none"
            />
          </div>
          <div
            className="mt-6 flex flex-wrap justify-center gap-2"
            role="group"
            aria-label="Category"
          >
            {CHIPS.map((c) => (
              <button
                key={c.key}
                onClick={() => setChip(c.key)}
                aria-pressed={chip === c.key}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${chip === c.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-walnut hover:bg-secondary"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-10">
        {barbers === null ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-3xl" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            {barbers.length === 0
              ? "還沒有理髮師上架。"
              : "找不到符合的理髮師，換個關鍵字或分類試試。"}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((b) => (
              <BarberCardView key={b.id} barber={b} from={fromPrice(b, settings)} />
            ))}
          </div>
        )}

        {session.user && session.role === "customer" && (
          <p className="mt-16 text-center text-sm text-muted-foreground">
            Run a barbershop?{" "}
            <Button variant="link" className="h-auto p-0" onClick={becomeShop} disabled={upgrading}>
              {upgrading ? "Switching…" : "開店 / Become a shop"}
            </Button>
          </p>
        )}
      </main>
    </div>
  );
}

function fromPrice(b: BarberCard, settings: ReturnType<typeof usePlatformSettings>) {
  if (b.services.length === 0) return null;
  return formatMoney(Math.min(...b.services.map((s) => s.price)), settings);
}

function BarberCardView({ barber, from }: { barber: BarberCard; from: string | null }) {
  const photo = repPhoto(barber.barber_photos);
  const categories = [...new Set(barber.services.map((s) => s.category as ServiceCategory))];
  return (
    <Link
      to={`/barbers/${barber.id}`}
      className="group block overflow-hidden rounded-3xl border border-border bg-walnut card-lift"
    >
      {photo ? (
        <img
          src={photoUrl(photo.storage_path)}
          alt={`${barber.name} 的作品`}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div className="grid aspect-square w-full place-items-center bg-leather text-muted-foreground">
          <Scissors className="h-10 w-10" />
        </div>
      )}
      <div className="p-5">
        <h3 className="text-xl font-medium">{barber.name}</h3>
        {barber.address && (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{barber.address}</span>
          </p>
        )}
        {barber.intro && <p className="mt-2 line-clamp-2 text-sm">{barber.intro}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <span
              key={c}
              className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
            >
              {CATEGORY_LABELS[c] ?? c}
            </span>
          ))}
        </div>
        {from && <p className="mt-4 text-sm font-medium">from {from}</p>}
      </div>
    </Link>
  );
}
