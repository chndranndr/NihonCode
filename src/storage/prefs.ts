/**
 * localStorage preferences and compact progress state. Schema-versioned:
 * `schemaVersion` travels with the payload; loadPrefs() upgrades an older
 * payload by filling missing fields from the defaults, and an unknown newer
 * version is left untouched (never destructively downgraded).
 */

export const PREFS_KEY = "NihonCode-prefs";
export const PREFS_SCHEMA_VERSION = 3;

export type AccentName = "amber" | "green" | "blue" | "orange" | "red";

export const ACCENTS: readonly AccentName[] = ["amber", "green", "blue", "orange", "red"];

export interface Prefs {
  schemaVersion: number;
  /** Active JLPT level; the loader rejects levels it does not serve yet. */
  level: "n5" | "n4" | "n3" | "n2" | "n1";
  srs: {
    dailyNewCap: number;
    skipLearningSteps: boolean;
  };
  progress: {
    xp: number;
    streakDays: number;
    lastStudyDay: string | null;
    weeklyXp: Record<string, number>;
    /** Achievement ids already toasted, so unlocks fire once (PRD 10.13). */
    seenAchievements: string[];
  };
}

export const DEFAULT_PREFS: Prefs = {
  schemaVersion: PREFS_SCHEMA_VERSION,
  level: "n5",
  srs: { dailyNewCap: 20, skipLearningSteps: false },
  progress: {
    xp: 0,
    streakDays: 0,
    lastStudyDay: null,
    weeklyXp: {},
    seenAchievements: [],
  },
};

export function migratePrefs(raw: unknown): Prefs {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_PREFS };
  const prefs = raw as Partial<Prefs>;
  const version = typeof prefs.schemaVersion === "number" ? prefs.schemaVersion : 0;
  if (version > PREFS_SCHEMA_VERSION) return prefs as Prefs; // newer writer: leave alone
  const merged = { ...DEFAULT_PREFS, ...prefs, schemaVersion: PREFS_SCHEMA_VERSION };
  merged.progress = {
    ...DEFAULT_PREFS.progress,
    ...(prefs.progress ?? {}),
    weeklyXp: prefs.progress?.weeklyXp ?? {},
    seenAchievements: prefs.progress?.seenAchievements ?? [],
  };
  merged.srs = { ...DEFAULT_PREFS.srs, ...(prefs.srs ?? {}) };
  return merged;
}

export function loadPrefs(storage: Storage = localStorage): Prefs {
  const text = storage.getItem(PREFS_KEY);
  if (text === null) return { ...DEFAULT_PREFS };
  try {
    return migratePrefs(JSON.parse(text));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: Prefs, storage: Storage = localStorage): void {
  storage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
