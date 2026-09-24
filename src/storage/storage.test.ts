import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import Dexie, { type Table } from "dexie";
import {
  DB_VERSION,
  NihonDb,
  type DrillAttemptRow,
  type ReviewLogRow,
  type SrsCardRow,
} from "./db";
import { VOCAB_N5_REKEYS } from "./vocab-migration";
import {
  DEFAULT_PREFS,
  loadPrefs,
  migratePrefs,
  PREFS_SCHEMA_VERSION,
  savePrefs,
  type Prefs,
} from "./prefs";
import { db } from "./db";
import { activityRows, newSessionId, recordSession } from "./progressRepo";
import { buildDueQueue, dueCount } from "./srsRepo";
import { newCard, serializeCard } from "../domain/scheduling";
import { dayKey } from "../domain/progress";
import { exportBackup, importBackup } from "./backup";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

class V1Db extends Dexie {
  srsCards!: Table<SrsCardRow, string>;
  reviewLogs!: Table<ReviewLogRow, number>;
  drillAttempts!: Table<DrillAttemptRow, number>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      srsCards: "id, due",
      reviewLogs: "++id, cardId, ts",
      drillAttempts: "++id, itemId, kind, ts",
      grammarState: "id, status",
    });
  }
}

class V5Db extends Dexie {
  sessions!: Table<{ id?: number; kind: string; correct: number; total: number; ts: number }>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      srsCards: "id, due",
      reviewLogs: "++id, cardId, ts",
      drillAttempts: "++id, itemId, kind, ts",
      grammarState: "id, status",
    });
    this.version(2).stores({ sessions: "++id, kind, ts" });
    this.version(3).stores({ reviewLogs: "++id" });
    this.version(5).stores({ jlptProgress: "id" });
  }
}

describe("prefs storage", () => {
  it("returns defaults when nothing is stored", () => {
    expect(loadPrefs(memoryStorage())).toEqual(DEFAULT_PREFS);
  });

  it("round-trips a saved payload", () => {
    const storage = memoryStorage();
    const prefs: Prefs = { ...DEFAULT_PREFS, srs: { dailyNewCap: 30, skipLearningSteps: true } };
    savePrefs(prefs, storage);
    expect(loadPrefs(storage)).toEqual(prefs);
  });

  it("repairs a corrupt payload instead of throwing", () => {
    const storage = memoryStorage();
    storage.setItem("NihonCode-prefs", "{not json");
    expect(loadPrefs(storage)).toEqual(DEFAULT_PREFS);
  });

  it("migrates a version-0 payload additively and idempotently", () => {
    const legacy = { progress: { xp: 50, streakDays: 3, lastStudyDay: null, weeklyXp: {} } };
    const once = migratePrefs(legacy);
    const twice = migratePrefs(once);
    expect(once.schemaVersion).toBe(PREFS_SCHEMA_VERSION);
    expect(once.progress.xp).toBe(50);
    expect(once.srs.dailyNewCap).toBe(DEFAULT_PREFS.srs.dailyNewCap);
    expect(once.level).toBe("n5");
    expect(once.progress.seenAchievements).toEqual([]);
    expect(twice).toEqual(once);
  });

  it("leaves a newer-version payload untouched", () => {
    const future = { ...DEFAULT_PREFS, schemaVersion: 99 };
    expect(migratePrefs(future)).toBe(future);
  });
});

