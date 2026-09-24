/**
 * Progress repository: XP, streak, weekly activity, per-item attempt history.
 * Attempts live in Dexie (volume); the compact XP/streak summary lives in
 * localStorage prefs (src/storage/prefs.ts).
 */

import { applyStudyDay, dayKey, type DayKey } from "../domain/progress";
import { categoryOfKind, type ActivityRow } from "../domain/activity";
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

/**
 * One completed drill/review/lesson/set run (PRD §10.13). The caller owns a
 * stable session id created when the run starts; repeating the same id is a
 * no-op, so double-clicks and effect replays never double-count. The local
 * completion date is captured here once and never re-derived.
 */
export async function recordSession(
  sessionId: string,
  kind: string,
  correct: number,
  total: number,
  now: Date = new Date(),
): Promise<boolean> {
  const store = db();
  let inserted = false;
  await store.transaction("rw", [store.sessions, store.activity], async () => {
    const existing = await store.activity.get(sessionId);
    if (existing) return;
    const ts = now.getTime();
    await store.sessions.add({ kind, correct, total, ts });
    const row: ActivityRow = {
      id: sessionId,
      category: categoryOfKind(kind),
      date: dayKey(now),
      ts,
    };
    await store.activity.put(row);
    inserted = true;
  });
  return inserted;
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
    drillSessions: rows.filter((r) => r.kind !== "srs" && r.kind !== "grammar" && r.kind !== "jlpt")
      .length,
    perfectSessions: rows.filter((r) => r.total > 0 && r.correct === r.total).length,
    reviewsCompleted: rows.filter((r) => r.kind === "srs").length,
    grammarCompleted: grammar.filter((g) => g.status === "completed").length,
  };
}

/** Activity contributions for calendar/quadrant reads, all levels. */
export async function activityRows(): Promise<ActivityRow[]> {
  return db().activity.toArray();
}

let sessionSeq = 0;
const sessionSalt = Math.random().toString(36).slice(2, 8);

/** Session id stable for the lifetime of one run; a retry always gets a new
 * one. The salt keeps ids unique across tabs; the sequence keeps same-ms
 * runs in one tab distinct. */
export function newSessionId(prefix: string, now: Date = new Date()): string {
  sessionSeq += 1;
  return `${prefix}:${now.getTime()}:${sessionSalt}${sessionSeq}`;
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
      ...prefs.progress,
      xp: prefs.progress.xp + amount,
      streakDays: withStudy.streakDays,
      lastStudyDay: withStudy.lastStudyDay,
      weeklyXp: weekly,
    },
  };
  savePrefs(next);
  return next;
}
