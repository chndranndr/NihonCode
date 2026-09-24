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

| Defect                                       | Measured                                                           | Notes                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Questions with remote images                 | 927 → 0                                                            | Restored 2026-09-23 (data-recon): all localized under `data/clean/images/` with provenance URLs kept in `images[].url`; audit-clean rejects bare `image_urls` and missing local files                                                                                                                                                                                                                                   |
| Passages with remote images                  | 103 → 0 (final count re-measured after ReadingAll's PASS verifies) | Localized the same way; N3 reading sets 15–16 passage media were MP3s (see audio row)                                                                                                                                                                                                                                                                                                                                   |
| Truncated prompts (`「` only)                | 33                                                                 | Question fragment pushed into choices; excluded sets/questions stay out of the graded pool                                                                                                                                                                                                                                                                                                                              |
| Null `answer_index`                          | 5                                                                  | All N3 reading; scraped reference rows, not questions                                                                                                                                                                                                                                                                                                                                                                   |
| `answer_text` vs `options[index-1]` mismatch | 0                                                                  | Keyed questions are internally consistent                                                                                                                                                                                                                                                                                                                                                                               |
| Empty-text passages                          | 4                                                                  | N2 reading `passage-3`, remote-image dependent; excluded from restored sets                                                                                                                                                                                                                                                                                                                                             |
| Boilerplate passages                         | 2                                                                  | "Click here to download this test…"; excluded                                                                                                                                                                                                                                                                                                                                                                           |
| MP3 URLs in `image_urls`                     | 5 → 0                                                              | N3 reading sets 15–16: recognized as audio, mapped to the set audio arrays (`audio/n3/reading/jlpt-n3-reading-exercise-{15,16}.mp3` exist locally)                                                                                                                                                                                                                                                                      |
| Audio refs / distinct local files            | 930 / 184                                                          | Confirmed correct by the owner 2026-09-23 (redistribution rights held). 881/933 listening questions carry explicit per-question audio bindings whose spans are DERIVED by uniform division of the ffprobe-measured duration (the Phase-2 convention in `data/clean/audio-evidence.json`), NOT acoustically measured; the 10 sets whose source URL count ≠ question count ship set-level audio only — no index guessing. |

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

DEVELOPMENT_PROMPT task 1 closed implementation_plan.md:197: every N5 Verbs and Adjectives entry now carries curated `pos` + `conjugationClass` (tracked edit to `data/clean/vocabulary_n5.json`; verdict record `curation/adjudications.json` key `vocab.conjugation:n5`). Counts after curation: Verbs 117 (godan 80, ichidan 32, irregular 5), Adjectives 84 (i 65, na 19). Seven misbucketed entries moved to Nouns — unconjugatable content, exactly the PRD §18 failure class the metadata exists to catch: 下さい (a polite request, not a verb), and the nouns お手洗い, 家庭, 時計, 野菜, 大きな, 小さな (pre-noun adnominals, not na-adjectives). Classification was by kana shape with per-entry overrides, never from category buckets: godan-る overrides 入る/帰る/走る/切る/知る/要る, ichidan 着る, na overrides 嫌い/綺麗/有名, irregular する/来る/コピーする/勉強(する)/掃除(する). N4–N1 entries carry no metadata until their curation passes; `audit-clean` enforces the invariant per level (N5 today: every Verbs/Adjectives entry has a valid class, no other category carries one) with a self-test fixture. Spot-check sample (44 entries, verified against class definitions):

| Class     | Sample                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------- |
| godan     | ある, 有る, 入る, 帰る, 走る, 死ぬ, 行く, 泳ぐ, 持つ, 洗う, 座る, 貸す, 置く, 話す, 鳴く, 要る |
| ichidan   | かける, 晴れる, 食べる, 着る, できる, 見る, 浴びる, 出る                                       |
| irregular | する, 勉強, 掃除, 来る, コピーする                                                             |
| i         | いい, 楽しい, 黒い, ない, よい                                                                 |
| na        | にぎやか, 大変, 静か, 綺麗, 嫌い, 有名, 好き, 上手, 下手, 大丈夫                               |

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

Open owner items (2026-09-23 update): (1) ~~reading orphaned~~ closed — passages restored from source (data-recon). (2) ~~listening blocked~~ closed — owner confirmed audio correct. (3) redistribution: **closed 2026-09-23** — JLPT assets carry the owner redistribution confirmation; amgidex grammar lists permitted by owner decision for this non-commercial project (docs/attribution.md). (4) ~~keyed-answer repair~~ closed: the question is `jlpt:n5:reading:11:bxpod7h8` (the gate text's set number was wrong), it ships with 4 options, `answer_index: 3`, and the repaired distractor set (電話しまあした → 電話しました); curation/adjudications.json records the repair. (5) two reading-prompt typos were adjudicated directly by the owner (not via findings): `jlpt:n5:reading:10:3axd6i6` and `jlpt:n4:reading:24:2vq536m`. (6) ~~N3–N1 curation worklist~~ **done 2026-09-21** — all 560 items adjudicated (section below); all five levels enabled.

## Content repair pass (executed 2026-09-23, owner-authorized)

Owner Q&A authorized authoring proper content instead of shipping truncated or wrong-sense material (docs/decisions.md "Content repair authorized"). Five disjoint workers rewrote, all verified on disk:

| Slice                                                                  | Count | Result                                                                                                                                                                                                       |
| ---------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Truncated explanations (N2 63, N1 56)                                  | 119   | rewritten into complete, key-grounded explanations; census now 0                                                                                                                                             |
| Wrong-sense graded lessons (N3 18, N2 13, N1 9)                        | 40    | pattern-correct examples + quizzes; blanks restored; floors hold                                                                                                                                             |
| Corrupt questions (scrape-cut prompts / fragment options / wrong keys) | 16    | all 16 restored source-verbatim from the licensed pages (full prompts, option sets, answer keys); frozen IDs kept per the ID policy; 2 earlier misrepairs (c9vkhl1s, 1xc1a778) corrected to the source shape |

Pool totals after both repair waves (measured 2026-09-24): 5,330 live questions, 4,357 explanations, 9 dropped[] entries remaining (2 scraper mis-parses of set intro sentences whose real items already live in the pool, plus 7 notice-table rows that were never questions). No practice_core dangling refs. Findings: .recon/findings/{ExplN2,ExplN1,GramExN3,GramExN2,GramExN1,Integration}.tsv.

History: predicates v3/v4 measured 0 for the fragment/cut classes after waves 1-2, but v5 (same day) exposed a marker-prompt/stranded-question reading class of 119 items, all restored source-verbatim by an extraction wave before v9 was defined.

Predicate v10 (the sweep's current definition, `node .recon/sweep-corruption.mjs`) catches: fragment options ("。", "_", starting 」 or 、); stranded question tails (a kana-only option ending か。, or a clause starting と/の/は/に/が/で and containing 何/どれ/どの/なぜ/どんな/どう and ending か。); tail fragments (an option of five or more chars ending 。！？ while the prompt lacks terminal punctuation); cut prompts; and marker-only prompts. Star-order items and usage-questions (every option a complete sentence) are legitimate formats and excluded. Final measurement 2026-09-24 after the tail-fragment restoration wave (122 items across n5/n3/n2 kanji and n3 vocabulary, restored source-verbatim with full prompts and four-candidate option lists): 0 class A, 0 class B, 0 total. Every damage class the sweep defines is now empty. Seven n3 vocabulary set-6 items whose stored answer_text was a fragment or distractor at a correct index were resynced to the page key with explanations rewritten to defend it. Combined with the earlier waves, no JLPT question in the pool carries known scrape damage; the 9 dropped[] entries remain non-questions by construction.

Prior-curation dropped[] repair (started 2026-09-24, owner directive "repair them all, do not drop"): of the 78 entries, 71 are real questions restorable from licensed source pages and 7 are redundant scrape rows that were never questions (n3 reading sets 1 and 6 notice-table rows: 場所/担当者/連絡先/募集人員/募集期間/申し込み方法/お問合せ・郵送先 parsed as items; they stay in dropped[] as jlpt.referenceRow / jlpt.keyedNonQuestion with a note). The exclusions carry recorded verdicts in curation/adjudications.json keyed by full jlpt id (disposition "exclude" with a reason, e.g. passage-blank items whose passage was never scraped, source readings lost by the scrape); this wave reverses those verdicts per owner directive. The 71 are restored by an 8-worker wave over disjoint pool files; passage-blank n5 grammar items and A/B comparison n1 reading sets 35/46 get their passages restored from the source pages in the same pass, and id-to-item pairings in multi-drop sets are reconstructed by number gap, recorded as such in the trail.

Wave 1 closeout (2026-09-24): 69 of the 71 restorable questions are back in the graded pool, source-verbatim under frozen ids, with fresh key-defending explanations; passage-blank n5 grammar sets 11/21/23/25 and A/B comparison n1 reading sets 35/46 carry their restored passages. Two ids are unrepairable by construction, not by omission: jlpt:n5:kanji:1:oqb3tgq0 and jlpt:n5:kanji:2:1vvgw111 were scraper mis-parses of each set's intro sentence (ふうとうに… / この山には…); the real items already live in the pool as tgdeqa1l and 1jq800wo, so restoring them would duplicate live content. They remain in dropped[] with that reason recorded in the trail. The 7 notice-table rows stay quarantined as non-questions. Pool after wave 1: 5,330 questions.

Explanation language convention (settled 2026-09-24): the reading pools carry Japanese explanations, restored verbatim-style from the licensed source during data-recon, and that is the accepted convention for that slice. All other slices use English explanations. Ten Japanese or truncated explanations that had landed in English-convention slices (n2 grammar 21, n2 kanji 2/7, n2 vocabulary 18, n1 vocabulary 9) were rewritten in English, each defending its stored key; the trail records them as lang-normalize rows.

Progress rows when a set's question count changes: stored jlptProgress rows are kept as-is. The stored total is historical (best score over the set as attempted), never silently rewritten or deleted when a set gains or loses questions.

## N3–N1 curation pass (executed 2026-09-21)

The frozen worklist `curation/queue-n3-n1.json` (560 items) is fully adjudicated — 0 open; verdicts recorded per id in `curation/adjudications.json`. Dispositions:

| Defect class                | Count | Disposition                                                                                                                                       |
| --------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| vocab.untransliterable      | 93    | exclude — annotation-bearing / non-word kana artifacts; already absent from the tracked pool (verified: no twin for 68, clean twin exists for 26) |
| vocab.kanjiInKana           | 1     | exclude                                                                                                                                           |
| grammar.uninstantiatedTilde | 203   | exclude from graded pool — ～ in quiz answers/choices; lessons stay browsable, never scored                                                       |
| grammar.genericStem         | 242   | exclude from graded pool — non-discriminating stems                                                                                               |
| grammar.malformedAnswer     | 2     | exclude from graded pool — machine distractors unreliable                                                                                         |
| grammar.duplicateExample    | 16    | replace — exact duplicate example sentence removed; lesson graded                                                                                 |
| grammar.instructionExample  | 3     | 2 replace (instruction sentence removed, graded), 1 fix (false positive on inspection, graded)                                                    |

Graded grammar floors extended in the same change (`scripts/audit-clean.mjs`): n3 67, n2 71, n1 45 — every graded lesson passes answer-in-choices, ≥2 choices, and zero ～ in examples/quiz. Kanji floors: n3 367, n2 367, n1 1232 (all marker-free). Vocab floors: n3 2097, n2 1682, n1 2655 (all Latin romaji). All five levels are now enabled in `ENABLED_LEVELS`.

## PRD §18 owner edit list (prepared 2026-09-20, Phase 2 close)

PRD.md is owner-authored; these are the deltas Phase 2 produced, prepared as edits for the owner. Historical snapshot as prepared 2026-09-20 — the pipeline it references (`build-clean`) was retired 2026-09-21 after its outputs were frozen into the tracked pool:

1. §18 inventory, JLPT row: `answer_index` is 1-based **in raw**; clean output normalizes it to 0-based and asserts `answer_text === options[answer_index]` (scripts/audit-clean.mjs).
2. §18 grammar: "Lesson IDs restart at 1 per level and need namespacing" — done in clean output (`grammar:<level>:<lessonId>`).
3. §18 integration gaps: `data/generated/index.ts` deleted (pipeline cleanup); the content pipeline existed (`npm run build:clean`) and was retired at the 2026-09-21 cutover with its outputs frozen into the tracked pool (docs/decisions.md); the attribution document exists (docs/attribution.md) with rights still pending.
4. §18 audio aliasing: measured evidence table and owner listening sample now exist (`data/clean/audio-evidence.json`, 2 sets per level); listening stays blocked pending owner confirmation, per docs/decisions.md.
5. §18 practice_core: all 775 records carry canonical content-hash IDs in the tracked pool (superseding raw positional resolution); the deriver was retired with the pipeline at the cutover, and `audit-clean` now guards referential integrity.
6. Definitional deltas (unchanged, already recorded above): vocab romaji 7,293 vs 7,295 and 6,812 vs 6,814; kanji markers 1,130 vs 1,157; remote-image passages 108 vs 103. Counts are raw-data facts and are untouched by Phase 2.
