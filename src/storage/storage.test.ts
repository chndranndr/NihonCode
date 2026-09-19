import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { DB_VERSION, NihonDb } from "./db";
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

describe("prefs storage", () => {
  it("returns defaults when nothing is stored", () => {
    expect(loadPrefs(memoryStorage())).toEqual(DEFAULT_PREFS);
  });

  it("round-trips a saved payload", () => {
    const storage = memoryStorage();
    const prefs: Prefs = { ...DEFAULT_PREFS, theme: "light", accent: "green" };
    savePrefs(prefs, storage);
    expect(loadPrefs(storage)).toEqual(prefs);
  });

  it("repairs a corrupt payload instead of throwing", () => {
    const storage = memoryStorage();
    storage.setItem("NihonCode-prefs", "{not json");
    expect(loadPrefs(storage)).toEqual(DEFAULT_PREFS);
  });

  it("migrates a version-0 payload additively and idempotently", () => {
    const legacy = { theme: "light", level: "n4" };
    const once = migratePrefs(legacy);
    const twice = migratePrefs(once);
    expect(once.schemaVersion).toBe(1);
    expect(once.theme).toBe("light");
    expect(once.level).toBe("n4");
    expect(once.srs.dailyNewCap).toBe(DEFAULT_PREFS.srs.dailyNewCap);
    expect(twice).toEqual(once);
  });

  it("leaves a newer-version payload untouched", () => {
    const future = { ...DEFAULT_PREFS, schemaVersion: 99, theme: "light" as const };
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

  it("opens at the declared schema version", async () => {
    db = new NihonDb("test-version");
    expect(db.verno).toBe(DB_VERSION);
  });
});
