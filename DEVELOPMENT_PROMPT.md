# NihonCode development prompt — Phase 3 (polish and full scope)

> Redesign handoff (2026-09-22): Phase 3 is complete. Use [UI_IMPLEMENTATION_PROMPT.md](UI_IMPLEMENTATION_PROMPT.md), [DESIGN.md](DESIGN.md), and [.impeccable/README.md](.impeccable/README.md) for the approved redesign. HTML mockups are the current visual authority; production integration is pending. Phase task order and old version numbers below are historical. Architecture, non-goals, data gates and verification remain binding. Owner-authorized design-document synchronization is permitted; it does not resolve listening/reading/release gates.

> Phase 1–2 history: MVP shipped; N5/N4 manually curated (2,298 verdicts in `curation/adjudications.json`); app swapped to `data/clean/` as the committed single source of truth; raw scrape and the Phase 2 build pipeline retired. The Phase 2 prompt and its record live in git at `b15c717` and earlier. This prompt governs Phase 3 only.

## 0. Mission

You are the implementation agent for NihonCode (キタ) Phase 3. Your job is implementation_plan.md section 3 — the full PRD scope on the tracked pool — plus the one Phase 2 Definition-of-Done item the owner deferred here: conjugation metadata (implementation_plan.md:197). Do not rebuild the retired pipeline, do not re-add raw `data/generated`/`data/jlpt`, do not resurrect generated-output wiring: `data/clean/` is committed content, guarded by `scripts/audit-clean.mjs`. Scope discipline is part of the job: execute tasks in order; owner decisions gate the JLPT work (section 3).

## 1. Grounding: read before writing code

1. `implementation_plan.md` section 3 — the Phase 3 spec and Definition of Done. The plan governs scope; this prompt governs order and acceptance.
2. `docs/data-quality.md` — the ledger and the tracked-pool gate: exactly what `audit-clean` enforces (defect zeros, floors, unique IDs, practice_core integrity, MP3 presence, id-vs-content derivation) and the open owner items.
3. `docs/decisions.md` — the 2026-09-21 entries (curation, loader swap, single-source cutover) bind; new decisions get an entry in the same change.
4. `PRD.md` section 10 — feature specs (10.9 conjugation included); section 18 is the owner's defect statement. Owner-authored: report deltas, never edit.
5. `PRODUCT.md` — product truth. Owner-authored.
6. `docs/quality.md` — proven evidence and the gap ledger you are closing.
7. `curation/queue-n3-n1.json` (frozen 560-item worklist) and `curation/adjudications.json` (the verdict record).
8. `data/clean/` — the dataset. Read shapes; trust only what `audit-clean` asserts.

## 2. Hard constraints

- `data/clean/` is the committed single source of truth. A content change is a tracked edit plus a `docs/data-quality.md` ledger update in the same change plus `npm run audit:clean` green. There is no pipeline and no codegen; `curation/adjudications.json` remains the verdict record for curation passes.
- Raw `data/generated`/`data/jlpt` are retired. `check-arch` forbids importing them anywhere and `data/clean` outside `src/content`. Do not re-add them in any form.
- ID stability: `vocabId`/`kanjiId` are content-derived; an edit that rewrites `kana` or `kanji` re-keys the entry and orphans shipped progress. Keep graded IDs byte-identical or ship a Dexie `version(5)` remap in the same change (`db.ts` is at `version(4)`; the pattern is `vocab-migration.ts`). `check-rekeys` guards the rekey map.
- `scripts/audit-clean.mjs` is the pool gate; new pool validations land there with a `--self-test` fixture. Floors only grow; extending a floor is a ledger update in the same change.
- Conjugation class is never inferred from category buckets (PRD §18: unreliable — お手洗い sits under Adjectives, しばらく under Verbs). Metadata is curated per entry and spot-checked.
- Level enablement ships with per-level lazy loading: initial load fetches only the active level's data (implementation_plan Phase 3 DoD).
- No new runtime dependencies without an owner decision; scripts stay Node stdlib.
- Non-goals stay binding (PRD): no AI features, no accounts/cloud sync, no native packaging, no Mastery Path/placement/curriculum maps/worksheets, no speech recording or pronunciation scoring.
- Phase 1–2 behavior is pinned: `npm run check`, `npm test`, `npm run eval` green at every task boundary.
- Never copy direction-contract text (THESIS/OWN-WORLD/STORY/FIRST VIEWPORT/FORM) into any shipped artifact.
- Owner-authored docs (PRD, PRODUCT, implementation_plan): report deltas, never edit.

## 3. Owner decisions that gate tasks

- ~~**Reading passages**: keep+restore-text vs exclude~~ — **resolved 2026-09-23** (data-recon.md owner brief): passages restored from source, category ships.
- ~~**Listening sample confirmation**~~ — **resolved 2026-09-23** (data-recon.md owner brief): audio confirmed correct, redistribution rights held; category ships.
- ~~**`jlpt:n5:reading:10:bxpod7h8`** answer_index repair confirmation~~ — **confirmed 2026-09-23**: the question lives at `jlpt:n5:reading:11:bxpod7h8` (the gate text had the set number wrong) and ships with the repaired distractor set (電話しまあした → 電話しました) and valid key.
- ~~**Redistribution clearance**~~ — **resolved 2026-09-23**: JLPT assets carry the owner redistribution confirmation; amgidex grammar lists permitted for this non-commercial project. Only commercial redistribution of amgidex content would need author permission.

