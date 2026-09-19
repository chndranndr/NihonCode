/**
 * Progress repository: XP, streak, weekly activity, per-item attempt history.
 * Attempts live in Dexie (volume); the compact XP/streak summary lives in
 * localStorage prefs (src/storage/prefs.ts).
 */

import { applyStudyDay, dayKey, type DayKey } from "../domain/progress";
import { db, type DrillAttemptRow } from "../storage/db";
import { loadPrefs, savePrefs, type Prefs } from "./prefs";

export type AttemptKind = DrillAttemptRow["kind"];

export async function recordAttempt(
  itemId: string,
  kind: AttemptKind,
  correct: boolean,
): Promise<void> {
  await db().drillAttempts.add({ itemId, kind, correct, ts: Date.now() });
}

export interface ItemMastery {
  attempts: number;
  correct: number;
  accuracy: number;
  lastSeen: number | null;
}

export async function masteryByItem(itemId: string): Promise<ItemMastery> {
  const rows = await db().drillAttempts.where("itemId").equals(itemId).toArray();
  const correct = rows.filter((r) => r.correct).length;
  return {
    attempts: rows.length,
    correct,
    accuracy: rows.length === 0 ? 0 : correct / rows.length,
    lastSeen: rows.length === 0 ? null : Math.max(...rows.map((r) => r.ts)),
  };
}

export async function attemptsForKind(kind: AttemptKind): Promise<DrillAttemptRow[]> {
  return db().drillAttempts.where("kind").equals(kind).toArray();
}

/** One completed drill/review/lesson session; feeds achievement inputs. */
export async function recordSession(kind: string, correct: number, total: number): Promise<void> {
  await db().sessions.add({ kind, correct, total, ts: Date.now() });
}

export interface SessionSummary {
  totalSessions: number;
  drillSessions: number;
  perfectSessions: number;
  reviewsCompleted: number;
  grammarCompleted: number;
}
export async function sessionSummary(): Promise<SessionSummary> {
  const rows = await db().sessions.toArray();
  const grammar = await db().grammarState.toArray();
  return {
    totalSessions: rows.length,
    drillSessions: rows.filter((r) => r.kind !== "srs" && r.kind !== "grammar").length,
    perfectSessions: rows.filter((r) => r.total > 0 && r.correct === r.total).length,
    reviewsCompleted: rows.filter((r) => r.kind === "srs").length,
    grammarCompleted: grammar.filter((g) => g.status === "completed").length,
  };
}

/** Awards XP and updates streak/weekly buckets; persists prefs. */
export function awardXp(amount: number, now: Date = new Date()): Prefs {
  const prefs = loadPrefs();
  const today: DayKey = dayKey(now);
  const withStudy = applyStudyDay(
    { streakDays: prefs.progress.streakDays, lastStudyDay: prefs.progress.lastStudyDay },
    today,
  );
  const weekly = { ...prefs.progress.weeklyXp };
  weekly[today] = (weekly[today] ?? 0) + amount;
  const next: Prefs = {
    ...prefs,
    progress: {
      xp: prefs.progress.xp + amount,
      streakDays: withStudy.streakDays,
      lastStudyDay: withStudy.lastStudyDay,
      weeklyXp: weekly,
    },
  };
  savePrefs(next);
  return next;
}

export function currentPrefs(): Prefs {
  return loadPrefs();
}