describe("Dexie storage", () => {
  let db: NihonDb;
  afterEach(async () => {
    await db.delete();
    db.close();
  });

  it("persists an SRS card across reopen and indexes by due", async () => {
    db = new NihonDb("test-srs");
    await db.srsCards.put({
      id: "kanji:n5:水",
      state: "{}",
      due: Date.now(),
      reps: 1,
      lapses: 0,
      lastReview: Date.now(),
    });
    db.close();

    const reopened = new NihonDb("test-srs");
    const card = await reopened.srsCards.get("kanji:n5:水");
    expect(card?.reps).toBe(1);
    const due = await reopened.srsCards.where("due").above(0).toArray();
    expect(due).toHaveLength(1);
    reopened.close();
    db = reopened;
  });

  it("upgrades a v1 database additively, preserving existing rows", async () => {
    const legacy = new V1Db("test-upgrade");
    await legacy.srsCards.put({
      id: "kanji:n5:水",
      state: "{}",
      due: 1,
      reps: 2,
      lapses: 0,
      lastReview: null,
    });
    legacy.close();

    db = new NihonDb("test-upgrade");
    expect(db.verno).toBe(DB_VERSION);
    expect(await db.srsCards.get("kanji:n5:水")).toMatchObject({ reps: 2 });
    expect(await db.sessions.toArray()).toEqual([]);
  });

  it("opens at the declared schema version", async () => {
    db = new NihonDb("test-version");
    expect(db.verno).toBe(DB_VERSION);
  });

  it("re-keys N5 vocab progress rows through the staged v4 upgrade", async () => {
    const legacy = new V1Db("test-rekey");
    const oldId = "vocab:n5:一日|ついたち";
    const newId = VOCAB_N5_REKEYS[oldId];
    await legacy.srsCards.put({
      id: oldId,
      state: "{}",
      due: 1,
      reps: 5,
      lapses: 1,
      lastReview: 7,
    });
    await legacy.drillAttempts.add({ itemId: oldId, kind: "vocab", correct: true, ts: 1 });
    await legacy.reviewLogs.add({ cardId: oldId, rating: "good", ts: 2, elapsedDays: 0 });
    legacy.close();

    const upgraded = new NihonDb("test-rekey");
    expect(await upgraded.srsCards.get(oldId)).toBeUndefined();
    expect(await upgraded.srsCards.get(newId)).toMatchObject({ reps: 5, lapses: 1 });
    const attempt = (await upgraded.drillAttempts.toArray())[0];
    expect(attempt.itemId).toBe(newId);
    const log = (await upgraded.reviewLogs.toArray())[0];
    expect(log.cardId).toBe(newId);
    upgraded.close();
    db = upgraded;
  });

  it("merges v4 re-key collisions, keeping the richer card", async () => {
    const legacy = new V1Db("test-rekey-collide");
    const oldId = "vocab:n5:角|かく";
    const newId = VOCAB_N5_REKEYS[oldId];
    await legacy.srsCards.put({
      id: oldId,
      state: "{}",
      due: 1,
      reps: 9,
      lapses: 0,
      lastReview: 3,
    });
    await legacy.srsCards.put({
      id: newId,
      state: "{}",
      due: 2,
      reps: 1,
      lapses: 0,
      lastReview: 9,
    });
    legacy.close();

    const upgraded = new NihonDb("test-rekey-collide");
    const rows = await upgraded.srsCards.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(newId);
    expect(rows[0].reps).toBe(9);
    upgraded.close();
    db = upgraded;
  });

  it("leaves unmapped ids untouched in the v4 upgrade", async () => {
    const legacy = new V1Db("test-rekey-stable");
    await legacy.srsCards.put({
      id: "vocab:n5:水|みず",
      state: "{}",
      due: 1,
      reps: 2,
      lapses: 0,
      lastReview: null,
    });
    legacy.close();

    const upgraded = new NihonDb("test-rekey-stable");
    expect(await upgraded.srsCards.get("vocab:n5:水|みず")).toMatchObject({ reps: 2 });
    expect(await upgraded.srsCards.count()).toBe(1);
    upgraded.close();
    db = upgraded;
  });
});

describe("SRS pool scoping by level", () => {
  const now = new Date();
  const ids = ["kanji:n5:水", "kanji:n4:X", "vocab:n4:上げる|あげる"];
  const card = (id: string) => ({
    id,
    state: serializeCard(newCard(now)),
    due: now.getTime(),
    reps: 1,
    lapses: 0,
    lastReview: now.getTime() - 1000,
  });

  afterEach(async () => {
    await db().srsCards.bulkDelete(ids);
  });

  it("excludes foreign-level cards from the due queue and due count", async () => {
    await db().srsCards.bulkPut(ids.map(card));

    const n5Pool = ["kanji:n5:水", "kanji:n5:火", "vocab:n5:水|みず"];
    expect(await dueCount(n5Pool, now)).toBe(1);
    const queue = await buildDueQueue(n5Pool, 20, now);
    expect(queue.due).toEqual(["kanji:n5:水"]);
    expect(queue.newCandidates.sort()).toEqual(["kanji:n5:火", "vocab:n5:水|みず"]);

    // The N4 cards stay scheduled: switching levels surfaces exactly them.
    const n4Pool = ["kanji:n4:X", "vocab:n4:上げる|あげる"];
    const n4Queue = await buildDueQueue(n4Pool, 20, now);
    expect(n4Queue.due.sort()).toEqual([...n4Pool]);
    expect(n4Queue.newCandidates).toEqual([]);
  });
});

