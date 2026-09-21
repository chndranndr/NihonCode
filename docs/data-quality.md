# Data Quality

`data/clean/` is the repository's only dataset: the curated, committed pool the app reads (2,298 verdicts from the N5/N4 manual curation applied; listening MP3s included). The raw scrape and the Phase 2 build pipeline were retired by owner directive (docs/decisions.md 2026-09-21); this document keeps the **measured** defect ledger of that raw data as history — its numbers came from `scripts/audit-data.mjs` + `scripts/data-baseline.json`, both retired with it. PRD.md section 18 states the same picture with slightly different definitions where noted.

## Tracked-pool change policy

`npm run check` runs `scripts/audit-clean.mjs`: any defect class or duplicate ID in `data/clean/` fails CI-equivalent checks. Content changes land as tracked edits to `data/clean/` plus an update to this ledger in the same change, reported to the owner — PRD.md section 18 is owner-authored and is not edited by agents.

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

| Defect                                       | Measured  | Notes                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Questions with remote images                 | 927       | `japanesetest4you.com` URLs, no local copies                                                                                                                                                                                                                                                                                              |
| Passages with remote images                  | 103       | PRD says 108; the audit excludes passages whose `image_urls` hold only `.mp3` URLs                                                                                                                                                                                                                                                        |
| Truncated prompts (`「` only)                | 33        | Question fragment pushed into choices                                                                                                                                                                                                                                                                                                     |
| Null `answer_index`                          | 5         | All N3 reading; scraped reference rows, not questions                                                                                                                                                                                                                                                                                     |
| `answer_text` vs `options[index-1]` mismatch | 0         | Keyed questions are internally consistent                                                                                                                                                                                                                                                                                                 |
| Empty-text passages                          | 4         | N2 reading `passage-3`, remote-image dependent                                                                                                                                                                                                                                                                                            |
| Boilerplate passages                         | 2         | "Click here to download this test…"                                                                                                                                                                                                                                                                                                       |
| MP3 URLs in `image_urls`                     | 5         | N3 reading sets 15–16 (in passage entries)                                                                                                                                                                                                                                                                                                |
| Audio refs / distinct local files            | 930 / 184 | Every local path aliased by multiple source URLs. All 184 are concatenation-candidates (refs == question count); durations measured by the pure-JS parser in scripts/lib/mp3.mjs (±0.07s vs ffprobe). Evidence table + owner sample: `data/clean/audio-evidence.json`. Listening blocked until the owner confirms the sample (Phase 2.5). |

## Practice core ID convention — resolved (Phase 2 task 8)

**Closed 2026-09-20**: canonical IDs assigned in the clean output as `jlpt:<level>:<category>:<set-number>:<content-hash>` (docs/decisions.md "Canonical JLPT IDs"). Neither raw resolution was adopted as canonical:

- **By array position**: all 775 records resolve (`unresolvedByPosition: 0`). Positional resolution served only as a dangling-reference check during Phase 2; the tracked pool now stores canonical ids and `audit-clean` checks referential integrity directly.
- **By the `number` field**: 32 IDs fail (`unresolvedByNumber: 32`). `number` cannot be a key: 5 sets contain duplicate numbers (e.g. N5 kanji Exercise 01 has two questions both `"number": 5`) and 57 sets have gapped sequences; `number` diverges from position on 281 of 5,339 questions.

`data/clean/practice_core.json` holds every reverse-index record in the canonical scheme (775 records, 976 refs, 0 unresolved). Uniqueness and referential integrity are asserted by `scripts/audit-clean.mjs`. The raw `practice_core.json`, the deriver, and rebuild-stability hashing were retired with the build pipeline on 2026-09-21 (docs/decisions.md); the ids are now frozen content of the tracked pool.

## Tracked-pool gate

`audit-clean.mjs` fails if any of these stop holding — the graded pools depend on them:

