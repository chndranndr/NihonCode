/**
 * Activity contribution contract (PRD §10.13 owner addition 2026-09-22):
 * one completed study session is one contribution with a stable session id,
 * a completion timestamp, the local calendar day captured at completion, and
 * one mutually exclusive category. Pure helpers only; persistence lives in
 * src/storage/progressRepo.ts.
 */

import { dayKey, type DayKey } from "./progress";

export type ActivityCategory = "drill" | "srs" | "grammar" | "jlpt";

export const ACTIVITY_CATEGORIES: readonly ActivityCategory[] = ["drill", "srs", "grammar", "jlpt"];

export interface ActivityRow {
  /** Stable session id; the deduplication key for repeated completions. */
  id: string;
  category: ActivityCategory;
  /** Local calendar day captured at completion; never re-derived later. */
  date: DayKey;
  /** Completion timestamp, epoch ms. */
  ts: number;
}

export type DayCounts = Record<ActivityCategory, number>;

/** Session kinds recorded by features map to one exclusive category. */
export function categoryOfKind(kind: string): ActivityCategory {
  if (kind === "srs") return "srs";
  if (kind === "grammar") return "grammar";
  if (kind === "jlpt") return "jlpt";
  return "drill";
}

/** Fixed intensity bins: 0, 1, 2, 3, and 4+ sessions per day. */
export function dayBin(total: number): 0 | 1 | 2 | 3 | 4 {
  if (total <= 0) return 0;
  if (total >= 4) return 4;
  return Math.floor(total) as 1 | 2 | 3;
}

export function emptyCounts(): DayCounts {
  return { drill: 0, srs: 0, grammar: 0, jlpt: 0 };
}

/** Per-day category counts keyed by local date. */
export function countsByDay(rows: ActivityRow[]): Map<DayKey, DayCounts> {
  const map = new Map<DayKey, DayCounts>();
  for (const row of rows) {
    const counts = map.get(row.date) ?? emptyCounts();
    counts[row.category] += 1;
    map.set(row.date, counts);
  }
  return map;
}

export interface CategoryTotals {
  counts: DayCounts;
  total: number;
  /** Percentage shares; all zero when total is zero (never divide by zero). */
  shares: DayCounts;
}

export function categoryTotals(byDay: Iterable<DayCounts>): CategoryTotals {
  const counts = emptyCounts();
  let total = 0;
  for (const day of byDay) {
    for (const category of ACTIVITY_CATEGORIES) {
      counts[category] += day[category];
      total += day[category];
    }
  }
  const shares = emptyCounts();
  if (total > 0) {
    for (const category of ACTIVITY_CATEGORIES) {
      shares[category] = (counts[category] / total) * 100;
    }
  }
  return { counts, total, shares };
}

export function parseDayKey(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Day arithmetic on local keys; constructor normalization absorbs DST. */
export function addDaysKey(key: DayKey, n: number): DayKey {
  const base = parseDayKey(key);
  return dayKey(new Date(base.getFullYear(), base.getMonth(), base.getDate() + n));
}

/** Home window: 91 days ending today, inclusive. */
export function compactWindow(todayKey: DayKey): { start: DayKey; end: DayKey } {
  return { start: addDaysKey(todayKey, -90), end: todayKey };
}

export interface CalendarGrid {
  /** Sunday-to-Saturday weeks; null cells pad outside the range. */
  weeks: (DayKey | null)[][];
  /** Month labels with the week column they sit above. */
  months: { week: number; label: string }[];
}

/**
 * GitHub-style grid over a local date range: seven Sunday–Saturday rows,
 * week columns, padding outside the range, month labels on the first week of
 * each month (the first column labels the range start).
 */
export function buildCalendarGrid(startKey: DayKey, endKey: DayKey): CalendarGrid {
  const start = parseDayKey(startKey);
  const end = parseDayKey(endKey);
  const first = new Date(start.getFullYear(), start.getMonth(), start.getDate() - start.getDay());
  const totalDays = Math.round(
    (new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).getTime() - first.getTime()) /
      86400000,
  );
  const weekCount = Math.ceil(totalDays / 7);

  const weeks: (DayKey | null)[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const cells: (DayKey | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const key = dayKey(
        new Date(first.getFullYear(), first.getMonth(), first.getDate() + w * 7 + d),
      );
      cells.push(key < startKey || key > endKey ? null : key);
    }
    weeks.push(cells);
  }

  const months: { week: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weekCount; w++) {
    const labelDate =
      w === 0 ? start : new Date(first.getFullYear(), first.getMonth(), first.getDate() + w * 7);
    const month = labelDate.getMonth();
    if (month !== lastMonth) {
      months.push({ week: w, label: labelDate.toLocaleDateString("en", { month: "short" }) });
      lastMonth = month;
    }
  }
  return { weeks, months };
}
