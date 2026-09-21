/**
 * localStorage preferences and compact progress state. Schema-versioned:
 * `schemaVersion` travels with the payload; loadPrefs() upgrades an older
 * payload by filling missing fields from the defaults, and an unknown newer
 * version is left untouched (never destructively downgraded).
 */

export const PREFS_KEY = "NihonCode-prefs";
export const PREFS_SCHEMA_VERSION = 1;

export type AccentName = "amber" | "green" | "blue" | "orange" | "red";

export const ACCENTS: readonly AccentName[] = ["amber", "green", "blue", "orange", "red"];

export interface Prefs {
  schemaVersion: number;
  srs: {
    dailyNewCap: number;
    skipLearningSteps: boolean;
  };
  progress: {
    xp: number;
    streakDays: number;
    lastStudyDay: string | null;
    weeklyXp: Record<string, number>;
  };
}

export const DEFAULT_PREFS: Prefs = {
  schemaVersion: PREFS_SCHEMA_VERSION,
  srs: { dailyNewCap: 20, skipLearningSteps: false },
  progress: { xp: 0, streakDays: 0, lastStudyDay: null, weeklyXp: {} },
};

export function migratePrefs(raw: unknown): Prefs {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_PREFS };
  const prefs = raw as Prefs;
  const version = typeof prefs.schemaVersion === "number" ? prefs.schemaVersion : 0;
  if (version > PREFS_SCHEMA_VERSION) return prefs; // newer writer: leave alone
  return { ...DEFAULT_PREFS, ...prefs, schemaVersion: PREFS_SCHEMA_VERSION };
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