- zero defect-class findings across every included pool (markers, Japanese romaji, empty readings, uninstantiated ～, malformed answers, scrub artifacts in questions and passage titles/text);
- unique IDs within every pool;
- kana tables hold the 46+46 basic gojuon; kanji N5 80 marker-free entries; graded vocab N5 738 / N4 649; graded grammar 72 N5 + 130 N4 lessons with answer-in-choices quizzes;
- every referenced listening MP3 exists under `data/clean/audio/` with a local (non-remote) path;
- practice_core index intact (no dangling refs, counts match ID lists).

The historical raw-data floors (643 latin N5 vocab, etc.) are ledger history; the live numbers above are what the gate asserts today.

## Conjugation metadata (N5, curated 2026-09-21)

DEVELOPMENT_PROMPT task 1 closed implementation_plan.md:197: every N5 Verbs and Adjectives entry now carries curated `pos` + `conjugationClass` (tracked edit to `data/clean/vocabulary_n5.json`; verdict record `curation/adjudications.json` key `vocab.conjugation:n5`). Counts after curation: Verbs 117 (godan 80, ichidan 32, irregular 5), Adjectives 84 (i 65, na 19). Seven misbucketed entries moved to Nouns — unconjugatable content, exactly the PRD §18 failure class the metadata exists to catch: 下さい (a polite request, not a verb), and the nouns お手洗い, 家庭, 時計, 野菜, 大きな, 小さな (pre-noun adnominals, not na-adjectives). Classification was by kana shape with per-entry overrides, never from category buckets: godan-る overrides 入る/帰る/走る/切る/知る, ichidan 着る, na overrides 嫌い/綺麗/有名, irregular する/来る/コピーする/勉強(する)/掃除(する). N4–N1 entries carry no metadata until their curation passes; `audit-clean` enforces the invariant per level (N5 today: every Verbs/Adjectives entry has a valid class, no other category carries one) with a self-test fixture. Spot-check sample (40 entries, verified against class definitions):

| Class     | Sample                                                                                   |
| --------- | ---------------------------------------------------------------------------------------- |
| godan     | ある, 有る, 入る, 帰る, 走る, 死ぬ, 行く, 泳ぐ, 持つ, 洗う, 座る, 貸す, 置く, 話す, 鳴く |
| ichidan   | かける, 晴れる, 食べる, 着る, できる, 見る, 浴びる, 出る                                 |
| irregular | する, 勉強, 来る                                                                         |
| i         | いい, 楽しい, 黒い, ない                                                                 |
| na        | にぎやか, 大変, 静か, 綺麗, 嫌い, 有名, 好き, 上手, 下手, 大丈夫                         |

## Legacy loader

`data/generated/index.ts` was deleted as Phase 2 task 1 pipeline cleanup: reference-only, outside every tsconfig, importing a nonexistent `../../types/content`; the gate owns the type contract. The deletion re-based `scripts/data-baseline.json` (`fileCounts.ts` 1 → 0) with this row updated in the same change.

## Attribution

Per-file source metadata consolidated in [attribution.md](attribution.md): amgidex grammar lists, Tatoeba (CC BY 2.0 FR) examples, japanesetest4you exercises/audio, with per-source redistribution status. Redistribution clearance remains an owner action and **blocks public release**; `src/content/sources.ts` mirrors the statuses. The About page renders clearance statuses from that data file, never from prose.

## Manual N5/N4 curation (executed 2026-09-20)

Every N5 and N4 slice was manually reviewed. `curation/adjudications.json` records 2,298 verdicts (1,504 fix = verified correct, 740 replace = corrected, 54 exclude), each with a reason string; the replacements were applied into `data/clean/` by the (now retired) build pipeline and are frozen there. `curation/findings/` holds the per-slice agent findings as provenance (gitignored scratch); `adjudications.json` is the tracked record of what changed and why. Recording conventions differ by pool: vocab and kanji carry a per-entry verdict on every raw entry including clean-as-fix (vocab 1,006 fix + 381 replace + 23 exclude; kanji 246 fix); grammar and kana record defects only and JLPT is mixed — for those, rows reviewed clean carry no record and their pool-level clean claims live in the table below.

