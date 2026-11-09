import { describe, expect, it } from "vitest";
import { monthKey, split, totals } from "@/lib/payouts";

describe("split", () => {
  it("always sums back to the price", () => {
    for (const price of [300, 500, 1, 7, 999, 1250]) {
      const { platform_cut, shop_cut } = split(price, 0.2);
      expect(platform_cut + shop_cut).toBe(price);
    }
    expect(split(300, 0.2)).toEqual({ platform_cut: 60, shop_cut: 240 });
  });
});

describe("totals", () => {
  it("adds gross, platform and shop cuts", () => {
    expect(
      totals([
        { price: 300, platform_cut: 60, shop_cut: 240 },
        { price: 500, platform_cut: 100, shop_cut: 400 },
      ]),
    ).toEqual({ count: 2, gross: 800, platform: 160, shop: 640 });
  });
});

describe("monthKey", () => {
  it("uses Taipei time, so 16:30Z on the last day is next month", () => {
    expect(monthKey("2026-11-30T16:30:00Z")).toBe("2026-12");
    expect(monthKey("2026-11-09T09:00:00Z")).toBe("2026-11");
  });
});
