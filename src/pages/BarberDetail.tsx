import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookDialog } from "@/components/buyer/BookDialog";
import { PhotoCarousel } from "@/components/buyer/PhotoCarousel";
import { SiteHeader } from "@/components/buyer/SiteHeader";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useSession } from "@/lib/auth";
import { fetchFreeSlots, orderPhotos, type Barber, type Photo, type Service } from "@/lib/barbers";
import {
  CATEGORY_LABELS,
  DISPLAY_TZ_LABEL,
  formatDay,
  formatTime,
  groupByDay,
  type ServiceCategory,
  type SlotWindow,
} from "@/lib/booking";
import { errMessage } from "@/lib/errors";
import { formatMoney, usePlatformSettings } from "@/lib/platform";

type Detail = Barber & { services: Service[]; barber_photos: Photo[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public barber detail: photo gallery, services, free slots, and the Book dialog. */
export default function BarberDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const settings = usePlatformSettings();
  const [barber, setBarber] = useState<Detail | null | undefined>(undefined);
  const [freeSlots, setFreeSlots] = useState<SlotWindow[]>([]);
  const [bookOpen, setBookOpen] = useState(false);
  const [presetService, setPresetService] = useState<string | null>(null);
  useDocumentTitle(barber ? `${barber.name} — Barberly` : "Barber — Barberly");

  const loadSlots = useCallback(async () => {
    try {
      setFreeSlots(await fetchFreeSlots(id));
    } catch (e) {
      toast.error(errMessage(e, "Couldn't load available times."));
    }
  }, [id]);

  useEffect(() => {
    if (!UUID.test(id)) {
      setBarber(null);
      return;
    }
    supabase
      .from("barbers")
      .select("*, services(*), barber_photos(*)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(errMessage(error, "Couldn't load this barber."));
        setBarber((data as Detail | null) ?? null);
      });
    void loadSlots();
  }, [id, loadSlots]);

  function book(serviceId: string | null = null) {
    if (!session.user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (session.role !== "customer") {
      toast.error("請用客人（Customer）帳號預約。Shop accounts can't book.");
      return;
    }
    setPresetService(serviceId);
    setBookOpen(true);
  }

  if (barber === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader session={session} />
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-6 lg:grid-cols-[3fr_2fr]">
          <Skeleton className="aspect-[4/3] rounded-[2rem]" />
          <Skeleton className="h-80 rounded-[2rem]" />
        </div>
      </div>
    );
  }

  if (barber === null) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader session={session} />
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="text-3xl font-medium">找不到這位理髮師</h1>
          <Button asChild variant="pill" className="mt-8">
            <Link to="/barbers">回到理髮師列表</Link>
          </Button>
        </div>
      </div>
    );
  }

  const photos = orderPhotos(barber.barber_photos);
  const services = [...barber.services].sort((a, b) => a.price - b.price);
  const days = groupByDay(freeSlots);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader session={session} />
      <main className="mx-auto max-w-7xl px-6 pb-24">
        <Link
          to="/barbers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 所有理髮師
        </Link>

        <div className="mt-4 grid gap-10 lg:grid-cols-[3fr_2fr]">
          <PhotoCarousel photos={photos} name={barber.name} />

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-medium">{barber.name}</h1>
              {barber.address && (
                <p className="mt-2 flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" /> {barber.address}
                </p>
              )}
              {services.length > 0 && (
                <p className="mt-3 text-xl font-medium">
                  from {formatMoney(services[0]!.price, settings)}
                </p>
              )}
            </div>
            {barber.intro && <p className="whitespace-pre-line leading-relaxed">{barber.intro}</p>}
            <Button
              variant="pill"
              className="h-12 w-full text-base"
              onClick={() => book()}
              disabled={services.length === 0}
            >
              <CalendarDays className="mr-2 h-5 w-5" /> Book 預約
            </Button>
          </div>
        </div>

        <section className="mt-12 rounded-[2rem] bg-walnut p-6 shadow-lift md:p-8">
          <h2 className="text-2xl font-medium">服務 / Services</h2>
          {services.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">這位理髮師還沒有上架服務。</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {services.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {CATEGORY_LABELS[s.category as ServiceCategory] ?? s.category} ·{" "}
                      {s.required_slots * settings.slot_minutes} 分鐘（{s.required_slots} 個時段）
                    </p>
                  </div>
                  <span className="font-medium">{formatMoney(s.price, settings)}</span>
                  <Button variant="outline" className="rounded-full" onClick={() => book(s.id)}>
                    Book
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 rounded-[2rem] bg-walnut p-6 shadow-lift md:p-8">
          <h2 className="text-2xl font-medium">可預約時段 / Available slots</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            每格 {settings.slot_minutes} 分鐘，時間為{DISPLAY_TZ_LABEL}。按 Book
            選服務後，會只列出湊得滿該服務長度的開始時間。
          </p>
          {days.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">目前沒有空檔。</p>
          ) : (
            <div className="mt-4 space-y-4">
              {days.map(([k, slots]) => (
                <div key={k}>
                  <p className="text-sm font-medium">{formatDay(slots[0]!.starts_at)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <span key={s.id} className="rounded-full bg-background px-3 py-1 text-sm">
                        {formatTime(s.starts_at)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BookDialog
        open={bookOpen}
        onOpenChange={setBookOpen}
        barberName={barber.name}
        services={services}
        freeSlots={freeSlots}
        settings={settings}
        initialServiceId={presetService}
        onBooked={loadSlots}
      />
    </div>
  );
}
