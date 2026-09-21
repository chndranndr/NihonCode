// check-rekeys: asserts VOCAB_N5_REKEYS against the final clean pool
// (docs/decisions.md "N5 vocab re-key migration sequencing"). Run after
// `npm run merge:findings && npm run build:clean`: every old id must be gone
// from the clean N5 vocab pool, every new id must exist. A phantom pair
// (target id that will never exist) would silently delete live progress in
// the Phase 3 migration, so this check gates that landing.
//
//   node scripts/check-rekeys.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const cleanPool = JSON.parse(readFileSync(join(repoRoot, "data/clean/vocabulary_n5.json"), "utf8"));
const cleanIds = new Set(cleanPool.categories.flatMap((c) => c.entries.map((e) => e.id)));

// Mirrors src/storage/vocab-migration.ts VOCAB_N5_REKEYS (the map is
// TypeScript; this script re-reads it from source so they cannot drift
// silently).
const src = readFileSync(join(repoRoot, "src/storage/vocab-migration.ts"), "utf8");
const block = src.slice(
  src.indexOf("VOCAB_N5_REKEYS"),
  src.indexOf("};", src.indexOf("VOCAB_N5_REKEYS")),
);
const pairs = [...block.matchAll(/"(vocab:n5:[^"]+)":\s*"(vocab:n5:[^"]+)"/g)].map((m) => [
  m[1],
  m[2],
]);

const failures = [];
// Non-vacuity: a slice that matches zero pairs (map moved, comment-only hit)
// must fail, not report OK. 24 = the curated N5 re-key pairs; changing the map
// changes this number deliberately.
if (pairs.length !== 24)
  failures.push(
    `expected 24 re-key pairs in VOCAB_N5_REKEYS, sliced ${pairs.length} (map moved or slice broken)`,
  );
for (const [oldId, newId] of pairs) {
  if (cleanIds.has(oldId)) failures.push(`old id still in clean pool: ${oldId}`);
  if (!cleanIds.has(newId))
    failures.push(`new id missing from clean pool (phantom target): ${newId}`);
}

if (failures.length > 0) {
  console.error(`check-rekeys: ${failures.length} failure(s):`);
  for (const f of failures) console.error(`  ${f}`);
  console.error("(expected pre-merge: run after merge-findings + build-clean)");
  process.exit(1);
}
console.log(`check-rekeys: OK (${pairs.length} pairs; old ids gone, new ids present)`);
