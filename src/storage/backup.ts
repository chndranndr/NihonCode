/**
 * Export/import of local progress (task 7): the whole durable state — Dexie
 * stores (SRS cards, review logs, drill attempts, grammar state, sessions,
 * JLPT progress) plus the localStorage prefs — as one JSON document with a
 * schema version. Import validates with Zod (untrusted external input)
 * before writing anything, and replaces state wholesale: round-trip without
 * loss is the acceptance line (DEVELOPMENT_PROMPT task 7).
 */

import { z } from "zod";
import { db } from "./db";
import { loadPrefs, migratePrefs, savePrefs } from "./prefs";

export const BACKUP_SCHEMA_VERSION = 1;

const srsCardRowSchema = z.object({
  id: z.string(),
  state: z.string(),
  due: z.number(),
  reps: z.number(),
  lapses: z.number(),
  lastReview: z.number().nullable(),
});

const reviewLogRowSchema = z.object({
  id: z.number().optional(),
  cardId: z.string(),
  rating: z.enum(["again", "good"]),
  ts: z.number(),
  elapsedDays: z.number(),
});

const drillAttemptRowSchema = z.object({
  id: z.number().optional(),
  itemId: z.string(),
  kind: z.enum(["kana", "kanji", "vocab", "numbers", "dates", "conjugation", "srs"]),
  correct: z.boolean(),
  ts: z.number(),
});

const grammarStateRowSchema = z.object({
  id: z.string(),
  status: z.enum(["unseen", "in-progress", "completed"]),
  resumeQuizIndex: z.number(),
  completedAt: z.number().nullable(),
});

const sessionRowSchema = z.object({
  id: z.number().optional(),
  kind: z.string(),
  correct: z.number(),
  total: z.number(),
  ts: z.number(),
});

const jlptProgressRowSchema = z.object({
  id: z.string(),
  bestCorrect: z.number(),
  total: z.number(),
  completedAt: z.number(),
});

const backupSchema = z.object({
  app: z.literal("nihoncode"),
  schemaVersion: z.number(),
  exportedAt: z.number(),
  prefs: z.record(z.string(), z.unknown()),
  srsCards: z.array(srsCardRowSchema),
  reviewLogs: z.array(reviewLogRowSchema),
  drillAttempts: z.array(drillAttemptRowSchema),
  grammarState: z.array(grammarStateRowSchema),
  sessions: z.array(sessionRowSchema),
  jlptProgress: z.array(jlptProgressRowSchema),
});

export type BackupDocument = z.infer<typeof backupSchema>;

export interface BackupResult {
  ok: boolean;
  reason?: string;
  counts?: Record<string, number>;
}

export async function exportBackup(): Promise<string> {
  const store = db();
  const [srsCards, reviewLogs, drillAttempts, grammarState, sessions, jlptProgress] =
    await Promise.all([
      store.srsCards.toArray(),
      store.reviewLogs.toArray(),
      store.drillAttempts.toArray(),
      store.grammarState.toArray(),
      store.sessions.toArray(),
      store.jlptProgress.toArray(),
    ]);
  const doc: BackupDocument = {
    app: "nihoncode",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: Date.now(),
    prefs: JSON.parse(JSON.stringify(loadPrefs())) as Record<string, unknown>,
    srsCards,
    reviewLogs,
    drillAttempts,
    grammarState,
    sessions,
    jlptProgress,
  };
  return JSON.stringify(doc);
}

/** Validate and restore a backup document; rejects malformed or foreign data. */
export async function importBackup(text: string): Promise<BackupResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: "not valid JSON" };
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "not a NihonCode backup (schema mismatch)" };
  }
  const doc = parsed.data;
  const store = db();
  await store.transaction(
    "rw",
    [
      store.srsCards,
      store.reviewLogs,
      store.drillAttempts,
      store.grammarState,
      store.sessions,
      store.jlptProgress,
    ],
    async () => {
      await Promise.all([
        store.srsCards.clear(),
        store.reviewLogs.clear(),
        store.drillAttempts.clear(),
        store.grammarState.clear(),
        store.sessions.clear(),
        store.jlptProgress.clear(),
      ]);
      await store.srsCards.bulkPut(doc.srsCards);
      // Drop auto-increment ids on re-import so restored rows never collide
      // with future inserts; content identity lives in the semantic fields.
      await store.reviewLogs.bulkAdd(doc.reviewLogs.map(({ id: _id, ...row }) => row));
      await store.drillAttempts.bulkAdd(doc.drillAttempts.map(({ id: _id, ...row }) => row));
      await store.grammarState.bulkPut(doc.grammarState);
      await store.sessions.bulkAdd(doc.sessions.map(({ id: _id, ...row }) => row));
      await store.jlptProgress.bulkPut(doc.jlptProgress);
    },
  );
  savePrefs(migratePrefs(doc.prefs));
  return {
    ok: true,
    counts: {
      srsCards: doc.srsCards.length,
      reviewLogs: doc.reviewLogs.length,
      drillAttempts: doc.drillAttempts.length,
      grammarState: doc.grammarState.length,
      sessions: doc.sessions.length,
      jlptProgress: doc.jlptProgress.length,
    },
  };
}