describe("backup export/import round-trip", () => {
  afterEach(async () => {
    // Leave the shared test database empty for the next suite.
    const store = db();
    await Promise.all([
      store.srsCards.clear(),
      store.reviewLogs.clear(),
      store.drillAttempts.clear(),
      store.grammarState.clear(),
      store.sessions.clear(),
      store.jlptProgress.clear(),
      store.activity.clear(),
    ]);
    localStorage.clear();
  });

  it("round-trips every store and prefs without loss", async () => {
    const store = db();
    await store.srsCards.put({
      id: "kanji:n5:水",
      state: '{"due":"2026-01-02T00:00:00.000Z"}',
      due: 2,
      reps: 3,
      lapses: 1,
      lastReview: 1,
    });
    await store.reviewLogs.add({ cardId: "kanji:n5:水", rating: "good", ts: 5, elapsedDays: 0 });
    await store.drillAttempts.add({
      itemId: "kana:hiragana:あ",
      kind: "kana",
      correct: true,
      ts: 7,
    });
    await store.grammarState.put({
      id: "grammar:n5:1",
      status: "completed",
      resumeQuizIndex: 0,
      completedAt: 9,
    });
    await store.sessions.add({ kind: "kana", correct: 10, total: 10, ts: 11 });
    await store.activity.put({
      id: "drill:kana:11",
      category: "drill",
      date: "2026-09-22",
      ts: 11,
    });
    await store.jlptProgress.put({
      id: "jlpt:n5:vocabulary:1",
      bestCorrect: 9,
      total: 10,
      completedAt: 13,
    });
    savePrefs({ ...loadPrefs(), progress: { ...loadPrefs().progress, xp: 777 } });

    const json = await exportBackup();

    // Wipe: simulate a fresh browser.
    await Promise.all([
      store.srsCards.clear(),
      store.reviewLogs.clear(),
      store.drillAttempts.clear(),
      store.grammarState.clear(),
      store.sessions.clear(),
      store.jlptProgress.clear(),
      store.activity.clear(),
    ]);
    localStorage.clear();

    const result = await importBackup(json);
    expect(result.ok).toBe(true);
    expect(result.counts).toEqual({
      srsCards: 1,
      reviewLogs: 1,
      drillAttempts: 1,
      grammarState: 1,
      sessions: 1,
      jlptProgress: 1,
      activity: 1,
    });

    expect((await store.srsCards.get("kanji:n5:水"))?.reps).toBe(3);
    expect(await store.reviewLogs.count()).toBe(1);
    expect(await store.drillAttempts.count()).toBe(1);
    expect((await store.grammarState.get("grammar:n5:1"))?.status).toBe("completed");
    expect(await store.sessions.count()).toBe(1);
    expect((await store.jlptProgress.get("jlpt:n5:vocabulary:1"))?.bestCorrect).toBe(9);
    expect((await store.activity.get("drill:kana:11"))?.date).toBe("2026-09-22");
    expect(loadPrefs().progress.xp).toBe(777);
  });

  it("rejects malformed and foreign documents", async () => {
    expect((await importBackup("{not json")).ok).toBe(false);
    expect((await importBackup('{"app":"other"}')).ok).toBe(false);
    expect((await importBackup('{"app":"nihoncode","schemaVersion":"x"}')).ok).toBe(false);
  });
});

