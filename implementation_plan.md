# NihonCode Implementation Plan

Phased build order: **MVP first, then data remediation, then polish.** Each phase is independently shippable and gated on the one before it. Nothing in a later phase starts until the prior phase's "Definition of done" passes.

This plan reflects the actual state of `data/` as audited, not an assumed clean dataset. The audit numbers below are measured from the JSON files in this repo; they are structural counts, not a certification that every Japanese reading or answer key is pedagogically correct.

## Guiding rules

- **Data reality drives sequencing.** The app must never surface a broken item to a learner. Where data is dirty, the feature waits for Phase 2, or loads only entries that pass a validation gate.
- **One study loop, end to end, before breadth.** Phase 1 proves select → drill → grade → persist → review on a clean slice. Phases 2 and 3 expand content and features on that proven skeleton.
- **Validate at the boundary.** Raw `data/` is untrusted input. A loader parses and normalizes it into typed domain models; UI and grading only ever see validated models. No component patches dataset defects inline.
- **No silent auto-approval of pedagogy.** Scripts can normalize structure and flag suspicious content. A human decides whether a reading, translation, or answer key is actually correct. Flagged items stay out of graded pools until reviewed.
- **Stable identities.** Every persistable item (card, lesson, question) gets a namespaced stable ID at the data layer, so progress survives content reordering and dataset edits.

## Current data state (measured)

Verified by parsing all 43 JSON files and checking referenced audio on disk.

| Asset | Count | Status |
|---|---:|---|
| Kana | 46 hiragana + 46 katakana | Basic gojuon only; no voiced/contracted/small kana |
| Kanji entries | 2,212 | N5 clean (80, no markers); N4–N1 carry dictionary markers |
| Vocabulary entries | 7,938 | `romaji` field is unreliable (see below) |
| Grammar lessons | 832 | All 2,496 quiz answers are members of their choices |
| JLPT exercise sets | 688 | Structural defects + remote media (see below) |
| JLPT question records | 5,339 | `answer_index` is 1-based |
| Local listening MP3s | 184 | All exist, non-empty, valid MP3 header |
| practice_core.json | 775 records | Clean reverse index; all question IDs resolve |

### Vocabulary `romaji` field — three separate problems

Do not conflate these. They have different fixes.

1. **Mislabeled field (Problem A).** 7,293 of 7,938 entries store Japanese text in `romaji` instead of Latin. In 6,812 of those, `romaji` is an exact copy of `kana`. This is all of N4–N1 and part of N5. Only 643 entries (all N5) hold genuine Latin romaji.
2. **Semantic reading mismatch (Problem B).** Some entries pair a `kana` and a Latin `romaji` that are both valid readings of different senses, e.g. N5 `一日` with `romaji: ichinichi` but `kana: ついたち`. **This was not quantified.** Detecting it needs a kana→romaji normalizer plus human review; a character-class check cannot catch it.
3. **Packed alternatives (Problem C).** A few entries encode multiple readings in one string, e.g. `romaji: "maitoshi / mainen"`, `romaji: "yoi/ii"`, `kana: "いい; よい"`. 2 in Latin `romaji`, 6 with separators in `kana`. These need an explicit variants list before exact-match grading or TTS.

Also: 2 N4 entries have empty `kana` and `romaji` (`かまう`, `ごらんになる`); 8 entries put kanji in the `kana` field (7 in N4, 1 in N1).

### Kanji answers — dictionary markers (Problem D)

Accepted-answer lists for N4–N1 retain dictionary notation: 1,130 entries / 2,455 answer strings contain markers like `た.りる`, `-こ.む`, `-ネン`. N5 is clean (0). A literal matcher would demand dictionary punctuation or reject normal spellings. Display readings and accepted learner answers need separate normalization.

### Grammar — content curation needed

Structurally valid (every answer is in its choices), but confirmed content defects exist and are not exhaustive:
- Malformed generated answers marked correct: N3 `としなら`, N1 `にかかっなら`.
- Generic non-discriminating fill-in-the-blank stems ("make a sentence using ___") that give no basis to pick one answer, recurring in N3/N2/N1.
- Duplicate examples within a lesson, and instruction text used as an example (N3 lesson id 8).
- Uninstantiated pattern notation used as an answer (N4 `あまり～ない` with the `～` intact).
- N5 grammar metadata is marked `reviewed: true`; N4–N1 are not.

