/**
 * Bundler-side loaders for the clean slice (DEVELOPMENT_PROMPT.md section 2).
 * Static imports of exactly the four clean-slice files keep N4-N1 and JLPT
 * out of the bundle entirely (docs/quality.md Phase-1 bundle scope). The e2e
 * journey runs gate.ts's validators over fs-read files instead, because
 * bundler JSON imports do not load under bare Node.
 */

import kanaRaw from "../../data/generated/kana.json";
import kanjiN5Raw from "../../data/generated/kanji_n5.json";
import vocabularyN5Raw from "../../data/generated/vocabulary_n5.json";
import grammarN5Raw from "../../data/generated/grammar_n5.json";
import { validateGrammar, validateKana, validateKanji, validateVocab } from "./gate";
import type { JlptLevel } from "./ids";
import type { GateResult, GrammarLesson, KanaItem, KanjiItem, VocabItem } from "./models";

export const CLEAN_SLICE_LEVEL: JlptLevel = "n5";

function notEnabled(level: JlptLevel, file: string): GateResult<never> {
  return {
    items: [],
    flags: [
      {
        source: file,
        id: null,
        reason: `level ${level} is not enabled until Phase 2 clears its content`,
      },
    ],
  };
}

export function loadKana(): GateResult<KanaItem> {
  return validateKana(kanaRaw);
}

export function loadKanji(level: JlptLevel): GateResult<KanjiItem> {
  if (level !== CLEAN_SLICE_LEVEL) return notEnabled(level, `kanji_${level}.json`);
  return validateKanji(kanjiN5Raw, level);
}

export function loadVocab(level: JlptLevel): GateResult<VocabItem> {
  if (level !== CLEAN_SLICE_LEVEL) return notEnabled(level, `vocabulary_${level}.json`);
  return validateVocab(vocabularyN5Raw, level);
}

export function loadGrammar(level: JlptLevel): GateResult<GrammarLesson> {
  if (level !== CLEAN_SLICE_LEVEL) return notEnabled(level, `grammar_${level}.json`);
  return validateGrammar(grammarN5Raw, level);
}
