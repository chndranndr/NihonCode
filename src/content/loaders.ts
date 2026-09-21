/**
 * Bundler-side loaders for the clean pool (Phase 3 loader swap + per-level
 * lazy loading). Each level's datasets load through dynamic imports, so the
 * initial bundle carries no inactive-level chunks (implementation_plan Phase
 * 3 DoD); the active level is fetched once and cached. data/clean/ is the
 * app's single source of truth; scripts/audit-clean.mjs proves it
 * defect-free. The e2e journey runs gate.ts's validators over fs-read clean
 * files instead, because bundler imports do not load under bare Node.
 */

import { validateGrammar, validateKana, validateKanji, validateVocab } from "./gate";
import type { JlptLevel } from "./ids";
import type { GateResult, GrammarLesson, KanaItem, KanjiItem, VocabItem } from "./models";

/** Levels whose pools are curated and served (docs/decisions.md). */
export const ENABLED_LEVELS: readonly JlptLevel[] = ["n5", "n4"];

export interface LevelData {
  level: JlptLevel;
  kana: GateResult<KanaItem>;
  kanji: GateResult<KanjiItem>;
  vocab: GateResult<VocabItem>;
  grammar: GateResult<GrammarLesson>;
}

export class LevelUnavailableError extends Error {
  constructor(level: JlptLevel) {
    super(`level ${level} is not enabled yet (docs/decisions.md)`);
    this.name = "LevelUnavailableError";
  }
}

// kana is shared across levels; one cached load serves every level.
let kanaCache: GateResult<KanaItem> | null = null;

async function loadKana(): Promise<GateResult<KanaItem>> {
  if (!kanaCache) {
    // Dynamic import: the active level is selected at runtime from prefs and
    // only that level's chunks may load (Phase 3 DoD); static imports would
    // bundle every level up front.
    const mod = await import("../../data/clean/kana.json");
    kanaCache = validateKana(mod.default);
  }
  return kanaCache;
}

/**
 * Load one level's datasets. The gate rejects levels outside the enabled
 * set, so a stored preference can never surface uncurated content.
 */
export async function loadLevelData(level: JlptLevel): Promise<LevelData> {
  if (!ENABLED_LEVELS.includes(level)) throw new LevelUnavailableError(level);
  // Per-level chunk selection; see loadKana for why dynamic imports here.
  const [kana, kanjiMod, vocabMod, grammarMod] = await Promise.all([
    loadKana(),
    import(`../../data/clean/kanji_${level}.json`),
    import(`../../data/clean/vocabulary_${level}.json`),
    import(`../../data/clean/grammar_${level}.json`),
  ]);
  return {
    level,
    kana,
    kanji: validateKanji(kanjiMod.default, level),
    vocab: validateVocab(vocabMod.default, level),
    grammar: validateGrammar(grammarMod.default, level),
  };
}
