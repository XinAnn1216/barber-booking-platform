import { Link, useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth";

export default function LoginPage() {
  useDocumentTitle("Sign in or sign up — Barberly");
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<Role>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin, data: { role } },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate("/barbers");
  }

  const seg = (active: boolean) =>
    `flex-1 rounded-full py-2 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`;

  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4">
      <div className="w-full max-w-md rounded-[2rem] bg-card p-8 shadow-lift animate-fade-up">
        <Link to="/" className="font-serif text-2xl font-semibold">Barberly</Link>
        <h1 className="mt-6 text-3xl font-medium">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div role="tablist" aria-label="Account type" className="flex rounded-full bg-muted p-1">
              <button type="button" role="tab" aria-selected={role === "customer"} className={seg(role === "customer")} onClick={() => setRole("customer")}>Customer</button>
              <button type="button" role="tab" aria-selected={role === "shop"} className={seg(role === "shop")} onClick={() => setRole("shop")}>Barber</button>
            </div>
          )}
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <Button type="submit" variant="pill" className="h-12 w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to Barberly? " : "Already have an account? "}
          <button className="font-medium text-foreground underline underline-offset-4" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