When a gated task arrives: stop its dependent work, write the decision request into your report with measured counts and options, proceed on the rest. Record resolutions in docs/decisions.md when they land.

## 4. Task order

Execute in order; each task ends with its acceptance check passing before the next starts. Every task that changes pool content updates docs/data-quality.md in the same change.

1. **Conjugation metadata** (closes implementation_plan.md:197 — the unclosed Phase 2 DoD item, owner-deferred to Phase 3 on 2026-09-21). Curate `pos` + `conjugationClass` (godan/ichidan/irregular; i-/na-adjective; explicit exceptions) for the N5 Verbs (118) and Adjectives (90) entries as tracked edits to `data/clean/vocabulary_n5.json`; extend the gate schema and models; add an `audit-clean` guard (every Verbs/Adjectives entry carries a valid class; Nouns/Numbers carry none) with a self-test fixture; spot-check ≥ 30 entries across classes and record the sample in docs/data-quality.md. Acceptance: audit green including the fixture; spot-check list in the ledger; decisions entry.
2. **Conjugation drill** (PRD §10.9). Pure domain conjugator, unit-tested over every class and form including exceptions; drill builder; user chooses forms and question count; eligible-word preview before start; grading; replace the CONJUGATION `LockedPanel` uses with the live drill; e2e conjugation flow. **Practice-setup pool matrix** (owner addition, 2026-09-21): every drill's setup screen shows the eligible items of its pool as a compact matrix (count + browsable list per mode, from the same loaded pools the builder slices), so learners see what a session can draw before starting; the conjugation preview reuses it. Acceptance: every PRD §10.9 bullet; sampled godan/ichidan/irregular and i-/na-adjective grading correct (implementation_plan Phase 3 DoD); matrix counts match the builder's pool sizes.
3. **N4 enablement + level selector.** Per-level dynamic-import loaders; revive `prefs.level`; the gate validates the requested level; dashboard/learn/review respect it; SRS pools per level. Acceptance: e2e level switch persists across reload; the production bundle's initial load carries no inactive-level chunks.
4. **N3–N1 curation pass, then enablement.** Adjudicate `curation/queue-n3-n1.json` (560 open: vocab.untransliterable 93, grammar.uninstantiatedTilde 203, grammar.genericStem 242, …) as verdicts in `curation/adjudications.json` applied as tracked edits; audit green per level with floors extended in the same change; then enable N3–N1 in the selector. Acceptance: worklist fully adjudicated (nothing silently shipped); per-level floors in audit-clean with ledger updates.
5. **JLPT practice** (gated on section 3). Five categories with level + category + numbered-set selection; graded runs over keyed questions only; per-set progress; listening playback from `data/clean/audio` on owner-confirmed sets; reading per the owner's decision (restore-text renders passages locally; exclude removes the category behind an honest locked panel). Acceptance: e2e listening plays the right audio for the right question on confirmed sets; zero remote image references anywhere.
6. **Statistics and telemetry surface.** SRS statistics page (streak, due today, learned/total, mastery %, kanji vs vocab breakdown); achievement unlock toasts; wire the kanji mastery map to `practice_core.json` with mastery relabeled "coverage of studied material".
7. **Export/import** of local progress. Acceptance: e2e round-trip without loss.
8. **Responsive / accessibility / performance pass.** Labels, text-paired indicators, audio-optional flows, no layout shift on rapid drill submission, route/dataset/audio lazy-loading; About page states the local-first stance, persistence limits, and attribution accurately.
9. **Verification and close.** Cross-phase e2e (Phase 1 drill→grade→persist→reload→review loop, plus listening and conjugation flows); Lighthouse/accessibility spot-check on main routes; docs/quality.md Proven rows and gap ledger updated to executable evidence; PRD delta list prepared for the owner; decisions entries for every new decision.

## 5. Phase 3 Definition of Done

Mirrors implementation_plan.md section 3 DoD, made checkable:

- Every in-scope PRD feature works end to end on `data/clean/` in desktop and mobile viewports.
- Conjugation metadata present and spot-checked (implementation_plan.md:197 closed); the drill grades godan/ichidan/irregular and i-/na-adjective forms correctly on sampled entries.
- JLPT listening plays correct audio on confirmed sets; reading renders per the owner's decision with no remote images.
- Progress, cards, preferences, and JLPT set state survive reload; export/import round-trips without loss.
- Initial load fetches only the active level's data.
- Attribution visible in About; release-block status accurate.
- `npm run check`, `npm test`, `npm run eval` green at the integrated head; `audit-clean` green; `doctor` green.

## 6. Verification protocol

At each task boundary and at the integrated head: `npm run check`; `npm test`; `npm run audit:clean` after any pool edit; `npm run eval` at any boundary that could touch app behavior; `npm run doctor` at the head. Observed failure → smallest durable guardrail: extend `scripts/check-*.mjs` or `audit-clean` (with a self-test fixture) over prose, then update `.harness/manifest.json`. Fix batches between runs, never per-tweak.

## 7. Reporting

End with: what shipped per task; evidence (commands run and their outcomes, counts); adjudication/worklist state (adjudicated, excluded, still open); every owner-decision request and its status; every decision you made that was not already settled (with the decisions.md entry); doc updates performed (data-quality.md, quality.md, decisions.md, manifest, sources.ts, the PRD owner-edit list); open items handed to the owner or the next phase. Claims without evidence are defects.
