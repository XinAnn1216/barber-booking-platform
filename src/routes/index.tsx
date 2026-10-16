import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BadgeCheck, CalendarCheck, Search, ShieldCheck, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FEATURED_BARBERS, SERVICES } from "@/lib/barbers";
import heroLeft from "@/assets/hero-left.jpg";
import heroRight from "@/assets/hero-right.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Barberly — Find your stylist and book in a few taps" },
      { name: "description", content: "Discover top-rated barbers and stylists near you. Cut, Color, Perm and Beard — book online in seconds." },
      { property: "og:title", content: "Barberly — Style with Confident Hair" },
      { property: "og:description", content: "Discover top-rated barbers near you and book online in a few taps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FILTERS = ["All", ...SERVICES] as const;
const PARTNERS = ["Oak & Blade", "LUMEN", "Ink & Fade", "MAISON COIF", "The Gentleman's Chair", "NORTH BARBERS"];
const FEATURES = [
  { icon: BadgeCheck, label: "Verified Barbers" },
  { icon: CalendarCheck, label: "Instant Booking" },
  { icon: ShieldCheck, label: "Secure Payment" },
  { icon: Sparkles, label: "Top-Rated Styles" },
];

function SearchField({ className, large }: { className?: string; large?: boolean }) {
  return (
    <label className={cn("flex items-center gap-3 rounded-full border border-border bg-card px-5 shadow-soft", large ? "h-14" : "h-10", className)}>
      <Search className="size-4 shrink-0 text-muted-foreground" />
      <input
        type="search"
        placeholder="Find your stylist or search a style"
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}

function Index() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const barbers = filter === "All" ? FEATURED_BARBERS : FEATURED_BARBERS.filter((b) => b.services.includes(filter));

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-5 md:px-8">
        <Link to="/" className="font-serif text-3xl font-semibold tracking-tight">Barberly</Link>
        <SearchField className="ml-auto hidden max-w-sm flex-1 md:flex" />
        <Button asChild variant="pill" className="ml-auto px-6 md:ml-0">
          <Link to="/login">Login</Link>
        </Button>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-5 pt-6 pb-16 md:px-8">
          <div className="relative grid items-center gap-6 rounded-[2rem] bg-cream px-5 py-10 md:grid-cols-[1fr_1.3fr_1fr] md:px-10 md:py-14">
            <img src={heroLeft} alt="Textured fade haircut" width={768} height={1024} className="hidden aspect-[3/4] w-full animate-fade-up rounded-3xl object-cover md:block" />
            <div className="animate-fade-up text-center [animation-delay:120ms]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">New Look</p>
              <h1 className="mt-4 text-5xl leading-[0.95] font-medium md:text-7xl">Style with Confident Hair</h1>
              <SearchField large className="mx-auto mt-8 max-w-md" />
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm transition-colors",
                      filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <img src={heroRight} alt="Glossy wavy bob" width={768} height={1024} className="hidden aspect-[3/4] w-full animate-fade-up rounded-3xl object-cover [animation-delay:240ms] md:block" />
            <div className="grid grid-cols-2 gap-3 md:hidden">
              <img src={heroLeft} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover" />
              <img src={heroRight} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover" />
            </div>
          </div>
        </section>

        {/* Logo strip */}
        <section className="border-y border-border">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-5 py-8 md:justify-between md:px-8">
            {PARTNERS.map((p) => (
              <span key={p} className="font-serif text-xl tracking-wide text-muted-foreground/80">{p}</span>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
          <h2 className="text-center text-4xl font-medium md:text-5xl">Best booking experience</h2>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-4 rounded-3xl bg-muted px-4 py-8 text-center">
                <span className="grid size-14 place-items-center rounded-full bg-card shadow-soft">
                  <Icon className="size-6" />
                </span>
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Popular */}
        <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
          <div className="flex items-end justify-between">
            <h2 className="text-4xl font-medium md:text-5xl">Popular</h2>
            <span className="text-sm text-muted-foreground">{filter === "All" ? "All services" : filter}</span>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {barbers.map((b) => (
              <a key={b.id} href="#" onClick={(e) => e.preventDefault()} className="group block overflow-hidden rounded-3xl bg-card shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift">
                <div className="relative">
                  <img src={b.photo} alt={b.name} loading="lazy" width={512} height={512} className="aspect-square w-full object-cover" />
                  <span className="absolute top-3 left-3 rounded-full bg-card/90 px-3 py-1 text-xs font-semibold">Popular</span>
                </div>
                <div className="p-5">
                  <h3 className="text-2xl font-semibold">{b.name}</h3>
                  <p className="text-sm text-muted-foreground">{b.shop}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {b.services.map((s) => (
                      <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{s}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Star className="size-4 fill-star text-star" />
                      <span className="font-semibold">{b.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({b.reviews})</span>
                    </span>
                    <span>from <span className="font-semibold">${b.fromPrice}</span></span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">© 2026 Barberly</footer>
    </div>
  );
}
