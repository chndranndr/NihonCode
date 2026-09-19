/**
 * Basic achievements (PRD progress semantics; the progress brief renders
 * achievements beyond basics as locked/teaching rows in MVP). Every
 * achievement derives from stored state — nothing decorative, nothing
 * hardcoded as unlocked.
 */

import { dayKey } from "./progress";

export interface AchievementInput {
  xp: number;
  streakDays: number;
  totalSessions: number;
  drillSessions: number;
  perfectSessions: number;
  reviewsCompleted: number;
  grammarCompleted: number;
  weeklyXp: Record<string, number>;
}

export interface Achievement {
  id: string;
  label: string;
  unlocked: boolean;
  /** What unlocks it, stated so a locked row teaches. */
  requirement: string;
}

export function achievements(input: AchievementInput, now: Date = new Date()): Achievement[] {
  const today = dayKey(now);
  const studiedToday = (input.weeklyXp[today] ?? 0) > 0;
  return [
    {
      id: "first-session",
      label: "FIRST SESSION",
      unlocked: input.totalSessions > 0,
      requirement: "complete any drill, lesson, or review session",
    },
    {
      id: "first-perfect",
      label: "FLAWLESS",
      unlocked: input.perfectSessions > 0,
      requirement: "finish a session with no misses",
    },
    {
      id: "first-review",
      label: "KEEPER",
      unlocked: input.reviewsCompleted > 0,
      requirement: "complete an SRS review",
    },
    {
      id: "xp-100",
      label: "CENTURY",
      unlocked: input.xp >= 100,
      requirement: "reach 100 XP",
    },
    {
      id: "streak-3",
      label: "THREE-DAY",
      unlocked: input.streakDays >= 3,
      requirement: "study three days in a row",
    },
    {
      id: "streak-7",
      label: "WEEKLONG",
      unlocked: input.streakDays >= 7,
      requirement: "study seven days in a row",
    },
    {
      id: "grammar-10",
      label: "GRAMMARIAN",
      unlocked: input.grammarCompleted >= 10,
      requirement: "complete ten grammar lessons",
    },
    {
      id: "daily",
      label: "TODAY",
      unlocked: studiedToday,
      requirement: "study today",
    },
  ];
}

/**
 * Coverage of studied material (PRD: relabel JLPT mastery as coverage, not
 * exam competence). learned cards + completed lessons over the clean-slice
 * pool sizes; honest zero when nothing is studied.
 */
export function coverageEstimate(
  learnedCards: number,
  cardPool: number,
  completedLessons: number,
  lessonPool: number,
): number {
  const denom = cardPool + lessonPool;
  if (denom === 0) return 0;
  return Math.min(1, (learnedCards + completedLessons) / denom);
}
