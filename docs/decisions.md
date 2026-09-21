# Decision Log

Append-only. Newest first. One entry per decision: what, why, where it binds.

## 2026-09-21 — Practice-setup pool matrix scoped to Phase 3 (owner addition)

**Decision.** Owner request from trial use: every drill's setup screen should show the matrix of eligible items in its pool. Recorded as Phase 3 scope, not shipped now: PRD §10.6 gains the requirement (count + browsable eligible list before start; conjugation preview reuses it), PRD §17 inventory and implementation_plan.md section 3 in-scope list match, and DEVELOPMENT_PROMPT.md Phase 3 task 2 carries the acceptance (matrix counts equal the builder's pool sizes).

**Why.** PRD §10.9 already mandates an eligible-word preview for conjugation; generalizing it to all drills is the same read-only view over pools the builders already slice, so it costs one shared component in Phase 3 rather than a per-drill retrofit later. It is an owner addition beyond the PRD's original scope, hence recorded here and in the plan rather than treated as existing requirement.

**Binds.** PRD.md §10.6/§17, implementation_plan.md section 3, DEVELOPMENT_PROMPT.md Phase 3 task 2.

## 2026-09-21 — Single source of truth: data/clean committed, raw scrape and build pipeline retired

**Decision.** By owner directive ("jaga cukup 1 source of truth; kalau gak dipake aplikasi ya hapus, ubah pipeline-nya"), the repository now holds exactly one dataset: `data/clean/` — committed, including the 184 listening MP3s under `data/clean/audio/` — read only by `src/content/loaders.ts`. The raw scrape (`data/generated/`, `data/jlpt/`, ~54 MB) and the entire Phase 2 build pipeline are deleted: `scripts/build-clean.mjs`, `scripts/audit-data.mjs`, `scripts/data-baseline.json`, `scripts/merge-findings.mjs` + `scripts/lib/{romaji,packed,markers,grammar-defects,mp3,ids,overrides,passage-emit,findings-merge}.*` (no live consumers remain; `scripts/lib/scrub.mjs` stays as audit-clean's artifact detector). `curation/review-queue.json` is replaced by the frozen worklist `curation/queue-n3-n1.json` (560 open N3–N1 items for the future curation pass). package.json drops prepare/predev/prebuild/build:clean/audit:data/merge:findings; the check chain is typecheck+lint+format+arch+taste+docs+audit-clean self-test+audit-clean; audit-clean gains a missing-audio-file assertion; gc loses the retired targets; the manifest is pruned to existing artifacts.

**Why.** Two datasets (raw + clean) forced every reader to consult docs to know which is true, and invited wrong-file edits. With curation complete, the raw scrape's remaining jobs (build input, drift baseline, id provenance, ledger measurements) were all historical: the clean pool is now the tracked artifact, guarded by audit-clean (zero defects, unique IDs, MP3 presence) and check-arch (clean imports content-only). Reproducibility of the curation itself lives in `curation/adjudications.json` (2,298 verdicts with reasons) plus this ledger; a future dataset update is a tracked edit + audit, not a pipeline run.

**Binds.** data/clean/ (tracked), data/clean/audio/, curation/queue-n3-n1.json, scripts/audit-clean.mjs (+floors, practice_core integrity, MP3 assertion, four self-test fixtures), scripts/check-arch.mjs, scripts/gc.mjs, package.json, .gitignore (clean no longer ignored), .harness/manifest.json (pruned), README.md data stance, AGENTS.md data gate, docs/development.md, docs/index.md, docs/quality.md, docs/data-quality.md policy. Cost accepted: raw-data history is no longer re-measurable in-repo; the ledger rows here are its frozen record.

## 2026-09-21 — Phase 3 loader swap: data/clean is the app's single source of truth

**Decision.** The owner lifted the Phase 2→3 gate for this one change: `src/content/loaders.ts` now statically imports the four N5 files from `data/clean/` instead of `data/generated/`, `src/content/gate.ts` validates the clean shape (stamped namespaced ids must match content fields; grammar enters the pool only via its `graded` flag, ids via their namespace — the build's `meta.reviewed`/raw-id recomputation is gone from the app side), `check-arch` forbids raw `data/generated`/`data/jlpt` imports from every src file (previously content/-only), and DB_VERSION moved 3→4 with the staged re-key migration armed in the same change. Graded pools the app now serves: vocab 738 (was 641 pre-curation), kanji 80, grammar 72, kana 92. e2e journey and gate tests read `data/clean/` fixtures.

**Why.** "One source of truth": while loaders read raw `data/generated/`, every curation correction (740 replacements, 54 excludes) was invisible to users — the app served the known-defective pool. The clean pool is deterministic output of frozen raw + tracked adjudications, audited zero-defect, so consuming it directly removes the dual-read without adding a second maintained dataset. Arming the v4 migration in the same change satisfies DEVELOPMENT_PROMPT section 2's same-change rule and avoids the split-brain window the sequencing decision warned about.

**Binds.** src/content/loaders.ts, src/content/gate.ts (+tests), src/storage/db.ts, src/storage/vocab-migration.ts (+tests), scripts/check-arch.mjs (raw forbidden everywhere; `data/clean` content-only), scripts/check-rekeys.mjs (24-pair non-vacuity guard), e2e/journey.spec.ts, package.json (`prepare`/`predev`/`prebuild` run `build:clean` so the gitignored pool always exists), AGENTS.md data gate, docs/architecture.md rule 1, docs/quality.md ledger. N4–N1/JLPT enablement, level selector, and the remaining Phase 3 scope stay gated.

## 2026-09-20 — Manual curation executed: N5 + N4 fully adjudicated

**Decision.** Every N5 and N4 slice was fully manually reviewed (raw counts: vocab 744 + 666, kanji 80 + 166, grammar 72 + 130 lessons, kana 92, plus the surviving JLPT N5/N4 pools); 2,298 verdicts are recorded in `curation/adjudications.json` (1,504 fix = verified correct, 740 replace = corrected, 54 exclude, each with a reason string). Recording conventions differ by pool, by design: vocab and kanji carry a per-entry verdict on every raw entry, including clean-as-fix (vocab: 1,006 fix + 381 replace + 23 exclude = 1,410 raw entries, 1,387 of which remain clean; kanji: 246 fix = 246 clean entries), so their audit trail is complete entry by entry. Grammar and kana record defects only (grammar: 110 of 202 lessons carry a record; kana: zero records) and JLPT is mixed (240 fix + 260 replace + 31 exclude over surviving questions); for those pools a row reviewed clean carries no adjudication record, and their pool-level clean claims are durable only in this ledger and the pool table in docs/data-quality.md. The per-slice findings scratch under `curation/findings/` is gitignored and is not an audit trail. Defect classes corrected include wrong answer keys, corrupted scrape prompts, double-correct quiz distractors, uninstantiated ～ placeholders, field-swapped kanji/kana, kana-in-romaji entries, kana typos (ちーさい→ちいさい, まっすぐぐ→まっすぐ), romaji/meaning mismatches resolved by the meaning field, and Japanese prompt typos. N4 grammar is promoted to graded via grammar.reviewed:n4 (130/130 graded, zero residual defects); audit-clean now validates 202 graded lessons. Graded pools after curation: vocab N5 738 / N4 649, kanji N5 80 / N4 166, JLPT N5 663 / N4 830 questions.

**Why.** The owner directed manual curation of all N5/N4 content for grammar, translation, typo, and completeness correctness. Every defect verdict is tracked in curation/adjudications.json with a reason string, so the correction trail is reviewable entry by entry; entries needing no correction needed nothing beyond their fix verdict (vocab/kanji) or the pool-level ledger entry (grammar/JLPT/kana).

**Binds.** curation/adjudications.json, data/clean/ (regenerated), docs/data-quality.md curation ledger (pool table + open owner items). Open items the owner must resolve are listed there, not silently decided.

## 2026-09-20 — Scraper-artifact scrub: control bytes and U+FF0D

**Decision.** Two systemic scraper artifacts are corrected mechanically at build time: stray C1/other control bytes are stripped and fullwidth HYPHEN-MINUS (U+FF0D) is mapped to the katakana prolonged sound mark (U+30FC), via scripts/lib/scrub.mjs applied to JLPT prompt/options/answer_text and passage text/title at emit time. audit-clean fails if any artifact survives. Measured at the post-merge rebuild: 446 question fields and 15 passage texts scrubbed across N5/N4; zero remain.

**Why.** Both classes are deterministic character errors, not judgment — the same precedent as DEVELOPMENT_PROMPT task 2 (regenerate mislabeled romaji). Expressing them as ~500 per-item findings would bloat the adjudication record with identical mechanical edits; a build transform with an audit assertion is reproducible and checkable. Scrubbing runs after ID stamping so content-hash ids stay keyed to the frozen raw scrape.

**Binds.** scripts/lib/scrub.mjs (+tests), scripts/lib/passage-emit.mjs (+tests: title U+FF0D and text control-byte fixtures prove the counter fires), scripts/build-clean.mjs, scripts/audit-clean.mjs (--self-test injects a title artifact and asserts rejection), data/clean-report.json (jlpt.scrubbed / jlpt.passageScrubbed counts).

## 2026-09-20 — JLPT reading questions orphaned from dropped passages (owner decision pending)

**Decision.** Measured, not resolved: all 66 N5 and 129 N4 reading questions reference passages, and zero passages survived the clean build — every raw reading passage carries a remote GIF and was dropped by the task-5 remote-image policy. The questions themselves are local text, but each is answerable only from its dropped passage. Reading stays in the clean pool as-is (keys verified where possible), pending the owner's call: (a) keep the questions and restore the passage TEXT via a task-5 policy refinement (the GIF is decorative in the sampled sets — the text is the real passage — but this touches the drop policy and redistribution posture), or (b) exclude the reading questions like the listening pool. Grammar passage-blank questions without local passage text were excluded (21 N5) as unanswerable; that class is settled.

**Why.** Task 5 dropped image-dependent items on a no-network, offline-reproducibility basis; whether text-bearing passages with decorative GIFs were over-dropped is a product call, and silently removing two whole reading categories from the pool without it is not.

**Binds.** curation/adjudications.json (21 passage-blank excludes recorded), docs/quality.md gap ledger, owner decision.

## 2026-09-20 — Manual N5/N4 curation: override lever + findings workflow

**Decision.** Adjudications now carry corrected values: a `replace` disposition with a `replacement` object rewrites fields inside `build-clean` across all five pools (kana, kanji, vocab, grammar lessons, JLPT questions and passages); `exclude` drops any item by exact id, flagged or not; `fix` keeps it. `scripts/merge-findings.mjs` folds agent findings (`curation/findings/*.json`, ignored scratch — provenance only; `adjudications.json` is the tracked record) into `curation/adjudications.json`, enforcing schema, membership, disjoint-field composition, and idempotent re-merges: an id already carrying an adjudication bypasses pool membership and is compared key-order-insensitively, so re-running consumed findings is a no-op, while findings on policy-excluded ids with no adjudication are still rejected (no-resurrection intact). The guarantees are fixture-tested in `scripts/lib/findings-merge.test.mjs` (re-run no-op after a pool re-key, consumed-id bypass, no-resurrection, byte-stable composition). Findings are keyed to pre-override ids. The 99-conflict wall observed at merge close-out (every grammar id whose replacement carried nested content conflicted; the flat fix entries did not) was resolved by treating the on-disk findings as authoritative and syncing 110 grammar adjudications from them. Its root cause is argued, not diffed: `curation/adjudications.json` was never committed, so merge #1's inputs are unrecoverable — ids that were never hand-written conflicted, and the comparator is proven order-insensitive by the byte-stable fixture, leaving post-merge drift in the findings' replacement content as the only consistent explanation.

**Why.** DEVELOPMENT_PROMPT section 4 specifies fix-with-corrected-value, but the shipped pipeline read only `disposition`, so manual corrections landed in a field the build dropped. Without the lever, the entire manual curation pass would have been inert.

**Binds.** scripts/build-clean.mjs, scripts/lib/overrides.mjs (+tests), scripts/merge-findings.mjs, scripts/lib/findings-merge.mjs (+tests), scripts/lib/passage-emit.mjs (+tests), package.json (`merge:findings`, `check:rekeys`), .harness/manifest.json, curation/adjudications.json.

## 2026-09-20 — Kana→romaji table gained ぢ/づ

**Decision.** Added ぢ → ji and づ → zu to the GOJUON table in scripts/lib/romaji.mjs.

**Why.** The omissions returned null for つづく/つづける/かたづける and the like, queueing genuine vocabulary as `vocab.untransliterable` — a pipeline defect masquerading as content defects. Modern kana-usage spelling normalizes both to じ/ず, but the dataset stores づ readings that must transliterate.

**Binds.** scripts/lib/romaji.mjs, scripts/lib/romaji.test.mjs. Measured effect at rebuild: queued items 1679 → 1640 (39 resolved); several づ/ぢ words that were excluded as untransliterable re-entered the pool.

## 2026-09-20 — N5 vocab re-key migration sequencing

**Decision.** Phase 2 curation re-keyed 24 graded N5 vocab ids whose stored kana was wrong for the meaning (一日|ついたち → いちにち, …; the map is `VOCAB_N5_REKEYS` in src/storage/vocab-migration.ts, asserted against the clean pool by scripts/check-rekeys.mjs). The Dexie version(4) upgrade that rewires srsCards/drillAttempts/reviewLogs shipped armed in the Phase 3 loader swap — the change where the app first consumes the new ids — as `this.version(4).upgrade(upgradeVocabN5Rekeys)`; the map lives in vocab-migration.ts with its upgrade so db.ts never imports its own dependent.

**Why.** Arming the remap while loaders still read raw ids would move users' cards to ids the app never queries — an immediate progress reset and a split-brain interim window (post-migration rows written under old ids are never revisited). DEVELOPMENT_PROMPT section 2's "same change" requirement is satisfied by the Phase 3 swap commit.

**Binds.** src/storage/db.ts, src/storage/vocab-migration.ts, src/storage/storage.test.ts, scripts/check-rekeys.mjs; landed in the Phase 3 loader-swap change below.

## 2026-09-20 — Phase 1 graded-pool superset upheld during curation

**Decision.** No exclude adjudication was accepted for an entry with raw Latin romaji (the Phase 1 graded pool): 10 agent-proposed N5 excludes (居る, 大きな, 小さな, 家庭, 時計, 野菜, 煩い, 立派, 詰まらない, 賑やか) were flipped to `fix` with the superset rationale recorded in the adjudication reason. Duplicate removal (kana-primary twins, misplaced nouns) is deferred to the owner.

**Why.** DEVELOPMENT_PROMPT task 9 requires clean N5 pools to be a superset of the Phase 1 graded pool, and vocab progress rows key on those ids; shrinking the pool would orphan shipped SRS/drill state.

**Binds.** curation/adjudications.json; docs/data-quality.md curation ledger.

## 2026-09-20 — N4 grammar promotion via grammar.reviewed:n4

**Decision.** Once N4 grammar curation findings merge and every lesson passes audit, the level gate flips through a `grammar.reviewed:n4` adjudication with disposition `fix` rather than a raw-data edit; raw data stays read-only and the reviewed state lives entirely in the curation layer.

**Why.** Raw `data/` is frozen by the baseline; `meta.reviewed` is a raw field. An adjudicable level gate is the only curation-layer mechanism that promotes a level without a baseline rewrite.

**Binds.** scripts/build-clean.mjs (levelAdj), curation/adjudications.json.

## 2026-09-20 — Listening blocked: audio aliasing needs owner sample confirmation (Phase 2 task 5)

**Decision.** JLPT listening stays un-shippable. All 184 local MP3s are concatenation-candidates (930 source URLs aliased onto 184 files; every file serves multiple questions, refs == question count). The pipeline now measures each file's duration with a pure-JS MPEG parser (validated within 0.07s of ffprobe) and emits `data/clean/audio-evidence.json`: the full evidence table plus an owner sample of 2 listening sets per level with equal-duration expected spans. Nothing plays until the owner listens to the sample and confirms the right audio reaches the right question.

**Why.** The spans are equal-duration estimates — the segment-vs-concatenation question is unverified, and guessing start/end offsets would ship wrong audio. The prompt's default policy (drop remote-image items, no network scraping) was applied; audio localization was never in scope.

**Binds.** scripts/lib/mp3.mjs, scripts/build-clean.mjs (buildAudioEvidence), data/clean/audio-evidence.json (generated), docs/quality.md gap ledger. The confirmation, once given, is recorded here and flips listening from blocked to confirmed.

## 2026-09-20 — Canonical JLPT IDs: content-hash scheme (Phase 2 task 8)

**Decision.** Clean-pool JLPT questions use `jlpt:<level>:<category>:<set-number>:<content-hash>`: the set number parses from the raw Exercise NN title (stable across reorders), and the hash binds prompt + options + answer. The raw positional shape and the `number` field both stay non-canonical. `data/clean/practice_core.json` re-derives all 775 reverse-index records to the clean scheme (976 refs, 0 unresolved); the raw file is untouched.

**Why.** Positional IDs rebind silently on reorder and the number field is duplicated/gapped (docs/data-quality.md); neither is safe as a progress key. JLPT items were never graded in Phase 1, so Phase 2 is the cheap moment to choose. Content-hash IDs survive reorders, and uniqueness is asserted by audit-clean (4372 IDs, 0 duplicates; identical hash across two rebuilds).

**Binds.** scripts/lib/ids.mjs (jlptQuestionId, stableHash), scripts/build-clean.mjs (buildJlpt, buildPracticeCore), scripts/audit-clean.mjs (uniqueness), docs/data-quality.md blocking finding.

## 2026-09-20 — Kana table frozen at the basic gojuon (Phase 2 task 6)

**Decision.** The kana dataset stays at 46 hiragana + 46 katakana basic gojuon; no voiced, semi-voiced, contracted, or small-kana extension in Phase 2. The default (freeze) applied: no owner direction arrived before the task boundary, so the decision records reality rather than inventing scope. PRD section 1 ("basic gojuon only") and section 10.3 already state this exactly; no owner edit is required.

**Why.** Voiced/contracted/small kana are absent from the source data; sourcing them would be new content authoring outside the remediation scope. The audit floor constants already express the freeze (kana >= 46+46).

**Binds.** docs/data-quality.md inventory row, scripts/audit-data.mjs floor constants. If the owner later directs an extension, it ships with new source data, the same gate rules, and a baseline rewrite.

## 2026-09-20 — Phase 2 pipeline scaffold and legacy loader deletion

**Decision.** The content pipeline lives in `scripts/build-clean.mjs` + `scripts/lib/*.mjs` (pure, Node stdlib only, Vitest-tested under `@vitest-environment node`), validated by `scripts/audit-clean.mjs` (separate from the raw audit; `--self-test` proves the duplicate-ID failure path). Output is generated and ignored (`data/clean/`, `data/clean-report.json`, `curation/review-queue.json`), with gc targets. `curation/adjudications.json` is the only tracked curation file; items resolve by exact ID or `policy:<defect>`, and the blocking/informational split keeps the N5 graded pool intact. `data/generated/index.ts` is deleted in the same change as `--write-baseline` (fileCounts.ts 1 → 0).

**Why.** audit-data's self-test pins the raw gate key set exactly, so clean-pool checks need their own script. Generated output cannot be committed without breaking the drift model. The legacy loader imported a nonexistent type module and was reference-only.

**Binds.** scripts/build-clean.mjs, scripts/audit-clean.mjs, scripts/lib/, curation/adjudications.json, package.json (build:clean, audit:clean, check chain), .gitignore, scripts/gc.mjs, scripts/data-baseline.json, docs/data-quality.md.

## 2026-09-20 — Over-engineering audit cuts: dead exports, speculative scaffolding, level plumbing

**Decision.** A repo-wide over-engineering audit (ponytail-audit) removed code with no consumer or no reachable Phase 1 path, in one wave: the `romajiToKana` converter (every `speakText` call site already passes Japanese text; PRD 10.15 makes conversion permissive, not required); `validateJlptSets` plus the JLPT schemas, `JlptQuestion`, `JlptCategory`, and `jlptQuestionId` (Phase 1 ships no JLPT content; only synthetic test fixtures consumed them — rebuilt in Phase 2 against real cleared files); the `drainLog`/`peekLog`/`getMinLevel` logger exports (test-only; e2e reads `window.__nihonLog` and the console directly); `Prefs.theme`/`Prefs.accent` (theme state lives in `theme.tsx` under its own keys) and `Prefs.level` (nothing wrote it; loaders now pin `CLEAN_SLICE_LEVEL`); the empty `MIGRATIONS` registry (re-add when migration #1 exists); `attemptsForKind`, `currentPrefs`, `makeNumberQuestion`, `numberToRomaji` (no callers); the unreachable `AppRating` members `"hard"`/`"easy"` (MVP contract is again/good only, per `ratingFromCorrect`); and doctor's `ci-yaml` probe with its `js-yaml` devDependency (GitHub Actions fails on unparseable workflow YAML itself). `usePools`/`primePools` became synchronous `getPools()` because the loaders are sync static-JSON imports; the listener Set and null-branch guards disappeared with it. `APP_VERSION` is one constant (`src/content/sources.ts`). A Dexie `version(3)` migration drops the `reviewLogs` `cardId, ts` indexes — that table is a write-only audit trail in Phase 1 with no querying reader; rows are untouched and `DB_VERSION` is now 3.

**Why.** Each item was grep-verified to have zero consumers or zero reachable callers in Phase 1. The JLPT-fixture wording existed only in kuskus-managed docs (architecture.md, quality.md), not in the owner doc: DEVELOPMENT_PROMPT.md's DoD gate is generic ("a known-bad entry"), and the kept vocab/kanji fixtures satisfy it. Speculative Phase 2 scaffolding rebuilt against guessed shapes would have been rewritten anyway; deletion keeps the Phase 2 base honest.

**Binds.** src/content/ (gate, ids, models, loaders), src/components/ (pools, tts, theme), src/storage/ (prefs, progressRepo, db), src/observability/logger.ts, src/domain/ (numbers, routine, scheduling), src/features/*, scripts/doctor.mjs, package.json, docs/architecture.md, docs/development.md, docs/quality.md. Phase 2 re-adds JLPT validation against `data/clean/`; Phase 3 re-adds `Prefs.level` with the selector.

## 2026-09-19 — Phase 1 closeout: root specs amended at the owner's instruction

**Decision.** The owner directed the completion agent to rewrite DEVELOPMENT_PROMPT.md and amend implementation_plan.md, PRODUCT.md, and docs/quality.md to close Phase 1. decisions.md:61-67 records these four specs as owner-authored and prettier-excluded; this entry records the relaxation. Future agents may edit these specs only under an explicit owner instruction for a named task, never as a drive-by formatting or drift fix.

**Why.** Phase 1 shipped with the plan documents out of sync with reality (level selector never built, kanji map pulled forward, vocab count stale). The owner resolved the conflicts by directing the amendments. Without this entry, a future agent reading the governance rule gets contradictory orders.

**Binds.** DEVELOPMENT_PROMPT.md, implementation_plan.md, PRODUCT.md, docs/quality.md, docs/architecture.md.

## 2026-09-19 — Level selector deferred to Phase 3 (closeout task 12)

**Decision.** Phase 1 ships no level selector. implementation_plan.md line 104 amended; the selector moves to Phase 3 with N4–N1 enablement; a gap row exists in docs/quality.md.

**Why.** Nothing writes `prefs.level` and the content gate refuses non-n5 (`src/content/gate.ts`), so a selector would have nothing valid to select. The dashboard renders the level as a readout. PRD §10.1 still binds for the full release.

**Binds.** implementation_plan.md Phase 1/3 scope lists, docs/quality.md gap ledger, PRD §10.1 deferred.

## 2026-09-19 — Kanji map, achievements, coverage are Phase 1 (closeout task 13)

**Decision.** The kanji mastery map with docked inspector, the achievements row, and the coverage-of-studied-material estimate belong to Phase 1 per DEVELOPMENT_PROMPT.md task 7. implementation_plan.md amended: the Phase 3 deferral at line 127 narrowed to toasts and the SRS statistics page; Phase 3 keeps achievement toasts, the SRS statistics page, and wiring the map to practice_core.json.

**Why.** The owner's prompt placed these in Phase 1 task 7 and they shipped at the progress surface. The plan's blanket Phase 3 deferral contradicted the prompt. The practice_core wiring stays a Phase 3 obligation because the shipped map derives from drill attempts only (`src/content/ids.ts` states practice_core is not consumed).

**Binds.** implementation_plan.md lines 116, 128, 215–218, docs/quality.md Proven rows.

## 2026-09-19 — Gate split: pure validators plus bundler loaders

**Decision.** `src/content/gate.ts` holds the pure Zod validators and ID stamping; `src/content/loaders.ts` owns the four clean-slice JSON imports and the `load*` functions. The e2e journey runs the gate validators over fs-read raw files.

**Why.** Playwright's Node ESM loader rejects bundler-style top-level JSON imports, so a spec importing gate.ts crashed the eval suite. The split keeps one source of truth for validation logic while letting the e2e legs build expected answers through the same grading path. check-arch's data-gate rule still holds: all `data/` imports remain inside `src/content/`.

**Binds.** src/content/gate.ts, src/content/loaders.ts, e2e/journey.spec.ts, docs/architecture.md current-state section.

## 2026-09-19 — Legacy loader quarantined, not fixed (closeout task 14c)

**Decision.** `data/generated/index.ts`'s missing `../../types/content` import is resolved by quarantine: the file sits outside the tsconfig, is reference-only, and `src/content/gate.ts` owns the type contract. implementation_plan.md line 243 amended from "fix as part of Phase 1" to this resolution. Deletion is Phase 2 pipeline work.

**Why.** The original instruction ordered a hand-edit of a file DEVELOPMENT_PROMPT.md section 2 forbids touching, and the gate already replaced the loader's function. Quarantine was the measured outcome; the plan now records it.

**Binds.** implementation_plan.md handoff notes, docs/quality.md debts.

## 2026-09-19 — Repository pushed; CI observed green

**Decision.** Initialized git on `main`, committed the full tree, and pushed to `origin` (github.com/chndranndr/NihonCode) at the owner's explicit instruction. `.gitignore` excludes local agent tooling (`.omp/`, `.pi/`, `.pstack/`) and scratch dirs; `.harness/` and `.impeccable/` are tracked as product artifacts. `.gitattributes` pins LF so prettier `--check` and CI agree across platforms.

**Why.** The owner created the remote and asked for the push. The first CI run failed on `format:check` (docs/quality.md table padding); fixed and re-pushed; run 35435907252 is green. `ci` promoted from partial to implemented with that observed evidence; the deferral entry is removed.

**Binds.** .harness/manifest.json (ci implemented), docs/quality.md, AGENTS.md workflow section.

## 2026-09-19 — Eval and dev servers derive collision-free ports

**Decision.** `scripts/run-e2e.mjs` finds the first free port ≥ 4173 and exports `E2E_PORT`; `playwright.config.ts` reads it for baseURL, webServer command, and url, with `strictPort` and `reuseExistingServer: false`. `scripts/serve-isolated.mjs` does the same for dev/preview (≥ 5173). Vite config binds `127.0.0.1` explicitly (Windows `localhost` resolves IPv6-first, which broke Playwright's IPv4 poll).

**Why.** A fixed preview port made two concurrent evals collide, and `reuseExistingServer` locally would silently test another run's stale build. Measured evidence: serve-isolated derived 5174 while 5173 was occupied, served HTTP 200, and tore down on SIGINT.

**Binds.** playwright.config.ts, scripts/run-e2e.mjs, scripts/serve-isolated.mjs, vite.config.ts; `workspace_isolation` promoted to implemented in the manifest.

## 2026-09-19 — practice_core IDs are not canonical; Phase 2 assigns them

**Decision.** The audit reports both resolutions (`unresolvedByPosition: 0`, `unresolvedByNumber: 32`, `numberPositionMismatch: 281`, 5 duplicate-number sets, 57 gapped sets) and gates neither as the canonical scheme; only index integrity is gated.

**Why.** Positional IDs rebind silently if a set is reordered (DEVELOPMENT_PROMPT.md section 2 forbids position-based progress keys), and `number` is not unique within sets. Making either resolution a passing gate would freeze a data defect into the architecture. Canonical IDs are Phase 2 work (implementation_plan.md Phase 2.5).

**Binds.** scripts/audit-data.mjs (ledger metrics), scripts/data-baseline.json, docs/data-quality.md, AGENTS.md ID rule.

## 2026-09-19 — src/observability is an added layer in the matrix

**Decision.** `src/observability/` joins the binding layer matrix as a dependency-free leaf; `check-arch.mjs` enforces default-deny for any `src/<dir>/` outside the matrix.

**Why.** DEVELOPMENT_PROMPT.md section 3 fixes six layers; the logging seam is cross-cutting infrastructure that every layer must reach without cycles. Without default-deny, an unlisted directory would pass the arch check silently.

**Binds.** scripts/check-arch.mjs layer matrix, docs/architecture.md, manifest architecture_boundaries artifacts.

## 2026-09-19 — Kuskus full profile initialized

**Decision.** Repository harness at `full` profile: command surface on npm scripts; guardrails as dependency-light Node scripts (`check-arch`, `check-taste`, `check-docs`, `audit-data`); smoke eval on Playwright over the production bundle; manifest at `.harness/manifest.json` (schema v2).

**Why.** The project is multi-surface (web app + large untrusted dataset + three-phase plan) and agent-heavy (DEVELOPMENT_PROMPT.md is written for an implementation agent). Full-profile loops map onto constraints the owner already wrote down. Existing artifacts (PRD, plan, briefs, mockup) preserved as authority; nothing replaced.

**Binds.** AGENTS.md, docs/, scripts/, .github/workflows/ci.yml, package.json scripts.

## 2026-09-19 — Raw data frozen by baseline, not by trust

**Decision.** `scripts/data-baseline.json` freezes the structural metrics of `data/generated` + `data/jlpt`; the audit fails on any drift. Regeneration requires `--write-baseline` plus a docs/data-quality.md update in the same change. `data/clean/` (Phase 2 output) is out of scope by construction.

**Why.** The dataset is user-owned, untrusted, hand-audited, and there is no git history to diff against. A frozen baseline makes silent corruption or accidental edits a deterministic failure instead of a mystery bug in a drill.

**Binds.** `npm run check` (audit chained), docs/data-quality.md.

## 2026-09-19 — CI provider: GitHub Actions

**Decision.** `.github/workflows/ci.yml` runs install → check (incl. data audit) → test → build on push/PR; the browser eval is a manual `workflow_dispatch` job.

**Why.** Owner-selected (no VCS or CI evidence existed in the repo to derive one). Eval is dispatch-gated because it downloads Chromium; PRs stay fast while the full eval remains one click away.

**Binds.** .github/workflows/ci.yml; inert until the repo is pushed to GitHub.

## 2026-09-19 — Prettier scoped to owned files; owner specs never reformatted

**Decision.** `format`/`format:check` take an explicit file list (`src scripts e2e docs AGENTS.md` + configs), never `.`. `.prettierignore` additionally excludes the four root specs, `data/`, and tool directories.

**Why.** Prettier normalizes markdown table delimiter rows; PRD.md contains `|---|---:|` styles it would rewrite. With no git, a write-mode pass over owner-authored binding specs would be unrecoverable.

**Binds.** package.json scripts, .prettierignore.

## 2026-09-19 — Observability = structured logs only

**Decision.** The observability seam is a namespaced JSON-lines logger with a bounded ring buffer exposed on `window.__nihonLog`; no metrics/tracing stack.

**Why.** No backend, no telemetry vendor, and the honest current surface is boot/error signals plus e2e-capturable records. Metrics and traces would be speculative infrastructure for an app that has no features yet; the manifest records observability as partial with this reason.

**Binds.** src/observability/logger.ts (tested), e2e/smoke.spec.ts asserts the boot record.

## Prior (owner-authored, recorded elsewhere)

- Storage: Dexie/IndexedDB for SRS + localStorage for settings (DEVELOPMENT_PROMPT.md section 2; resolves the PRODUCT.md open item; PRODUCT.md/PRD wording update is owner-authored and due with the storage commit).
- Dark-first binding; accent user-selectable (PRODUCT.md brand commitments).
- Phase gates: MVP → data remediation → polish, strictly ordered (implementation_plan.md).
