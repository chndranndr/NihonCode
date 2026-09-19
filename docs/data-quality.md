# Data Quality

Raw `data/` is untrusted, read-only source content (43 JSON files + 184 MP3s + one legacy `index.ts`). This document is the **measured** defect ledger. Numbers come from `scripts/audit-data.mjs` (run `npm run audit:data -- --json` to reproduce); `scripts/data-baseline.json` freezes them. PRD.md section 18 states the same picture with slightly different definitions where noted.

## Baseline drift policy

`npm run check` includes the audit: any structural change in raw `data/` fails CI-equivalent checks until acknowledged. Raw data is never hand-edited. A deliberate, reviewed dataset update lands as: regenerate baseline (`node scripts/audit-data.mjs --write-baseline`) + update this document in the same change, and report the measured delta to the owner — PRD.md section 18 is owner-authored and is not edited by agents.

## Inventory (measured)

| Asset                 | Count                     | Status                                                                                        |
| --------------------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| Kana                  | 46 hiragana + 46 katakana | Basic gojuon only; no voiced/contracted/small kana                                            |
| Kanji entries         | 2,212 (N5: 80)            | N5 marker-free; N4–N1 carry dictionary markers                                                |
| Vocabulary entries    | 7,938                     | `romaji` unreliable below                                                                     |
| Grammar lessons       | 832 (N5: 72)              | All 2,496 quiz answers inside their choices                                                   |
| JLPT exercise sets    | 688                       | Structural defects + remote media below                                                       |
| JLPT question records | 5,339                     | `answer_index` is 1-based; `answer_text` always agrees with `options[index-1]` (0 mismatches) |
| Local listening MP3s  | 184                       | All exist, non-empty, valid MPEG/ID3 header                                                   |
| practice_core.json    | 775 records               | All IDs resolve by array position; 130 IDs legitimately shared                                |

## Vocabulary `romaji` — three separate problems

Definitions: `latinRomaji` = non-empty, all chars in `\x20-\x7E`. Measured: 643 entries latin (all N5), 7,295 non-latin, of which 6,814 are exact copies of `kana`. (PRD section 18 says 7,293/6,812 — definitional delta: the PRD counted non-empty Japanese-text values; the audit counts everything not latin, which includes 2 entries with both readings empty.)

1. **Problem A — mislabeled field (7,295 entries).** Japanese text in `romaji`. All of N4–N1 plus 101 N5 entries.
2. **Problem B — semantic reading mismatch (unquantified).** Valid `kana` paired with a Latin `romaji` of a different sense (N5 一日: `romaji: ichinichi`, `kana: ついたち`). Needs a kana→romaji normalizer + human review; a character-class check cannot catch it.
3. **Problem C — packed alternatives.** 7 entries carry `/` in latin `romaji`, 5 carry `;`/`；` in `kana`. Need an explicit variants array before exact-match grading or TTS.

Also measured: 2 N4 entries with empty `kana` **and** `romaji`; 8 entries with kanji in the `kana` field.

## Kanji answers — dictionary markers (Problem D)

