/**
 * Loads gate pools once per session and caches them. Features read from here;
 * the gate stays the only raw-data boundary.
 */

import { useEffect, useState } from "react";
import { loadGrammar, loadKana, loadKanji, loadVocab } from "../content/gate";
import type { GrammarLesson, KanaItem, KanjiItem, VocabItem } from "../content/models";
import type { JlptLevel } from "../content/ids";

interface Pools {
  kana: KanaItem[];
  kanji: KanjiItem[];
  vocab: VocabItem[];
  grammar: GrammarLesson[];
  flags: number;
}

let cache: Pools | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

export function primePools(level: JlptLevel): Promise<Pools> {
  if (cache) return Promise.resolve(cache);
  return Promise.all([
    Promise.resolve(loadKana()),
    Promise.resolve(loadKanji(level)),
    Promise.resolve(loadVocab(level)),
    Promise.resolve(loadGrammar(level)),
  ]).then(([kana, kanji, vocab, grammar]) => {
    cache = {
      kana: kana.items,
      kanji: kanji.items,
      vocab: vocab.items,
      grammar: grammar.items,
      flags: kana.flags.length + kanji.flags.length + vocab.flags.length + grammar.flags.length,
    };
    notify();
    return cache;
  });
}

export function usePools(level: JlptLevel): Pools | null {
  const [pools, setPools] = useState<Pools | null>(cache);
  useEffect(() => {
    const onChange = (): void => setPools(cache);
    listeners.add(onChange);
    void primePools(level);
    return () => {
      listeners.delete(onChange);
    };
  }, [level]);
  return pools;
}

/** All gradable content IDs for the SRS pool (kanji N5 + gated vocab N5). */
export function srsPoolIds(pools: Pools): string[] {
  return [...pools.kanji.map((k) => k.id), ...pools.vocab.map((v) => v.id)];
}
