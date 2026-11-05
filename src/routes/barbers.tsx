import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { roleOf, useAuthUser } from "@/lib/auth";

export const Route = createFileRoute("/barbers")({
  head: () => ({
    meta: [
      { title: "Your Barberly" },
      { name: "description", content: "Your Barberly home — browsing and barber dashboard coming soon." },
      { property: "og:title", content: "Your Barberly" },
      { property: "og:description", content: "Barbers near you are coming soon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BarbersPage,
});

function BarbersPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) return <div className="min-h-screen bg-background" />;
  const isShop = roleOf(user) === "shop";

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-5">
        <Link to="/" className="font-serif text-2xl font-semibold">Barberly</Link>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">Hi {user.email}</span>
          {isShop && <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-medium">barber</span>}
          <Button variant="pill" onClick={signOut}>Sign Out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-24">
        <div className="rounded-[2rem] bg-cream p-12 text-center animate-fade-up">
          <h1 className="text-4xl font-medium">{isShop ? "Your dashboard" : "Find your barber"}</h1>
          {isShop ? (
            <>
              <p className="mt-6 text-lg">理髮師後台即將上線 — 下一個里程碑會加上個人檔案、服務項目與排班管理。</p>
              <p className="mt-2 text-muted-foreground">Your barber dashboard is coming soon — profile, services & schedule arrive in the next milestone.</p>
            </>
          ) : (
            <>
              <p className="mt-6 text-lg">附近的理髮師即將上線 — 下一個里程碑會加上瀏覽與預約功能。</p>
              <p className="mt-2 text-muted-foreground">Barbers near you are coming soon — browse & booking arrive in the next milestone.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
