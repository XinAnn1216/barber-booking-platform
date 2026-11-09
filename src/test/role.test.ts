import { describe, expect, it } from "vitest";
import { homePathFor, isOnboarded, roleOf } from "@/lib/auth";
import { splitIntoSlots } from "@/lib/platform";

describe("roleOf (reads profiles.role)", () => {
  it("returns shop only when the profile role is shop", () => {
    expect(roleOf({ role: "shop" })).toBe("shop");
  });
  it("recognises admin", () => {
    expect(roleOf({ role: "admin" })).toBe("admin");
  });
  it("defaults to customer", () => {
    expect(roleOf(null)).toBe("customer");
    expect(roleOf({ role: "customer" })).toBe("customer");
  });
});

describe("homePathFor", () => {
  it("sends shops to the shop dashboard and customers to the browse page", () => {
    expect(homePathFor("shop")).toBe("/shop");
    expect(homePathFor("customer")).toBe("/barbers");
    expect(homePathFor("admin")).toBe("/admin/payouts");
  });
});

describe("isOnboarded", () => {
  it("needs shop name and both bank fields", () => {
    expect(
      isOnboarded({ display_name: "Cuts", bank_account_name: "A", bank_account_number: "1" }),
    ).toBe(true);
    expect(
      isOnboarded({ display_name: " ", bank_account_name: "A", bank_account_number: "1" }),
    ).toBe(false);
    expect(
      isOnboarded({ display_name: "Cuts", bank_account_name: null, bank_account_number: "1" }),
    ).toBe(false);
  });
});

describe("splitIntoSlots", () => {
  it("splits a range into slot-length windows and drops a partial tail", () => {
    const start = new Date("2026-11-10T10:00:00Z");
    const end = new Date("2026-11-10T11:45:00Z");
    const slots = splitIntoSlots(start, end, 30);
    expect(slots).toHaveLength(3);
    expect(slots[0]).toEqual({
      starts_at: "2026-11-10T10:00:00.000Z",
      ends_at: "2026-11-10T10:30:00.000Z",
    });
    expect(slots[2]?.ends_at).toBe("2026-11-10T11:30:00.000Z");
  });
});
