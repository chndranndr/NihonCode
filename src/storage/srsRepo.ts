/**
 * SRS repository over Dexie: card pool from the clean slice, due-before-new
 * ordering, daily new-card cap, review logs. Pure persistence + ordering;
 * rating math lives in src/domain/scheduling.ts.
 */

import {
  deserializeCard,
  isDue,
  newCard,
  reviewCard,
  serializeCard,
  type AppRating,
} from "../domain/scheduling";
import type { JlptLevel } from "../content/ids";
import { db, type ReviewLogRow, type SrsCardRow } from "../storage/db";
import { loadPrefs } from "./prefs";
import { State } from "ts-fsrs";

export interface DueQueue {
  due: string[];
  newCandidates: string[];
}

/**
 * Builds the review queue: every stored card that is due, then new content IDs
 * (from the clean slice) that have no card yet, capped by dailyNewCap minus
 * cards already introduced today.
 */
export async function buildDueQueue(
  poolIds: string[],
  dailyNewCap: number,
  now: Date = new Date(),
): Promise<DueQueue> {
  const store = db();
  const cards = await store.srsCards.toArray();
  const byId = new Map(cards.map((c) => [c.id, c]));
  const due = cards.filter((c) => isDue(deserializeCard(c.state), now)).map((c) => c.id);
  const introducedToday = cards.filter(
    (c) => c.lastReview !== null && new Date(c.lastReview).toDateString() === now.toDateString(),
  ).length;
  const unseen = poolIds.filter((id) => !byId.has(id));
  const remaining = Math.max(0, dailyNewCap - introducedToday);
  return { due, newCandidates: unseen.slice(0, remaining) };
}

export async function reviewItem(
  id: string,
  rating: AppRating,
  now: Date = new Date(),
): Promise<{ due: Date }> {
  const store = db();
  const existing = await store.srsCards.get(id);
  const card = existing ? deserializeCard(existing.state) : newCard(now);
  const record = reviewCard(card, rating, now, {
    skipLearningSteps: loadPrefs().srs.skipLearningSteps,
  });
  const row: SrsCardRow = {
    id,
    state: serializeCard(record.card),
    due: record.card.due.getTime(),
    reps: record.card.reps,
    lapses: record.card.lapses,
    lastReview: now.getTime(),
  };
  await store.srsCards.put(row);
  const log: ReviewLogRow = {
    cardId: id,
    rating,
    ts: now.getTime(),
    elapsedDays: record.log.elapsed_days,
  };
  await store.reviewLogs.add(log);
  return { due: record.card.due };
}

export async function dueCount(now: Date = new Date()): Promise<number> {
  const cards = await db().srsCards.toArray();
  return cards.filter((c) => isDue(deserializeCard(c.state), now)).length;
}

export interface SrsStats {
  total: number;
  due: number;
  learned: number;
  lapses: number;
  /** Long-term (Review-state) cards. */
  mastered: number;
  /** Cards with reps but not yet in long-term state. */
  learning: number;
  /** Cards never reviewed. */
  fresh: number;
  byKind: Record<"kanji" | "vocab", { total: number; learned: number }>;
  byLevel: Record<JlptLevel, { total: number; learned: number }>;
}

export async function srsStats(now: Date = new Date()): Promise<SrsStats> {
  const cards = await db().srsCards.toArray();
  const stats: SrsStats = {
    total: cards.length,
    due: 0,
    learned: 0,
    lapses: 0,
    mastered: 0,
    learning: 0,
    fresh: 0,
    byKind: { kanji: { total: 0, learned: 0 }, vocab: { total: 0, learned: 0 } },
    byLevel: {
      n5: { total: 0, learned: 0 },
      n4: { total: 0, learned: 0 },
      n3: { total: 0, learned: 0 },
      n2: { total: 0, learned: 0 },
      n1: { total: 0, learned: 0 },
    },
  };
  for (const c of cards) {
    const card = deserializeCard(c.state);
    const level = c.id.split(":")[1] as JlptLevel;
    const kind =
      level === "n5" && c.id.startsWith("kanji:")
        ? "kanji"
        : c.id.startsWith("vocab:")
          ? "vocab"
          : null;
    const bucket = stats.byLevel[level];
    if (bucket) {
      bucket.total += 1;
      if (c.reps > 0) bucket.learned += 1;
    }
    if (kind) {
      stats.byKind[kind].total += 1;
      if (c.reps > 0) stats.byKind[kind].learned += 1;
    }
    if (c.reps > 0) stats.learned += 1;
    else stats.fresh += 1;
    if (card.state === State.Review) stats.mastered += 1;
    else if (c.reps > 0) stats.learning += 1;
    stats.lapses += c.lapses;
    if (isDue(card, now)) stats.due += 1;
  }
  return stats;
}