### JLPT — structural defects and remote media

- **Remote images, no local copies:** 927 question records across 182 sets, plus 108 passages, reference `japanesetest4you.com` image URLs. None are packaged locally.
- **Truncated prompts:** 33 records have prompt `「` with the question fragment pushed into the choices (N1 reading 12, N3 reading 9, N2 reading 6, plus vocabulary). Internal answer contradictions confirmed.
- **Missing keys:** 5 records (all N3 reading) have null `answer_index`; these are scraped reference rows, not questions. Two more reference rows carry keys but aren't questions.
- **Empty-text passages:** 4 (all N2 reading, `passage-3`) depend entirely on a remote image to be answerable.
- **Boilerplate passages:** 2 (N3 reading sets 15, 16) read "Click here to download this test for offline viewing."
- **Wrong field:** 5 MP3 URLs stored in reading `image_urls` (N3 reading sets 15, 16).
- **Audio aliasing:** 930 distinct source URLs map onto 184 local MP3 paths; every local path is referenced by more than one source URL. Listening sets carry 4–7 audio refs each (avg 5.08) for ~5 questions. It is **unverified** whether each local file is a single segment, a concatenation, or correctly matched to its questions. This must be resolved before listening playback ships.

### Integration gaps

- `data/generated/index.ts` imports types from `../../types/content`, which does not exist in this repo. The loader is from the prior app; its type contract must be recreated or replaced.
- No content pipeline exists in the repo despite the PRD referencing one. Phase 2 builds it.
- No attribution/license document consolidates the per-file source metadata (amgidex grammar lists, Tatoeba CC BY 2.0 FR examples, japanesetest4you exercises/audio). Redistribution rights must be confirmed before public release.

## Architecture (applies to all phases)

Single-page React app, one repo, no backend.

```
src/
  app/         routing, layout, bottom command bar
  features/    drills/ grammar/ review/ progress/ settings/ jlpt/
  domain/      grading, scheduling (FSRS), XP/streak rules — pure, no React
  content/     schemas, validation gate, normalizers, loaders → typed models
  storage/     persistence, schema migrations, export/import
  components/  shared UI
data/
  generated/   source content (untrusted input)
  jlpt/        source exercises + audio (untrusted input)
  clean/       Phase 2 output: normalized, validated, ID-stamped app datasets
```

Boundaries:
- Components render and handle interaction only. Grading, scheduling, and progress rules live in `domain/` and are unit-testable without React.
- `content/` owns the untrusted→typed boundary. Raw JSON never reaches a component.
- Source content (`data/generated`, `data/jlpt`) is separate from learner data (storage). Content IDs are stable and namespaced (`level:section:set:question`, `grammar:n5:12`), never array positions.
- Session state (current drill queue, answers) is React state. Only durable progress, cards, and preferences are persisted.
- Datasets and audio load lazily per level/route, not all at app start.

Stack (unchanged from PRD review): React + TypeScript (strict), Vite, React Router, CSS Modules + CSS variables for theming, `ts-fsrs` for scheduling, Zod for dataset/import validation, Vitest for domain rules, Playwright for key browser flows. Persistence decision (localStorage vs IndexedDB/Dexie) is recorded in the PRD; SRS cards + review logs are the volume case to size against.

---

## Phase 1 — MVP

**Goal.** A learner can open the app in a browser, pick clean content, run a drill, get graded, save progress, and come back to due SRS reviews. Proves the full loop and the data-validation gate on content that is already trustworthy. Ships without waiting on the dirty data.

### In scope