Measured: 1,157 entries / 2,524 answer strings across N4–N1 contain `.` or `-` dictionary notation (`た.りる`, `-こ.む`). N5: **0** (clean). (PRD says 1,130/2,455 — the audit's regex also catches hyphenated compound readings the PRD sample missed; both agree N5 is clean.) Display readings and accepted learner answers need separate normalization in Phase 2.

## Grammar

Structurally valid: 0 quiz answers outside their choices, across all 832 lessons. `meta.reviewed` is `true` for N5 only. Content defects confirmed in the implementation plan (malformed generated answers like `としなら`, generic non-discriminating stems, duplicate examples, uninstantiated `～`) are **not** mechanically counted yet — they route to the Phase 2.4 human-review queue.

## JLPT

| Defect                                       | Measured  | Notes                                                                                                                                          |
| -------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Questions with remote images                 | 927       | `japanesetest4you.com` URLs, no local copies                                                                                                   |
| Passages with remote images                  | 103       | PRD says 108; the audit excludes passages whose `image_urls` hold only `.mp3` URLs                                                             |
| Truncated prompts (`「` only)                | 33        | Question fragment pushed into choices                                                                                                          |
| Null `answer_index`                          | 5         | All N3 reading; scraped reference rows, not questions                                                                                          |
| `answer_text` vs `options[index-1]` mismatch | 0         | Keyed questions are internally consistent                                                                                                      |
| Empty-text passages                          | 4         | N2 reading `passage-3`, remote-image dependent                                                                                                 |
| Boilerplate passages                         | 2         | "Click here to download this test…"                                                                                                            |
| MP3 URLs in `image_urls`                     | 5         | N3 reading sets 15–16 (in passage entries)                                                                                                     |
| Audio refs / distinct local files            | 930 / 184 | Every local path aliased by multiple source URLs; segment-vs-concatenation **unverified** — listening does not ship until resolved (Phase 2.5) |

## Practice core ID convention (blocking finding for Phase 2)

Neither resolution is canonical; both are measured and pinned in the baseline:

- **By array position**: all 775 records resolve (`unresolvedByPosition: 0`). Positional resolution is used only as a dangling-reference check.
- **By the `number` field**: 32 IDs fail (`unresolvedByNumber: 32`). `number` cannot be a key: 5 sets contain duplicate numbers (e.g. N5 kanji Exercise 01 has two questions both `"number": 5`) and 57 sets have gapped sequences; `number` diverges from position on 281 of 5,339 questions.

Positional IDs are unsafe as learner-progress keys: DEVELOPMENT_PROMPT.md section 2 mandates stable, content-order-independent IDs ("Progress references IDs, never positions"), and Phase 2's pipeline writes `data/clean/`, which implementation_plan.md requires IDs to survive. The raw 4-segment shape (`n5:kanji:10:3`) also does not match the mandated `jlpt:n5:listening:12:3` shape. **Canonical ID assignment is Phase 2 work** (implementation_plan.md Phase 2.5: "confirm `number` is not used as a unique key"); the audit gates neither convention, only index integrity (`practiceCoreIndexIntact`: no dangling positional refs, `questionCount === questionIds.length`).

## Clean-slice gate (MVP)

`audit-data.mjs` fails if any of these stop holding — the Phase 1 graded pool depends on them. Counts are floors (later phases legitimately grow them); defect ceilings are exact zeros:

- kana tables hold at least the 46+46 basic gojuon (Phase 2.6 may extend);
- kanji N5 has at least 80 entries and zero marker answers;
- N5 latin-romaji vocab pool is at least 643 and **zero** latin-romaji entries exist outside N5 (no N4–N1 leak into the vocab pool). The gate's graded pool is 641: 2 of the 643 pack alternatives (Problem C) and are excluded from exact-match grading until they get a variants list;
- grammar N5 `meta.reviewed === true`;
- grammar quiz answers all inside choices;
- all 184 distinct local MP3s exist with valid headers;
- practice_core index intact (no dangling positional refs, counts match ID lists).

The audit walks `data/generated/` and `data/jlpt/` only; `data/clean/` (Phase 2 output) can never register as raw-data drift.

## Legacy loader

`data/generated/index.ts` imports types from `../../types/content`, which does not exist. It is outside the `src/` tsconfig and is not compiled or linted. Phase 1 task 1 recreates or replaces the type contract; until then treat the file as reference only, not as an importable module.

## Attribution

Per-file source metadata: amgidex grammar lists, Tatoeba (CC BY 2.0 FR) examples, japanesetest4you exercises/audio. No consolidated attribution document exists; redistribution clearance is **pending and blocks public release** (implementation_plan.md Phase 2.7). The About page renders clearance statuses from a data file, never from prose.
