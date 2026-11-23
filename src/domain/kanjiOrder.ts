/**
 * Kanji map order (owner decision 2026-11-23): numerals first by numeric
 * value (円 right after them), then every other kanji by Unicode codepoint,
 * which in the CJK Unified block follows radical/stroke dictionary order.
 * Display-only: drills and data keep their own order.
 */

const LEAD = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "百", "千", "万", "円"];
const LEAD_RANK = new Map(LEAD.map((ch, i) => [ch, i]));

export function orderKanjiForMap<T extends { char: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const ra = LEAD_RANK.get(a.char);
    const rb = LEAD_RANK.get(b.char);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return (a.char.codePointAt(0) ?? 0) - (b.char.codePointAt(0) ?? 0);
  });
}