- App shell: dashboard, bottom command bar (HOME / PROGRESS / LEARN / CONFIG), routing, browser back navigation. No level selector in Phase 1 (moved to Phase 3 with N4–N1 enablement, per DEVELOPMENT_PROMPT.md task 12).
- Theme: light/dark (dark-first) + accent, persisted.
- **Content validation gate** in `content/`: parses raw JSON, rejects/flags malformed entries, emits typed models with stable IDs. This is the backbone the later phases reuse.
- Drills over the **clean slice only**:
  - Kana (46 hiragana + 46 katakana basic table).
  - Kanji N5 (80 entries, no dictionary markers).
  - Vocabulary N5 restricted to entries with genuine Latin `romaji` (643 Latin entries, 641 graded after the gate excludes 2 packed-alternative entries), behind the gate. Reading-correctness review for these is deferred to Phase 2; MVP proves the drill mechanics.
  - Numbers and Dates drills (algorithmic, zero dataset dependency).
- Core drill engine: one item at a time, typed input, correct/wrong, reveal answer + meaning, progress bar, completion summary with score, retry with reshuffle, XP on completion.
- Grammar N5 lessons + quiz flow (72 lessons, marked reviewed).
- SRS (FSRS) over the clean kanji N5 + gated vocab N5 slice: due-before-new, configurable daily new-card cap, correct→Good / incorrect→Again, persists compact card state. Review sessions do not resume; an aborted session discards its scheduling.
- Progress: XP, level, streak, today's XP, simple weekly activity.
- Progress telemetry (moved into Phase 1 per DEVELOPMENT_PROMPT.md task 13): kanji mastery map with docked inspector deriving from stored drill attempts, an achievements row, and a coverage-of-studied-material estimate.
- Storage: persist progress, cards, preferences; survive page reload; schema version stamped.
- Audio: Web Speech API pronunciation with Japanese-voice detection and a visible "unavailable" fallback that keeps text drills usable.
- About page with accurate local-first + persistence-limitation copy.

### Out of scope (deferred, with reason)

- JLPT practice — data has remote images, truncated prompts, unresolved audio aliasing (Phase 2/3).
- Conjugation drill — vocabulary lacks per-entry verb/adjective class metadata (Phase 2).
- Kanji/vocab/grammar N4–N1 — mislabeled `romaji`, dictionary markers, unreviewed grammar (Phase 2).
- Full kana (voiced/contracted/small) — not in source data (Phase 2 content decision).
- Listening audio playback, remote images — unresolved (Phase 2/3).
- SRS statistics page and achievement toasts — Phase 3 polish. (Kanji mastery map, achievements row, and coverage estimate moved into Phase 1 above; toasts, the SRS statistics page, and practice_core.json wiring stay here.)

### Definition of done

- Open the built app in a desktop and a mobile-browser viewport with no install and no account.
- Run a kana drill, a kanji N5 drill, a numbers drill, and an N5 grammar lesson end to end; each grades, reveals the answer, and awards XP.
- Complete an SRS review; reload the page; the reviewed card's next-due state persists and the card does not reappear as new.
- The validation gate demonstrably excludes a known-bad entry (e.g. an N5 vocab item whose `romaji` holds Japanese) from the drill pool — show it flagged, not crashed on.
- TTS failure path: with speech synthesis unavailable, text drills still complete.
- Domain rules (grading, XP, FSRS rating map) covered by unit tests; the drill→persist→review loop covered by one Playwright flow.

---

## Phase 2 — Data remediation

**Goal.** Normalize and curate all content so the full N5–N1 dataset and JLPT practice can be consumed safely. Builds the content pipeline the PRD assumes. Output is a validated `data/clean/` plus a human-review queue. This phase gates Phase 3.

### 2.1 Build the content pipeline

- Normalizers + validators in `content/` (or a build step) that read raw `data/`, apply fixes, stamp stable IDs, and emit `data/clean/`.
- Every transform is idempotent and re-runnable. Keep raw source untouched; never hand-edit generated output.
- Emit a machine-readable report: per-fix counts, and a flagged queue of items needing human review.

### 2.2 Vocabulary

