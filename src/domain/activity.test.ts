import { describe, expect, it } from "vitest";
import {
  ACTIVITY_CATEGORIES,
  addDaysKey,
  buildCalendarGrid,
  categoryOfKind,
  categoryTotals,
  compactWindow,
  countsByDay,
  dayBin,
  emptyCounts,
  type ActivityRow,
} from "./activity";

describe("categoryOfKind", () => {
  it("maps every drill kind to drill and keeps srs/grammar/jlpt exclusive", () => {
    for (const kind of ["kana", "kanji", "vocab", "numbers", "dates", "conjugation"]) {
      expect(categoryOfKind(kind)).toBe("drill");
    }
    expect(categoryOfKind("srs")).toBe("srs");
    expect(categoryOfKind("grammar")).toBe("grammar");
    expect(categoryOfKind("jlpt")).toBe("jlpt");
    expect(categoryOfKind("anything-legacy")).toBe("drill");
  });
});

describe("dayBin", () => {
  it("clamps to the fixed 0/1/2/3/4+ bins", () => {
    expect(dayBin(0)).toBe(0);
    expect(dayBin(1)).toBe(1);
    expect(dayBin(2)).toBe(2);
    expect(dayBin(3)).toBe(3);
    expect(dayBin(4)).toBe(4);
    expect(dayBin(12)).toBe(4);
    expect(dayBin(-2)).toBe(0);
  });
});

describe("countsByDay and categoryTotals", () => {
  const row = (id: string, category: ActivityRow["category"], date: string): ActivityRow => ({
    id,
    category,
    date,
    ts: 0,
  });

  it("aggregates rows per local day", () => {
    const byDay = countsByDay([
      row("a", "drill", "2026-09-22"),
      row("b", "drill", "2026-09-22"),
      row("c", "jlpt", "2026-09-22"),
      row("d", "srs", "2026-09-21"),
    ]);
    expect(byDay.get("2026-09-22")).toEqual({ drill: 2, srs: 0, grammar: 0, jlpt: 1 });
    expect(byDay.get("2026-09-21")).toEqual({ drill: 0, srs: 1, grammar: 0, jlpt: 0 });
  });

  it("reports zero shares, not NaN, when nothing was completed", () => {
    const totals = categoryTotals([emptyCounts()]);
    expect(totals.total).toBe(0);
    for (const category of ACTIVITY_CATEGORIES) {
      expect(totals.shares[category]).toBe(0);
      expect(Number.isNaN(totals.shares[category])).toBe(false);
    }
  });

  it("computes shares over the selected range only", () => {
    const byDay = countsByDay([
      row("a", "grammar", "2026-01-01"),
      row("b", "grammar", "2026-01-02"),
      row("c", "srs", "2026-01-02"),
    ]);
    const totals = categoryTotals(byDay.values());
    expect(totals.total).toBe(3);
    expect(totals.counts.grammar).toBe(2);
    expect(totals.shares.grammar).toBeCloseTo(66.7, 1);
    expect(totals.shares.srs).toBeCloseTo(33.3, 1);
  });
});

describe("day arithmetic", () => {
  it("steps across month and leap boundaries locally", () => {
    expect(addDaysKey("2026-09-22", -90)).toBe("2026-06-24");
    expect(addDaysKey("2024-03-01", -1)).toBe("2024-02-29");
    expect(addDaysKey("2023-03-01", -1)).toBe("2023-02-28");
    expect(addDaysKey("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("anchors the compact window on today for 91 inclusive days", () => {
    const { start, end } = compactWindow("2026-09-22");
    expect(end).toBe("2026-09-22");
    expect(start).toBe("2026-06-24");
  });
});

describe("buildCalendarGrid", () => {
  it("covers a leap year with Sunday-first weeks and padding", () => {
    const grid = buildCalendarGrid("2024-01-01", "2024-12-31");
    const flat = grid.weeks.flat();
    const days = flat.filter((d): d is string => d !== null);
    expect(days).toHaveLength(366);
    expect(days[0]).toBe("2024-01-01");
    expect(days[days.length - 1]).toBe("2024-12-31");
    expect(days).toContain("2024-02-29");
    // 2024-01-01 is a Monday: the grid pads Sunday 2023-12-31.
    expect(grid.weeks[0][0]).toBeNull();
    expect(grid.weeks[0][1]).toBe("2024-01-01");
    for (const week of grid.weeks) expect(week).toHaveLength(7);
  });

  it("labels the first week of each month starting at the range start", () => {
    const grid = buildCalendarGrid("2026-01-01", "2026-12-31");
    expect(grid.months[0]).toEqual({ week: 0, label: "Jan" });
    expect(grid.months.map((m) => m.label)).toEqual([
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]);
  });

  it("builds the 91-day compact window with future-safe bounds", () => {
    const { start, end } = compactWindow("2026-09-22");
    const grid = buildCalendarGrid(start, end);
    const days = grid.weeks.flat().filter((d): d is string => d !== null);
    expect(days).toHaveLength(91);
    expect(days[days.length - 1]).toBe(end);
  });
});
