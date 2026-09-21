/**
 * Loads the gate pools once per session and caches them. Features read from
 * here; the gate stays the only raw-data boundary. The loaders are synchronous
 * (static JSON imports), so pools are available on first render.
 */

import { loadGrammar, loadKana, loadKanji, loadVocab } from "../content/loaders";
import type { GrammarLesson, KanaItem, KanjiItem, VocabItem } from "../content/models";

export interface Pools {
  kana: KanaItem[];
  kanji: KanjiItem[];
  vocab: VocabItem[];
  grammar: GrammarLesson[];
}

let cache: Pools | null = null;

export function getPools(): Pools {
  if (!cache) {
    cache = {
      kana: loadKana().items,
      kanji: loadKanji().items,
      vocab: loadVocab().items,
      grammar: loadGrammar().items,
    };
  }
  return cache;
}

/** All gradable content IDs for the SRS pool (kanji N5 + gated vocab N5). */
export function srsPoolIds(pools: Pools): string[] {
  return [...pools.kanji.map((k) => k.id), ...pools.vocab.map((v) => v.id)];
}
