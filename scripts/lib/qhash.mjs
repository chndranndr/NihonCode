// Deterministic question-ID deriver for NEW or RESTORED JLPT questions only.
// Unchanged questions keep their frozen clean-pool IDs (identity preservation,
// docs/decisions.md 2026-09-23). FNV-1a 32-bit over the normalized content,
// base36, 8 chars. The original Phase-2 deriver was retired with the build
// pipeline (b15c717); this scheme is documented, not compatible with it.
//
// CLI: node scripts/lib/qhash.mjs <level> <category> <setNumber> '<questionJson>'
//   questionJson: {"prompt":..., "options":[...], "answer_index":0}
//   answer_index is the CLEAN 0-based index.

export function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function normalizeContent(q) {
  const norm = (x) => (typeof x === "string" ? x.replace(/\s+/g, "").trim() : "");
  return [
    norm(q.prompt),
    ...(q.options || []).map(norm),
    q.answer_index,
    norm(q.answer_text ?? q.options?.[q.answer_index] ?? ""),
  ].join("|");
}

export function questionId(level, category, setNumber, q) {
  const h = fnv1a(normalizeContent(q)).toString(36).padStart(8, "0").slice(-8);
  return `jlpt:${level}:${category}:${setNumber}:${h}`;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const [level, category, setNumber, json] = process.argv.slice(2);
  if (!level || !category || !setNumber || !json) {
    console.error("usage: qhash.mjs <level> <category> <setNumber> '<questionJson>'");
    process.exit(2);
  }
  console.log(questionId(level, category, Number(setNumber), JSON.parse(json)));
}
