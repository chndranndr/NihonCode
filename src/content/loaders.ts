/**
 * Bundler-side loaders for the clean pool (Phase 3 loader swap + per-level
 * lazy loading). Each level's datasets load through dynamic imports, so the
 * initial bundle carries no inactive-level chunks (implementation_plan Phase
 * 3 DoD); the active level is fetched once and cached. data/clean/ is the
 * app's single source of truth; scripts/audit-clean.mjs proves it
 * defect-free. The e2e journey runs gate.ts's validators over fs-read clean
 * files instead, because bundler imports do not load under bare Node.
 */

import { validateGrammar, validateJlpt, validateKana, validateKanji, validateVocab } from "./gate";
import type { JlptLevel } from "./ids";
import type {
  GateResult,
  GrammarLesson,
  JlptCategory,
  JlptSet,
  KanaItem,
  KanjiItem,
  PracticeCoreIndex,
  VocabItem,
} from "./models";

/** Levels whose pools are curated and served (docs/decisions.md). */
export const ENABLED_LEVELS: readonly JlptLevel[] = ["n5", "n4", "n3", "n2", "n1"];

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

/** Categories served today. Listening awaits the owner's audio confirmation
 * and reading the owner's keep/exclude call (docs/decisions.md); both show
 * honest locked panels, not dead tiles. */
export const LIVE_JLPT_CATEGORIES = ["grammar", "kanji", "vocabulary"] as const;

export type JlptPool = Record<JlptCategory, GateResult<JlptSet>>;

const jlptCache = new Map<JlptLevel, JlptPool>();

// Literal category segments: a template-literal category would make the
// bundler emit chunks for every file under jlpt/<level>/ — including the
// gated listening/reading sets the UI refuses to serve. With literals, only
// the three live categories exist in the bundle.
const JLPT_IMPORTS: Record<
  (typeof LIVE_JLPT_CATEGORIES)[number],
  (level: JlptLevel) => Promise<{ default: unknown }>
> = {
  grammar: (level) => import(`../../data/clean/jlpt/${level}/grammar.json`),
  kanji: (level) => import(`../../data/clean/jlpt/${level}/kanji.json`),
  vocabulary: (level) => import(`../../data/clean/jlpt/${level}/vocabulary.json`),
};

/** Load one level's JLPT practice sets through the gate, cached per level. */
export async function loadJlptLevel(level: JlptLevel): Promise<JlptPool> {
  if (!ENABLED_LEVELS.includes(level)) throw new LevelUnavailableError(level);
  const cached = jlptCache.get(level);
  if (cached) return cached;
  const [grammarMod, kanjiMod, vocabMod] = await Promise.all(
    LIVE_JLPT_CATEGORIES.map((cat) => JLPT_IMPORTS[cat](level)),
  );
  const pool: JlptPool = {
    grammar: validateJlpt(grammarMod.default, level, "grammar"),
    kanji: validateJlpt(kanjiMod.default, level, "kanji"),
    vocabulary: validateJlpt(vocabMod.default, level, "vocabulary"),
    listening: { items: [], flags: [] },
    reading: { items: [], flags: [] },
  };
  jlptCache.set(level, pool);
  return pool;
}

let practiceCoreCache: PracticeCoreIndex | null = null;

/**
 * The practice_core reverse index (which JLPT questions touch a kanji/vocab
 * entry). Shared across levels; one cached load. Frozen and audit-clean —
 * referential integrity is guarded by scripts/audit-clean.mjs.
 */
export async function loadPracticeCore(): Promise<PracticeCoreIndex> {
  if (practiceCoreCache) return practiceCoreCache;
  const mod = await import("../../data/clean/practice_core.json");
  practiceCoreCache = mod.default as PracticeCoreIndex;
  return practiceCoreCache;
}