| Pool             | N5           | N4             | Notes                                                                                                                                                               |
| ---------------- | ------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| vocab            | 738 graded   | 649 graded     | field-swapped kanji/kana restored; kana-in-romaji transliterated; kana typos (ちーさい, まっすぐぐ) fixed; reading/meaning mismatches resolved by the meaning field |
| kanji            | 80 clean     | 166 clean      | zero meaning/reading errors on manual review                                                                                                                        |
| grammar          | 72/72 graded | 130/130 graded | 99 lesson replacements (uninstantiated ～, double-correct distractors); N4 promoted via `grammar.reviewed:n4`                                                       |
| JLPT (surviving) | 663 graded   | 830 graded     | wrong answer keys and corrupted scrape prompts corrected; 21 N5 passage-blank questions excluded (no local passage text)                                            |

Phase 1 graded-pool superset holds: zero vocab excludes touch a raw Latin-romaji entry. Two systemic scraper artifacts (stray control bytes, U+FF0D hyphen) are scrubbed at build time (`scripts/lib/scrub.mjs`) and asserted zero by `audit-clean`; 446 question fields + 15 passages scrubbed at the post-merge rebuild.

Open owner items: (1) **reading questions orphaned from dropped passages** — all 66 N5 + 129 N4 reading questions reference passages that were dropped (remote GIF); keep+restore-text vs exclude is a product call, docs/decisions.md. (2) listening remains blocked on the owner audio sample confirmation. (3) redistribution clearance still pending. (4) **keyed-answer repair needing owner confirmation**: `jlpt:n5:reading:10:bxpod7h8` shipped `answer_index: 3` with only 3 options; adjudicated replace → `answer_index: 2` (the keyed 4th option has no recoverable source text). (5) two reading-prompt typos were adjudicated directly by the owner (not via findings): `jlpt:n5:reading:10:3axd6i6` and `jlpt:n4:reading:24:2vq536m`. (6) **N3–N1 curation worklist**: the frozen 560 open items live in `curation/queue-n3-n1.json`; adjudicate them (per-entry verdicts into `curation/adjudications.json`, applied as tracked edits to `data/clean/`) when those levels are enabled.

## PRD §18 owner edit list (prepared 2026-09-20, Phase 2 close)

PRD.md is owner-authored; these are the deltas Phase 2 produced, prepared as edits for the owner. Historical snapshot as prepared 2026-09-20 — the pipeline it references (`build-clean`) was retired 2026-09-21 after its outputs were frozen into the tracked pool:

1. §18 inventory, JLPT row: `answer_index` is 1-based **in raw**; clean output normalizes it to 0-based and asserts `answer_text === options[answer_index]` (scripts/audit-clean.mjs).
2. §18 grammar: "Lesson IDs restart at 1 per level and need namespacing" — done in clean output (`grammar:<level>:<lessonId>`).
3. §18 integration gaps: `data/generated/index.ts` deleted (pipeline cleanup); the content pipeline existed (`npm run build:clean`) and was retired at the 2026-09-21 cutover with its outputs frozen into the tracked pool (docs/decisions.md); the attribution document exists (docs/attribution.md) with rights still pending.
4. §18 audio aliasing: measured evidence table and owner listening sample now exist (`data/clean/audio-evidence.json`, 2 sets per level); listening stays blocked pending owner confirmation, per docs/decisions.md.
5. §18 practice_core: all 775 records carry canonical content-hash IDs in the tracked pool (superseding raw positional resolution); the deriver was retired with the pipeline at the cutover, and `audit-clean` now guards referential integrity.
6. Definitional deltas (unchanged, already recorded above): vocab romaji 7,293 vs 7,295 and 6,812 vs 6,814; kanji markers 1,130 vs 1,157; remote-image passages 108 vs 103. Counts are raw-data facts and are untouched by Phase 2.