describe("activity completion contract", () => {
  afterEach(async () => {
    const store = db();
    await Promise.all([store.sessions.clear(), store.activity.clear()]);
  });

  it("records one exclusive category with the captured local date", async () => {
    await recordSession("drill:kana:1", "kana", 8, 10, new Date(2026, 0, 15, 23, 59));
    await recordSession("srs:2", "srs", 3, 5, new Date(2026, 0, 16, 0, 1));
    const rows = await activityRows();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === "drill:kana:1")).toMatchObject({
      category: "drill",
      date: "2026-01-15",
    });
    expect(rows.find((r) => r.id === "srs:2")).toMatchObject({
      category: "srs",
      date: "2026-01-16",
    });
  });

  it("is idempotent under repeated completion of the same session id", async () => {
    const id = newSessionId("drill:kanji");
    expect(await recordSession(id, "kanji", 10, 10)).toBe(true);
    expect(await recordSession(id, "kanji", 10, 10)).toBe(false);
    expect(await recordSession(id, "kanji", 10, 10)).toBe(false);
    expect(await activityRows()).toHaveLength(1);
    expect(await db().sessions.count()).toBe(1);
  });

  it("counts a completed retry as a new session", async () => {
    const first = newSessionId("jlpt");
    const retry = newSessionId("jlpt");
    await recordSession(first, "jlpt", 4, 10);
    await recordSession(retry, "jlpt", 9, 10);
    const rows = await activityRows();
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.id))).toEqual(new Set([first, retry]));
  });
});

describe("v6 activity migration", () => {
  it("copies legacy sessions into activity with mapped categories", async () => {
    const legacy = new V5Db("test-v6-upgrade");
    await legacy.sessions.bulkAdd([
      { kind: "kana", correct: 10, total: 10, ts: new Date(2025, 11, 31, 23, 0).getTime() },
      { kind: "srs", correct: 2, total: 3, ts: new Date(2026, 0, 2, 9, 0).getTime() },
      { kind: "jlpt", correct: 5, total: 5, ts: new Date(2026, 0, 3, 10, 0).getTime() },
    ]);
    legacy.close();

    const upgraded = new NihonDb("test-v6-upgrade");
    const rows = await upgraded.activity.toArray();
    expect(rows).toHaveLength(3);
    const byCategory = rows.map((r) => r.category).sort();
    expect(byCategory).toEqual(["drill", "jlpt", "srs"]);
    const legacyRow = rows.find((r) => r.category === "drill")!;
    expect(legacyRow.date).toBe("2025-12-31");
    expect(legacyRow.id).toMatch(/^legacy-session:/);
    upgraded.close();
    await upgraded.delete();
  });
});

describe("backup compatibility", () => {
  afterEach(async () => {
    const store = db();
    await Promise.all([store.sessions.clear(), store.activity.clear()]);
    localStorage.clear();
  });

  it("imports an old schemaVersion-1 document and derives its activity", async () => {
    const old = JSON.stringify({
      app: "nihoncode",
      schemaVersion: 1,
      exportedAt: 1,
      prefs: {},
      srsCards: [],
      reviewLogs: [],
      drillAttempts: [],
      grammarState: [],
      sessions: [{ kind: "kana", correct: 1, total: 1, ts: 5 }],
      jlptProgress: [],
    });
    const result = await importBackup(old);
    expect(result.ok).toBe(true);
    expect(result.counts?.activity).toBe(1);
    expect(await db().sessions.count()).toBe(1);
    const rows = await db().activity.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ category: "drill", date: dayKey(new Date(5)) });
  });

  it("keeps a v2 document's own activity without re-deriving sessions", async () => {
    const doc = JSON.stringify({
      app: "nihoncode",
      schemaVersion: 2,
      exportedAt: 1,
      prefs: {},
      srsCards: [],
      reviewLogs: [],
      drillAttempts: [],
      grammarState: [],
      sessions: [{ kind: "kana", correct: 1, total: 1, ts: 5 }],
      jlptProgress: [],
      activity: [{ id: "drill:kana:1:a1", category: "drill", date: "2026-01-01", ts: 5 }],
    });
    const result = await importBackup(doc);
    expect(result.ok).toBe(true);
    expect(result.counts?.activity).toBe(1);
    const rows = await db().activity.toArray();
    expect(rows.map((r) => r.id)).toEqual(["drill:kana:1:a1"]);
  });

  it("rejects an activity row with a foreign category", async () => {
    const bad = JSON.stringify({
      app: "nihoncode",
      schemaVersion: 2,
      exportedAt: 1,
      prefs: {},
      srsCards: [],
      reviewLogs: [],
      drillAttempts: [],
      grammarState: [],
      sessions: [],
      jlptProgress: [],
      activity: [{ id: "x", category: "duolingo", date: "2026-01-01", ts: 1 }],
    });
    expect((await importBackup(bad)).ok).toBe(false);
  });
});
