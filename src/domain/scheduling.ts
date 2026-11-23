/**
 * FSRS scheduling wrapper (pure domain over ts-fsrs). Maps app ratings to
 * FSRS grades. A wrong answer is Again automatically; after a correct answer
 * the learner picks Hard / Good / Easy (owner decision 2026-11-23,
 * docs/decisions.md). due-before-new ordering lives in the
 * review feature; this module owns card state transitions only.
 */

import { createEmptyCard, FSRS, Rating, type Card, type RecordLogItem } from "ts-fsrs";
export type AppRating = "again" | "hard" | "good" | "easy";

/** Ratings a learner may choose after a correct answer, in display order. */
export const CORRECT_RATINGS = ["hard", "good", "easy"] as const satisfies readonly AppRating[];

const RATING_MAP = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
} as const;

/** Default rating when the learner has not chosen: incorrect -> Again, correct -> Good. */
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
