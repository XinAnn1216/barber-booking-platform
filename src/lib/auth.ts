import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/** Roles a person can pick at sign-up or upgrade to. */
export type Role = "customer" | "shop";

/** Every role the app routes on. 'admin' is set only by a migration, never from the UI. */
export type AppRole = Role | "admin";

export type Profile = Tables<"profiles">;

/** The role always comes from the `profiles` row, never from auth metadata. */
export function roleOf(profile: Pick<Profile, "role"> | null | undefined): AppRole {
  if (profile?.role === "shop" || profile?.role === "admin") return profile.role;
  return "customer";
}

/** A shop finishes signup once its shop name and both bank fields are filled. */
export function isOnboarded(
  p: Pick<Profile, "display_name" | "bank_account_name" | "bank_account_number">,
): boolean {
  return [p.display_name, p.bank_account_name, p.bank_account_number].every(
    (v) => (v ?? "").trim() !== "",
  );
}

/** Where a signed-in person lands, by role. */
export function homePathFor(role: AppRole): string {
  if (role === "shop") return "/shop";
  if (role === "admin") return "/admin/payouts";
  return "/barbers";
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return { user, loading };
}

/** The signed-in user plus their `profiles` row (role, shop name, bank fields). */
export function useSession() {
  const { user, loading: userLoading } = useAuthUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      setProfile(await fetchProfile(user.id));
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!userLoading) void reload();
  }, [userLoading, reload]);

  return {
    user,
    profile,
    role: roleOf(profile),
    loading: userLoading || (user !== null && profileLoading),
    reload,
  };
}
