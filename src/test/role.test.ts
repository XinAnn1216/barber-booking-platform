import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { roleOf } from "@/lib/auth";

const u = (meta: Record<string, unknown>) => ({ user_metadata: meta }) as unknown as User;

describe("roleOf", () => {
  it("returns shop only when metadata role is shop", () => {
    expect(roleOf(u({ role: "shop" }))).toBe("shop");
  });
  it("defaults to customer", () => {
    expect(roleOf(u({}))).toBe("customer");
    expect(roleOf(u({ role: "admin" }))).toBe("customer");
  });
});
