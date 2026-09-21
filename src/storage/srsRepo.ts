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
 * Builds the review queue for one level's pool: stored cards that are due
 * AND belong to the active pool, then new content IDs that have no card yet,
 * capped by dailyNewCap minus cards already introduced today. Cards from
 * other levels stay scheduled but never surface here.
 */
export async function buildDueQueue(
  poolIds: string[],
  dailyNewCap: number,
  now: Date = new Date(),
): Promise<DueQueue> {
  const store = db();
  const cards = await store.srsCards.toArray();
  const byId = new Map(cards.map((c) => [c.id, c]));
  const inPool = new Set(poolIds);
  const due = cards
    .filter((c) => inPool.has(c.id) && isDue(deserializeCard(c.state), now))
    .map((c) => c.id);
  const introducedToday = cards.filter(
    (c) =>
      inPool.has(c.id) &&
      c.lastReview !== null &&
      new Date(c.lastReview).toDateString() === now.toDateString(),
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

export async function dueCount(poolIds: string[], now: Date = new Date()): Promise<number> {
  const cards = await db().srsCards.toArray();
  const inPool = new Set(poolIds);
  return cards.filter((c) => inPool.has(c.id) && isDue(deserializeCard(c.state), now)).length;
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

export async function srsStats(poolIds?: string[], now: Date = new Date()): Promise<SrsStats> {
  const cards = await db().srsCards.toArray();
  // With a pool, totals come from the pool (every content id that could hold a
  // card), so a fresh learner sees "learned 0 / total N" rather than "0 / 0".
  // `due` also scopes to the pool so the DUE readout matches the review queue
  // (decisions.md "N4 enablement"). Without a pool, totals are card-derived.
  const inPool = poolIds ? new Set(poolIds) : null;
  const kanjiPool = poolIds ? poolIds.filter((id) => id.startsWith("kanji:")).length : 0;
  const vocabPool = poolIds ? poolIds.filter((id) => id.startsWith("vocab:")).length : 0;
  const stats: SrsStats = {
    total: poolIds ? poolIds.length : cards.length,
    due: 0,
    learned: 0,
    lapses: 0,
    mastered: 0,
    learning: 0,
    fresh: 0,
    byKind: {
      kanji: { total: kanjiPool, learned: 0 },
      vocab: { total: vocabPool, learned: 0 },
    },
    byLevel: {
      n5: { total: 0, learned: 0 },
      n4: { total: 0, learned: 0 },
      n3: { total: 0, learned: 0 },
      n2: { total: 0, learned: 0 },
      n1: { total: 0, learned: 0 },
    },
  };
  if (poolIds) {
    for (const id of poolIds) {
      const bucket = stats.byLevel[id.split(":")[1] as JlptLevel];
      if (bucket) bucket.total += 1;
    }
  }
  for (const c of cards) {
    if (inPool !== null && !inPool.has(c.id)) continue;
    const card = deserializeCard(c.state);
    const level = c.id.split(":")[1] as JlptLevel;
    const kind = c.id.startsWith("kanji:") ? "kanji" : c.id.startsWith("vocab:") ? "vocab" : null;
    const bucket = stats.byLevel[level];
    if (bucket && c.reps > 0) bucket.learned += 1;
    if (kind && c.reps > 0) stats.byKind[kind].learned += 1;
    if (c.reps > 0) {
      stats.learned += 1;
      if (card.state === State.Review) stats.mastered += 1;
      else stats.learning += 1;
    }
    stats.lapses += c.lapses;
    if (isDue(card, now)) stats.due += 1;
  }
  stats.fresh = stats.total - stats.learned;
  return stats;
}