- **Problem A (mislabeled `romaji`, 7,293 entries):** decide policy — regenerate Latin romaji from `kana` via a transliterator, or rename the field and stop presenting it as romaji. Apply consistently.
- **Problem B (semantic mismatch):** build a kana→romaji normalizer, run it over the 643 Latin-romaji entries (and any regenerated ones), flag disagreements (e.g. `ichinichi` vs `tsuitachi`) for human review. Do not auto-"fix" sense.
- **Problem C (packed alternatives):** split into a structured `variants`/`readings` array; grading and TTS consume the array, not a delimited string.
- Fix the 2 empty-reading N4 entries and the 8 kanji-in-`kana` entries.
- Add per-entry part-of-speech + conjugation class metadata (godan/ichidan/irregular; i-/na-adjective) with exceptions. This unblocks the conjugation drill. Do not infer class from the unreliable category buckets (`お手洗い` sits under Adjectives, `しばらく` under Verbs).

### 2.3 Kanji

- **Problem D (1,130 entries / 2,455 answer strings, N4–N1):** separate display reading from accepted learner answers; strip dictionary markers (`.`/`-`/okurigana dots) into a normalized answer set while keeping the raw reading for display. Match N5's clean policy.

### 2.4 Grammar

- Human-review queue for: malformed answers (`としなら`, `にかかっなら`), generic non-discriminating stems, duplicate examples, instruction-as-example, uninstantiated `～` notation.
- Decide per-defect: fix, replace, or exclude from graded pools. Excluded lessons stay browsable as reference if useful, but never enter a scored quiz.
- Namespace lesson IDs across levels (they restart at `1` per level today).

### 2.5 JLPT

- Localize or drop the 927 question + 108 passage remote images; if dropped, remove the dependent questions/sets from the graded pool.
- Repair the 33 truncated `「` prompts and their malformed options/answers, or exclude those records.
- Remove the 5 null-answer reference rows and the 2 keyed non-question rows (N3 reading); confirm `number` is not used as a unique key.
- Fix or exclude the 4 empty-text N2 reading passages and the 2 N3 boilerplate passages.
- Move the 5 MP3 URLs out of `image_urls`.
- **Audio aliasing (the hard one):** determine what each of the 184 local MP3s actually contains (single segment vs concatenation), map questions to the correct audio span, and verify correspondence. If files are concatenated, split them or store per-question time offsets. Listening does not ship until a sample of sets is confirmed to play the right audio for the right question.
- Normalize `answer_index` to a documented base and validate `answer_text` agrees with `options[index]`.

### 2.6 Kana (content decision)

- Decide whether to extend beyond the 46+46 basic table (voiced/semi-voiced, contracted, small kana). If yes, source and validate the additions; if no, update the PRD count to match reality.

### 2.7 Attribution and licensing

- Consolidate per-file source metadata into one attribution document (grammar list source, Tatoeba CC BY 2.0 FR examples, japanesetest4you exercises/audio).
- Confirm redistribution rights for scraped exercises and audio before any public release. Block release if unresolved.

### 2.8 practice_core.json

- Already validated clean (775 records, all IDs resolve, 130 IDs legitimately shared across compound items). Keep as the reverse index for "which questions touch this kanji/vocab". Wire it into kanji/vocab mastery in Phase 3. It is not Mastery Path data; do not delete it on that assumption.

### Definition of done

- `data/clean/` builds reproducibly from raw `data/` with zero validation errors on the included pool.
- Report shows: 0 entries with Japanese in a `romaji` field, 0 kanji answers with dictionary markers in the accepted set, 0 JLPT records with truncated prompts or null keys in the graded pool, 0 unresolved remote-image dependencies in included sets.
- Human-review queue is triaged: every flagged item is fixed, replaced, or explicitly excluded (not silently shipped).
- Conjugation metadata present and spot-checked for all verb/adjective entries that the conjugation drill will use.
- A sampled set of listening exercises is confirmed to play the correct audio for the correct question.
- Attribution doc exists; licensing either cleared or release explicitly blocked with the reason recorded.
- PRD content counts and readiness notes updated to match `data/clean/`.

---

## Phase 3 — Polish and full scope

**Goal.** Ship the complete PRD scope on clean data, with the UX, accessibility, and performance pass. Starts only after Phase 2's clean dataset and review queue are done.

### In scope

