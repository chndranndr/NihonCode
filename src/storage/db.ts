/**
 * IndexedDB via Dexie: SRS cards, review logs, drill attempts, grammar state.
 * The volume case per DEVELOPMENT_PROMPT.md section 2. Schema-versioned;
 * migrations are additive and idempotent (version 1 is the baseline; later
 * versions add stores or drop unused indexes, never rewrite existing rows).
 */

import Dexie, { type Table } from "dexie";

import { upgradeVocabN5Rekeys } from "./vocab-migration";
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
  rating: "again" | "good";
  ts: number;
  elapsedDays: number;
}

export interface DrillAttemptRow {
  id?: number;
  itemId: string;
  kind: "kana" | "kanji" | "vocab" | "numbers" | "dates" | "conjugation" | "srs";
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
export const DB_VERSION = 4;

// VOCAB_N5_REKEYS lives in ./vocab-migration (the map and its version(4)
// upgrade travel together; db.ts would otherwise import its own dependent).

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
    // reviewLogs is a write-only audit trail in Phase 1 (no reader queries it);
    // drop the unused cardId/ts indexes. Row data untouched.
    this.version(3).stores({
      reviewLogs: "++id",
    });
    // Phase 3 loader swap: the app now reads data/clean, whose N5 vocab ids
    // are the re-keyed ones, so progress rows must follow in the same change
    // (docs/decisions.md "N5 vocab re-key migration sequencing").
    this.version(4)
      .stores({})
      .upgrade((tx) => upgradeVocabN5Rekeys(tx));
  }
}

let shared: NihonDb | null = null;

/** Process-wide handle; tests construct their own instance with a unique name. */
export function db(): NihonDb {
  if (!shared) shared = new NihonDb();
  return shared;
}
