import { Link, useNavigate } from "react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/lib/page-meta";
import heroRight from "@/assets/hero-right.jpg";

const META = [
  { name: "description", content: "Sign in to Barberly, or create an account as a customer or a barber." },
  { property: "og:title", content: "Sign in — Barberly" },
  { property: "og:description", content: "Join Barberly as a customer or a barber." },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary" },
];

type Role = "customer" | "shop";

type Mode = "signin" | "signup";

export default function Login({ mode }: { mode: Mode }) {
  usePageMeta("Sign in or sign up — Barberly", META);
  const navigate = useNavigate();
  const setMode = (next: Mode) => navigate(next === "signin" ? "/sign-in" : "/sign-up");
  const [role, setRole] = useState<Role>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate("/app", { replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { role } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Account created — please sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate("/app", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-2">
      <div className="flex flex-col px-6 py-6 md:px-12">
        <Link to="/" className="font-serif text-3xl font-semibold">Barberly</Link>
        <div className="m-auto w-full max-w-sm animate-fade-up py-10">
          <h1 className="text-5xl font-medium">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to book your next look." : "Join as a customer or list yourself as a barber."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            {mode === "signup" && (
              <div role="tablist" aria-label="Account type" className="grid grid-cols-2 rounded-full bg-muted p-1">
                {(["customer", "shop"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="tab"
                    aria-selected={role === r}
                    onClick={() => setRole(r)}
                    className={cn(
                      "rounded-full py-2 text-sm font-medium transition-all",
                      role === r ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r === "customer" ? "Customer" : "Barber"}
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl bg-card" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl bg-card" />
            </div>
            <Button type="submit" variant="pill" disabled={loading} className="h-11 w-full">
              {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to Barberly? " : "Already have an account? "}
            <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-semibold text-foreground underline-offset-4 hover:underline">
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
      <div className="hidden p-4 md:block">
        <img src={heroRight} alt="" className="h-full w-full rounded-[2rem] object-cover" />
      </div>
    </div>
  );
}