- Enable N4–N1 kanji, vocabulary, grammar from `data/clean/`, and the level selector that Phase 1 deferred (nothing writes `prefs.level`; the gate refuses non-n5).
- Conjugation drill (now backed by real metadata).
- Practice-setup pool matrix on every drill setup screen (eligible-item count + browsable list from the loaded pools; owner addition 2026-09-21). The conjugation preview reuses it.
- Full kana table if Phase 2.6 added it.
- JLPT practice: all five categories, level + category + numbered set selection, graded runs over keyed questions only, per-set progress, listening playback on verified audio, reading passages with localized images.
- SRS statistics page (streak, due today, learned/total, mastery %, kanji vs vocab breakdown).
- Wire the shipped kanji mastery map to `practice_core.json`. The map itself ships in Phase 1 deriving from drill attempts only.
- Achievement unlock toasts. The achievements row ships in Phase 1.
- Settings: SRS new-card cap, skip-learning-steps, theme, accent.
- JLPT mastery recalculation from SRS + grammar completion, relabeled "coverage of studied material", not exam competence. Phase 1 ships the clean-slice coverage estimate; this extends it across levels.
- Export/import of local progress (recommended given no cloud backup; pull forward from "future" if capacity allows).
- Responsive desktop + mobile pass, accessibility (labels, text-paired indicators, audio-optional), performance (route/dataset/audio lazy-load, code-splitting, no layout shift on rapid drill submission).
- About page: accurate local-first stance, persistence limits, and content attribution.

### Definition of done

- Every PRD feature in scope works end to end on `data/clean/` in desktop and mobile viewports.
- JLPT listening plays correct audio; reading renders without broken remote images.
- Conjugation drill grades godan/ichidan/irregular and i-/na-adjective forms correctly on sampled entries.
- Progress, cards, preferences, and JLPT set state survive reload; export/import round-trips without loss.
- Lighthouse/accessibility spot-check passes on the main routes; initial load fetches only the active level's data.
- Attribution visible in About; licensing cleared per Phase 2.7.

## Cross-phase verification

### Owner addition — study activity visualization (2026-09-22)

The HTML mockup replaces Home/Progress weekly bars with contribution calendars and adds a four-axis activity mix to Progress. This is an additional requirement after Phase 3, not a claim that production already ships it. PRD §10.13 owns the counting, calendar, category, accessibility, and empty-state contracts.

Remaining production work: inspect existing completion records for drills/SRS/grammar/JLPT; preserve history while adding any missing stable session ID/local-date/category fields; aggregate completed sessions exactly once; render the compact 91-day Home calendar, year-selectable Progress calendar, and Drills/SRS Review/JLPT/Grammar polygon from the same scoped totals. Do not infer missing legacy categories from XP.

Acceptance: actual persisted completions update both views; reload/export/import preserve them; aborts and duplicate writes do not inflate counts; retries count as separate completed runs; year boundaries, leap day, local dates, empty history, inaccessible legacy data, keyboard/touch inspection, and mobile panel scrolling are verified. Sample mockup checks do not close this production gate.

Run once at the integrated head, not per-agent mid-flight:
- Type-check + lint + full Vitest suite.
- Playwright: drill→grade→persist→reload→review loop (Phase 1), plus a JLPT listening and a conjugation flow (Phase 3).
- Build the production bundle; smoke-test it served statically.
- Re-run the data audit script against `data/clean/` and diff the defect counts to zero for the included pool.

## Handoff notes for the implementer

- Treat `data/generated` and `data/jlpt` as untrusted. All access goes through the `content/` validation gate.
- Phase 1 must not import N4–N1 content or any JLPT set, even if present, until Phase 2 clears them.
- `data/generated/index.ts`'s missing `../../types/content` import is resolved by quarantine, not by editing the file: the legacy loader sits outside the tsconfig and is reference-only, `src/content/gate.ts` owns the type contract, and deletion belongs to the Phase 2 pipeline (docs/quality.md debts). DEVELOPMENT_PROMPT.md section 2 forbids hand-editing the file.
- Do not auto-approve pedagogical correctness. Normalize structure in code; route sense/answer-key decisions to the human-review queue.
- Keep stable IDs namespaced and content-order-independent from day one; retrofitting them after progress exists is a migration headache.
