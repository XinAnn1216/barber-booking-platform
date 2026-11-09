import { useEffect, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { homePathFor, useSession, type Profile } from "@/lib/auth";

type ShopSession = { user: User; profile: Profile; reload: () => Promise<void> };

/** Gate for shop pages: signed-out → /login, customers → their landing page. */
export function ShopLayout({ children }: { children: (s: ShopSession) => ReactNode }) {
  const navigate = useNavigate();
  const { user, profile, role, loading, reload } = useSession();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/login", { replace: true });
    else if (role !== "shop") navigate(homePathFor(role), { replace: true });
  }, [loading, user, role, navigate]);

  if (loading || !user || !profile || role !== "shop")
    return <div className="min-h-screen bg-background" />;

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-5">
        <Link to="/" className="font-serif text-2xl font-semibold">
          Barberly
        </Link>
        <nav className="flex rounded-full bg-muted p-1" aria-label="Shop">
          <NavLink to="/shop" end className={tab}>
            Shop setup
          </NavLink>
          <NavLink to="/shop/bookings" className={tab}>
            Services & slots
          </NavLink>
          <NavLink to="/shop/earnings" className={tab}>
            收入 / Earnings
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">{profile.display_name || user.email}</span>
          <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-medium text-accent-foreground">
            shop
          </span>
          <Button variant="pill" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-4">
        {children({ user, profile, reload })}
      </main>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] bg-walnut p-6 shadow-lift md:p-8">
      <h2 className="text-2xl font-medium">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export const fieldClass =
  "h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring";
export const textareaClass =
  "min-h-24 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
