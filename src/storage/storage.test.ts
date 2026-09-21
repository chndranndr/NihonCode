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
import { DEFAULT_PREFS, loadPrefs, migratePrefs, savePrefs, type Prefs } from "./prefs";

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
    expect(once.schemaVersion).toBe(1);
    expect(once.progress.xp).toBe(50);
    expect(once.srs.dailyNewCap).toBe(DEFAULT_PREFS.srs.dailyNewCap);
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
