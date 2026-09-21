/**
 * FSRS scheduling wrapper (pure domain over ts-fsrs). Maps app ratings to
 * FSRS grades: incorrect -> Again, correct -> Good (MVP contract per
 * implementation_plan.md Phase 1). due-before-new ordering lives in the
 * review feature; this module owns card state transitions only.
 */

import { createEmptyCard, FSRS, Rating, type Card, type RecordLogItem } from "ts-fsrs";
export type AppRating = "again" | "good";

const RATING_MAP = {
  again: Rating.Again,
  good: Rating.Good,
} as const;

/** MVP rating map: incorrect -> Again, correct -> Good. */
export function ratingFromCorrect(correct: boolean): AppRating {
  return correct ? "good" : "again";
}

export type ReviewRecord = RecordLogItem;

export function newCard(now: Date = new Date()): Card {
  return createEmptyCard(now);
}

export function reviewCard(
  card: Card,
  rating: AppRating,
  now: Date = new Date(),
  options: { skipLearningSteps?: boolean } = {},
): ReviewRecord {
  const fsrs = new FSRS(options.skipLearningSteps ? { enable_short_term: false } : {});
  return fsrs.next(card, now, RATING_MAP[rating]);
}

export function isDue(card: Card, now: Date = new Date()): boolean {
  return card.due.getTime() <= now.getTime();
}

export function serializeCard(card: Card): string {
  return JSON.stringify(card);
}

export function deserializeCard(text: string): Card {
  const parsed = JSON.parse(text) as Card;
  return {
    ...parsed,
    due: new Date(parsed.due),
    last_review: parsed.last_review ? new Date(parsed.last_review) : undefined,
  };
}
