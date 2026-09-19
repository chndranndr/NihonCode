/**
 * IndexedDB via Dexie: SRS cards, review logs, drill attempts, grammar state.
 * The volume case per DEVELOPMENT_PROMPT.md section 2. Schema-versioned;
 * migrations additive and idempotent (version 1 is the baseline; later
 * versions add stores/columns, never rewrite existing rows in place).
 */

import Dexie, { type Table } from "dexie";

export interface SrsCardRow {
  /** Stable content ID (src/content/ids.ts), never an array position. */
  id: string;
  /** ts-fsrs card state, serialized. */
  state: string;
  due: number;
  reps: number;
  lapses: number;
  lastReview: number | null;
}

export interface ReviewLogRow {
  id?: number;
  cardId: string;
  rating: "again" | "hard" | "good" | "easy";
  ts: number;
  elapsedDays: number;
}

export interface DrillAttemptRow {
  id?: number;
  itemId: string;
  kind: "kana" | "kanji" | "vocab" | "numbers" | "dates" | "grammar" | "srs";
  correct: boolean;
  ts: number;
}

export interface GrammarStateRow {
  /** grammar:<level>:<lessonId> */
  id: string;
  status: "unseen" | "in-progress" | "completed";
  resumeQuizIndex: number;
  completedAt: number | null;
}

export interface SessionRow {
  id?: number;
  kind: string;
  correct: number;
  total: number;
  ts: number;
}

export const DB_NAME = "nihoncode";
export const DB_VERSION = 2;

export class NihonDb extends Dexie {
  srsCards!: Table<SrsCardRow, string>;
  reviewLogs!: Table<ReviewLogRow, number>;
  drillAttempts!: Table<DrillAttemptRow, number>;
  grammarState!: Table<GrammarStateRow, string>;
  sessions!: Table<SessionRow, number>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores({
      srsCards: "id, due",
      reviewLogs: "++id, cardId, ts",
      drillAttempts: "++id, itemId, kind, ts",
      grammarState: "id, status",
    });
    // Additive migration: new table only; existing rows untouched.
    this.version(2).stores({
      sessions: "++id, kind, ts",
    });
  }
}

let shared: NihonDb | null = null;

/** Process-wide handle; tests construct their own instance with a unique name. */
export function db(): NihonDb {
  if (!shared) shared = new NihonDb();
  return shared;
}
