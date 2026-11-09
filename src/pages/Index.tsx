import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useState } from "react";
import { BadgeCheck, Zap, ShieldCheck, Star, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroLeft from "@/assets/hero-left.jpg";
import heroRight from "@/assets/hero-right.jpg";
import b1 from "@/assets/barber-1.jpg";
import b2 from "@/assets/barber-2.jpg";
import b3 from "@/assets/barber-3.jpg";
import b4 from "@/assets/barber-4.jpg";

const CHIPS = ["All", "Cut", "Color", "Perm", "Beard"] as const;
const LOGOS = ["MAISON", "Atelier Noir", "CUTHOUSE", "Golden Comb", "STUDIO K", "Ivory & Co"];
const FEATURES = [
  { icon: BadgeCheck, label: "Verified Barbers" },
  { icon: Zap, label: "Instant Booking" },
  { icon: ShieldCheck, label: "Secure Payment" },
  { icon: Star, label: "Top-Rated Styles" },
];
const BARBERS = [
  { name: "Marco Reyes", shop: "Cuthouse · Da'an", img: b1, services: ["Cut", "Beard"], rating: 4.9, reviews: 312, from: 25 },
  { name: "Sofia Lin", shop: "Atelier Noir · Xinyi", img: b2, services: ["Cut", "Color"], rating: 4.8, reviews: 207, from: 40 },
  { name: "Mia Chen", shop: "Studio K · Zhongshan", img: b3, services: ["Cut", "Perm", "Color"], rating: 4.9, reviews: 184, from: 35 },
  { name: "Andre Cole", shop: "Golden Comb · Songshan", img: b4, services: ["Cut", "Beard"], rating: 4.7, reviews: 156, from: 22 },
];

function Wordmark() {
  return <Link to="/" className="font-serif text-2xl font-semibold tracking-tight">Barberly</Link>;
}

export default function Index() {
  useDocumentTitle("Barberly — Find your stylist and book online");
  const [chip, setChip] = useState<(typeof CHIPS)[number]>("All");
  const shown = BARBERS.filter((b) => chip === "All" || b.services.includes(chip));

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-5">
        <Wordmark />
        <div className="relative ml-auto hidden max-w-xs flex-1 md:block">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search" className="h-10 w-full rounded-full bg-muted pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <Link to="/barbers" className="ml-auto text-sm font-medium hover:underline md:ml-0">Browse barbers</Link>
        <Button asChild variant="pill"><Link to="/login">Login</Link></Button>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-velvet px-6 py-14 md:py-20">
          <img src={heroLeft} alt="Man with textured crop haircut" width={768} height={1024}
            className="absolute bottom-0 left-0 hidden h-[90%] w-auto rounded-tr-[2rem] object-cover lg:block animate-fade-up" />
          <img src={heroRight} alt="Woman with glossy wavy hair" width={768} height={1024}
            className="absolute bottom-0 right-0 hidden h-[90%] w-auto rounded-tl-[2rem] object-cover lg:block animate-fade-up" />
          <div className="relative mx-auto max-w-xl text-center animate-fade-up">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">New Look</p>
            <h1 className="mt-4 text-5xl font-medium leading-[1.05] md:text-7xl">Style with <em>Confident</em> Hair</h1>
            <div className="mx-auto mt-10 flex max-w-md items-center rounded-full bg-walnut p-1.5 shadow-lift">
              <Search className="ml-4 h-4 w-4 text-muted-foreground" />
              <input placeholder="Find your stylist or search a style" className="h-11 flex-1 bg-transparent px-3 text-sm outline-none" />
              <Button variant="pill" className="h-11">Search</Button>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {CHIPS.map((c) => (
                <button key={c} onClick={() => setChip(c)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition ${chip === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-walnut hover:bg-secondary"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-walnut">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-around gap-8 px-6 py-8">
          {LOGOS.map((l) => <span key={l} className="font-serif text-xl italic text-muted-foreground">{l}</span>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-center text-4xl font-medium">Best booking experience</h2>
        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {FEATURES.map(({ icon: Icon, label }, i) => (
            <div key={label} className="flex flex-col items-center gap-4 rounded-3xl bg-leather p-8 text-center animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift"><Icon className="h-6 w-6" /></span>
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <h2 className="text-4xl font-medium">Popular</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((b) => (
            <a key={b.name} href="#" onClick={(e) => e.preventDefault()} className="group block overflow-hidden rounded-3xl bg-walnut border border-border card-lift">
              <div className="relative">
                <img src={b.img} alt={b.name} loading="lazy" width={600} height={600} className="aspect-square w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">Popular</span>
              </div>
              <div className="p-5">
                <h3 className="text-xl font-medium">{b.name}</h3>
                <p className="text-sm text-muted-foreground">{b.shop}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {b.services.map((s) => <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{s}</span>)}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-star text-star" />{b.rating} <span className="text-muted-foreground">({b.reviews})</span></span>
                  <span className="font-medium">from ${b.from}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">© 2026 Barberly</footer>
    </div>
  );
}
