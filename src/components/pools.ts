/**
 * Pool derivation from loaded level data (Phase 3). The loaders are async
 * (per-level dynamic imports); LevelProvider (components/level.tsx) fetches
 * and caches the active level, then hands the raw LevelData here. This module
 * stays pure: no cache, no side effects, no React.
 */

import type { LevelData } from "../content/loaders";
import type { GrammarLesson, KanaItem, KanjiItem, VocabItem } from "../content/models";

export interface Pools {
  kana: KanaItem[];
  kanji: KanjiItem[];
  vocab: VocabItem[];
  grammar: GrammarLesson[];
}

/** Items-only view of a loaded level, for features that slice content. */
export function poolsFromLevelData(data: LevelData): Pools {
  return {
    kana: data.kana.items,
    kanji: data.kanji.items,
    vocab: data.vocab.items,
    grammar: data.grammar.items,
  };
}

/** All gradable content IDs for the SRS pool (kanji + gated vocab). */
export function srsPoolIds(pools: Pools): string[] {
  return [...pools.kanji.map((k) => k.id), ...pools.vocab.map((v) => v.id)];
}
