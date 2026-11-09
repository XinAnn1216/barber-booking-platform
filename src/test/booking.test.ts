import { describe, expect, it } from "vitest";
import { dayKey, groupByDay, safeNext, startRuns, type SlotWindow } from "@/lib/booking";

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 28, h, m)).toISOString();
const slot = (id: string, h: number, m: number): SlotWindow => ({
  id,
  starts_at: at(h, m),
  ends_at: new Date(Date.parse(at(h, m)) + 30 * 60_000).toISOString(),
});

describe("startRuns", () => {
  // 01:00, 01:30, 02:00, then a gap (02:30 held), 03:00, 03:30
  const free = [
    slot("a", 1, 0),
    slot("b", 1, 30),
    slot("c", 2, 0),
    slot("e", 3, 0),
    slot("f", 3, 30),
  ];

  it("offers every free slot for a 1-slot service", () => {
    expect([...startRuns(free, 1).keys()]).toEqual(["a", "b", "c", "e", "f"]);
  });

  it("only offers starts with n back-to-back free slots", () => {
    const runs = startRuns(free, 3);
    expect([...runs.keys()]).toEqual(["a"]);
    expect(runs.get("a")).toEqual(["a", "b", "c"]);
  });

  it("does not bridge a held slot", () => {
    expect([...startRuns(free, 2).keys()]).toEqual(["a", "b", "e"]);
  });

  it("works on unsorted input", () => {
    expect([...startRuns([...free].reverse(), 2).keys()]).toEqual(["a", "b", "e"]);
  });
});

describe("dates in Taipei time", () => {
  it("puts a 16:30 UTC slot on the next Taipei day", () => {
    expect(dayKey(at(16, 30))).toBe("2026-11-29");
    expect(dayKey(at(15, 30))).toBe("2026-11-28");
    expect(groupByDay([slot("x", 16, 30), slot("y", 15, 30)]).map(([k]) => k)).toEqual([
      "2026-11-28",
      "2026-11-29",
    ]);
  });
});

describe("safeNext", () => {
  it("allows same-origin paths only", () => {
    expect(safeNext("/barbers/123")).toBe("/barbers/123");
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("https://evil.com")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});
