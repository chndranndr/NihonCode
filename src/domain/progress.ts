/**
 * XP, level curve, and streak rules (pure domain, PRD section 10 / PRODUCT.md
 * progress semantics). XP sources: drill correctness, perfect-drill bonus, SRS
 * review completion, grammar quiz completion, daily bonus, streak bonus.
 * Level curve is quadratic to 50.
 */

export const XP = {
  drillCorrect: 5,
  drillWrong: 0,
  perfectDrillBonus: 20,
  srsReview: 10,
  grammarQuiz: 15,
  dailyBonus: 5,
  streakBonusPerWeek: 10,
} as const;

export const MAX_LEVEL = 50;

/** XP required to reach `level` from level 1: quadratic curve to MAX_LEVEL. */
export function xpForLevel(level: number): number {
  const clamped = Math.min(Math.max(level, 1), MAX_LEVEL);
  return 100 * (clamped - 1) * (clamped - 1);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

export function xpProgress(xp: number): { level: number; intoLevel: number; levelSpan: number } {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return { level, intoLevel: 0, levelSpan: 1 };
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, intoLevel: xp - floor, levelSpan: next - floor };
}

export type DayKey = string; // YYYY-MM-DD, local

export function dayKey(date: Date): DayKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function previousDay(key: DayKey): DayKey {
  const [y, m, d] = key.split("-").map(Number);
  const prev = new Date(y, m - 1, d - 1);
  return dayKey(prev);
}

/**
 * Streak update: same day is a no-op; the day after the last study day extends;
 * any other gap resets to 1. Returns the new streak and last study day.
 */
export function applyStudyDay(
  current: { streakDays: number; lastStudyDay: DayKey | null },
  today: DayKey,
): { streakDays: number; lastStudyDay: DayKey } {
  if (current.lastStudyDay === today) return { ...current, lastStudyDay: today };
  if (current.lastStudyDay !== null && previousDay(today) === current.lastStudyDay) {
    return { streakDays: current.streakDays + 1, lastStudyDay: today };
  }
  return { streakDays: 1, lastStudyDay: today };
}

export function perfectDrillBonus(correct: number, total: number): number {
  return total > 0 && correct === total ? XP.perfectDrillBonus : 0;
}
