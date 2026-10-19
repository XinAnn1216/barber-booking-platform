import { Link, useLoaderData, useNavigate } from "react-router";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/lib/page-meta";

const META = [
  { name: "description", content: "Your Barberly home." },
  { property: "og:title", content: "Your Barberly" },
  { property: "og:description", content: "Your Barberly home." },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary" },
  { name: "robots", content: "noindex" },
];

export default function Barbers() {
  usePageMeta("Your Barberly", META);
  const { user } = useLoaderData() as { user: User };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isShop = user?.user_metadata?.["role"] === "shop";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/sign-in", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4 md:px-8">
          <Link to="/" className="font-serif text-3xl font-semibold">Barberly</Link>
          <div className="ml-auto flex min-w-0 items-center gap-2 text-sm">
            <span className="truncate">Hi {user?.email}</span>
            {isShop && <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold">barber</span>}
            <Button variant="pill-outline" size="sm" onClick={signOut} className="ml-2 px-4">Sign Out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl animate-fade-up px-5 py-24 text-center">
        <div className="rounded-[2rem] bg-cream px-6 py-16">
          {isShop ? (
            <>
              <h1 className="text-3xl font-medium md:text-4xl">理髮師後台即將上線 — 下一個里程碑會加上個人檔案、服務項目與排班管理。</h1>
              <p className="mt-4 text-muted-foreground">Your barber dashboard is coming soon — profile, services & schedule arrive in the next milestone.</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-medium md:text-4xl">附近的理髮師即將上線 — 下一個里程碑會加上瀏覽與預約功能。</h1>
              <p className="mt-4 text-muted-foreground">Barbers near you are coming soon — browse & booking arrive in the next milestone.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
