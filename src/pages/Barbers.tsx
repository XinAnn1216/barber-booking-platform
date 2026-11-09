import { Link, useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { homePathFor, useSession } from "@/lib/auth";

/** Customer landing page. Shops are sent to their dashboard. */
export default function BarbersPage() {
  useDocumentTitle("Your Barberly");
  const navigate = useNavigate();
  const { user, role, loading } = useSession();
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/login", { replace: true });
    else if (role === "shop") navigate(homePathFor("shop"), { replace: true });
  }, [loading, user, role, navigate]);

  if (loading || !user || role === "shop") return <div className="min-h-screen bg-background" />;

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  async function becomeShop() {
    setUpgrading(true);
    const { data, error } = await supabase.rpc("become_shop");
    setUpgrading(false);
    if (error || data !== "shop") {
      toast.error(error?.message ?? "Couldn't switch this account to a shop.");
      return;
    }
    toast.success("You're a shop now. Let's set it up.");
    navigate("/shop");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-5">
        <Link to="/" className="font-serif text-2xl font-semibold">
          Barberly
        </Link>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">Hi {user.email}</span>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={becomeShop}
            disabled={upgrading}
          >
            {upgrading ? "Switching…" : "開店 / Become a shop"}
          </Button>
          <Button variant="pill" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-24">
        <div className="rounded-[2rem] bg-velvet p-12 text-center shadow-lift animate-fade-up">
          <h1 className="text-4xl font-medium">Find your barber</h1>
          <p className="mt-6 text-lg">附近的理髮師即將上線 — 很快就能瀏覽與預約。</p>
          <p className="mt-2 text-muted-foreground">
            Barbers near you are coming soon — browse & booking are on the way.
          </p>
          <p className="mt-10 text-sm text-muted-foreground">
            Run a barbershop? Use <span className="font-medium text-foreground">Become a shop</span>{" "}
            to list your barbers, services and open slots.
          </p>
        </div>
      </main>
    </div>
  );
}
