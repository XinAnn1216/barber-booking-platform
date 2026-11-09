import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth";

type Session = ReturnType<typeof useSession>;

/** Navbar for the public, customer-facing pages. */
export function SiteHeader({ session }: { session: Session }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading } = session;

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/barbers");
  }

  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`;

  const next = encodeURIComponent(location.pathname + location.search);

  return (
    <header className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-5">
      <Link to="/" className="font-serif text-2xl font-semibold">
        Barberly
      </Link>
      <nav className="flex rounded-full bg-muted p-1" aria-label="Main">
        <NavLink to="/barbers" className={tab}>
          理髮師 / Barbers
        </NavLink>
        {user && role === "customer" && (
          <NavLink to="/bookings" className={tab}>
            我的預約 / My bookings
          </NavLink>
        )}
        {user && role === "shop" && (
          <NavLink to="/shop" className={tab}>
            Shop dashboard
          </NavLink>
        )}
      </nav>
      <div className="ml-auto flex items-center gap-3 text-sm">
        {loading ? null : user ? (
          <>
            <span className="hidden sm:inline">{user.email}</span>
            <Button variant="pill" onClick={signOut}>
              Sign Out
            </Button>
          </>
        ) : (
          <Button asChild variant="pill">
            <Link to={`/login?next=${next}`}>Login</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
