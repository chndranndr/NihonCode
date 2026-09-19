# NihonCode development prompt

## 0. Mission

You are the completion agent for NihonCode (キタ) Phase 1, a local-first Japanese practice web app. Build in phases. Phase 1 (MVP) tasks 1 through 9 shipped at HEAD f003e0a, with the exceptions named in section 5. Your job is the completion task list in section 5: restore the working tree, close the test and scope gaps, reconcile the planning documents, then re-verify the Phase 1 Definition of Done with evidence. Do not begin Phase 2 until Phase 1's Definition of Done is verified with evidence. Do not begin Phase 3 until Phase 2's gate passes. Scope discipline is part of the job: nothing outside the named phases gets built.

## 1. Grounding: read before writing code

Read in this order and keep them as authority throughout:

1. `PRD.md` — requirements, non-goals, release criteria, and section 18 (measured data defects).
2. `implementation_plan.md` — phase scope, per-phase Definition of Done, data remediation spec.
3. `PRODUCT.md` — product truth: users, purpose, positioning, constraints, brand commitments.
4. `.impeccable/surfaces/dashboard.md`, `drill.md`, `progress.md`, `about.md` — locked design contracts (THESIS / OWN-WORLD / STORY / FIRST VIEWPORT / FORM).
5. `mockup.png` — binding visual authority for the dashboard surface only.
6. `data/generated/*` and `data/jlpt/*` — untrusted source content. Inspect shapes; never trust field values.
7. `docs/quality.md` — what is proven by executable evidence, and what is still open.
8. `docs/data-quality.md` — measured defect ledger and the clean-slice gate.
9. `docs/decisions.md` — decision log. New decisions get an entry there in the same change.

Precedence when artifacts conflict: PRD.md for scope and non-goals; PRODUCT.md for product truth; surface briefs for composition and interaction; mockup.png for dashboard visuals. Where this prompt and implementation_plan.md disagree about Phase 1 scope, this prompt governs; the recorded resolutions are tasks in section 5. Pick the higher-precedence reading, proceed, and record the conflict in your final report. Never silently invent a third option.

## 2. Hard constraints

- Non-goals are binding: no AI features of any kind; no native packaging or mobile wrapper; no companion apps; no Mastery Path, placement, curriculum maps, or worksheets; no speech recording or pronunciation scoring; no accounts, cloud sync, or server-backed profiles.
- Raw `data/` is untrusted input. Every read goes through the `src/content` validation gate, which parses, normalizes, flags, and emits typed models with stable namespaced IDs. Components never touch raw JSON and never patch dataset defects inline.
- MVP graded pools are the verified clean slice only: kana (46 hiragana + 46 katakana), kanji N5 (80 entries), vocabulary N5 entries whose `romaji` is genuine Latin (643 Latin entries, of which 641 are graded; 2 pack alternative readings and stay out of exact-match grading until they get a variants list, per docs/data-quality.md), grammar N5 (72 lessons, marked reviewed), and the algorithmic Numbers and Dates drills. Everything else is excluded from grading until Phase 2 clears it. Excluded items are flagged and reported, never crashed on.
- Never hand-edit `data/generated` or `data/jlpt`. Never fabricate content, counts, licenses, testimonials, or usage metrics.
- Never copy direction-contract text (the THESIS/OWN-WORLD/STORY/FIRST VIEWPORT/FORM blocks) into any shipped artifact: no code comments, DOM, data attributes, bundles, metadata, or served files.
- Stable namespaced IDs from day one, independent of array order, e.g. `kana:hiragana:あ`, `kanji:n5:水`, `vocab:n5:水|みず`, `grammar:n5:12`, `jlpt:n5:listening:12:3`. Progress references IDs, never positions.
- Storage decision (recorded here, resolves the open item in PRODUCT.md): IndexedDB via Dexie for SRS cards, review logs, and drill attempts; `localStorage` for theme, accent, level, settings, and compact progress state. All stores schema-versioned; migrations additive and idempotent. The PRODUCT.md Stack line and PRD.md section 12 already match this wording.
- No backend, no accounts, no runtime network except lazy-loading bundled assets. The app works offline after load for everything already fetched.

## 3. Stack and architecture

React 19 + TypeScript (strict), Vite, React Router, CSS Modules + CSS variables for theming, `ts-fsrs` for scheduling, Zod at every data boundary, Vitest for domain rules, Playwright for key browser flows. Static web build.

Layout per implementation_plan.md: `src/app` (routing, layout, nav), `src/features` (drills, grammar, review, progress, settings, jlpt, about), `src/domain` (grading, scheduling, XP/streak rules; pure, no React), `src/content` (schemas, gate, normalizers, loaders), `src/storage` (Dexie + localStorage, migrations, export/import later), `src/components` (shared UI), `src/observability` (structured logs; dependency-free leaf, added per docs/decisions.md). Datasets and audio load lazily per level and route, never all at app start.

## 4. Design contract

- World: terminal console / command deck from `mockup.png`. Near-black ground, hairline panel borders with corner ticks, monospace UI face for labels and data, tracked uppercase micro-labels, one accent per semantic role (amber primary, green success/mastered, blue info/learning, orange new/due, red critical), box-drawing and ASCII ornament (Fuji skyline, vertical margin Japanese, boot ticker, clock/coords stamp) as binding world elements. No glass, no gradient panel fills, no rounded card shells, no stock illustration, no confetti gamification, no display serifs.
- Surfaces and locked compositions: dashboard = instrument panel of live readouts around one focal CTA; drill = instrument channel (status rail, prompt plate, input dock; reveal flip teaches every script, meaning, speaker, and on a miss every accepted reading plus group/category); progress = mission-control telemetry stack with full interactive kanji map and docked per-kanji inspector; about = system-info readout with the content-sources ledger. Follow each brief's FIRST VIEWPORT, constraints, and open-decision list.
- Modes: Operate for dashboard, drill, progress; Read for about.
- Dark theme is the default and primary target (binding). Light theme carries the same hairline grammar. Accent color user-selectable, touching primary action and selection only.
- Navigation: left icon rail owns nav at 768px and above; below that the rail collapses and the bottom command bar becomes nav. On desktop the bottom bar is status ticker plus [1]-[4] keyboard legend; keys jump sections.
- Motion: 150-250ms state feedback only. The ticker types once on load; nothing else choreographs.
- Components ship full state sets: default, hover, focus, active, disabled, loading, error. Skeletons for loading, never spinners inside content. Empty states teach the panel's purpose.
- Accessibility: accessible labels on controls; visual progress paired with text; kanji map arrow-key navigable with the inspector as a live region; drill keyboard contract (Enter submits, Enter advances, Esc aborts with confirm); TTS unavailable shows a visible state and never blocks text study.
- Session contract (drills and SRS review): XP awards on completion only; no mid-session resume, and an aborted review session discards its scheduling (this overrides the "resumable" wording in implementation_plan.md; reconcile per section 5 task 14); retry reshuffles; reveal teaches more on a miss.
- Progress semantics per PRD: XP sources are drill correctness, perfect-drill bonus, SRS review completion, grammar quiz completion, daily bonus, streak bonus; level curve quadratic to 50; streak counts study days.
- If the impeccable skill is available in your harness: run `impeccable context` once per session; read `reference/craft-floor.md` immediately before the first UI edit; after the UI is complete run `impeccable detect --json` once over changed targets and fix mechanical findings; then spawn the shipped finish reviewer with the request, briefs, screenshots, and direction contracts; then the shipped documenter to produce DESIGN.md and `.impeccable/design.json`. Inspection rounds are capped at two.

## 5. Phase 1 task order

### Shipped at HEAD f003e0a

Tasks 1 through 9 shipped. Evidence rows live in docs/quality.md; the original task texts live in git history.

| Task | State at HEAD | Evidence (docs/quality.md rows) |
| --- | --- | --- |
| 1 Scaffold, storage, IDs, validation gate | Shipped | Content gate, layer boundaries, MVP clean-slice gate, storage |
| 2 Shell, routes, theme, ticker | Shipped | Boot + shell, collision-free ports |
| 3 Dashboard | Shipped; every named panel present in `src/features/dashboard/DashboardPage.tsx`, JLPT and conjugation locked with reasons | Boot + shell, design system |
| 4 Drills over the clean slice | Shipped; no test asserts any kanji or vocab item grades correct (closeout task 11) | Drill setup contracts, drill→persist→review journey |
| 5 Grammar N5 flow | Shipped | Journey (grammar resume leg) |
| 6 SRS | Shipped | Journey (review leg), storage |
| 7 Progress surface | Kanji map, gauges, weekly bars shipped; achievements and coverage estimate are part of the uncommitted extension (closeout task 10) | Design system |
| 8 About and Settings | Shipped except the sources-ledger data file, which is part of the uncommitted extension (closeout task 10) | Design system |
| 9 TTS | Shipped | TTS unavailable |

Working tree as of 2026-09-19: uncommitted and non-compiling. `src/domain/achievements.ts`, `src/domain/achievements.test.ts`, and `src/content/sources.ts` are untracked; `src/features/progress/ProgressPage.tsx` holds a partial refactor (duplicated `achievementList` block, JSX starting mid-expression). HEAD typechecks clean. The breakage is the in-progress extension, not a shipped regression.

### Completion tasks

Execute in order; each task ends with its acceptance check passing before the next starts.

10. Restore the working tree. Finish the in-progress extension (achievements row, coverage estimate, About sources ledger backed by `src/content/sources.ts`) or revert it back to HEAD. Acceptance: `npx tsc --noEmit` and `npm run check` green at the resulting head.
11. Drill-surface coverage. Kanji is the one DoD-named drill with zero evidence: no test grades a kanji item correct on any path. The review leg answers incorrectly against all 20 kanji and vocab cards (its own comment says it misses intentionally). Vocab items are graded on the review path but never correctly, so no test asserts a vocab romaji is accepted as correct on either the drill path or the review path. `src/features/drills/drill-build.test.ts` covers only the numbers and dates builders; `e2e/journey.spec.ts` runs a kana drill, a numbers count, grammar resume, theme persistence, and the Esc abort. Add builder unit tests for the kana, kanji, and vocab pools (accepted answers, reveal fields, ID shapes) plus e2e legs that grade a kanji drill and a vocab drill correctly. Acceptance: every graded builder is covered; the journey grades kanji and vocab end to end with correct answers asserted.
12. Level selector. Decision recorded here, resolving implementation_plan.md line 104: Phase 1 ships no level selector. Nothing writes `prefs.level`; the gate refuses non-n5 (`src/content/gate.ts`), so a selector would have nothing valid to select; the dashboard renders the level as a readout. The selector lands with N4-N1 enablement in Phase 3; PRD section 10.1 still binds for the full release. Action: amend implementation_plan.md line 104 and add the gap row to docs/quality.md. Acceptance: both documents agree; the ledger row exists.
13. Scope reconciliation. Decision recorded here: the kanji mastery map, achievements, and coverage estimate ("JLPT mastery estimate") belong to Phase 1 per task 7, overriding the Phase 3 deferral at implementation_plan.md lines 127 and 213-215. What stays in Phase 3: achievement toasts, the SRS statistics page (the dashboard SRS panel is not that page), and wiring the kanji map to practice_core.json (line 214). The shipped map derives from drill attempts only; practice_core.json is not consumed (`src/content/ids.ts`). Action: amend implementation_plan.md to move the three items into Phase 1 while keeping the named Phase 3 obligations intact. Acceptance: implementation_plan.md Phase 1 and Phase 3 lists agree with this prompt; `npm run check:docs` green.
14. implementation_plan.md wording fixes. (a) Line 110: the graded vocab pool is 641, not 643 (section 2 of this prompt is already corrected; also fix the PRODUCT.md clean-slice line). (b) Line 114: delete "resumable"; review sessions discard on abort per section 4 of this prompt and `src/features/review/ReviewPage.tsx`. (c) Line 243: replace the order to fix `data/generated/index.ts` with the recorded resolution. The legacy loader is quarantined outside the tsconfig and treated as reference-only; the gate owns the type contract; deletion is Phase 2 pipeline work (docs/quality.md debts). Section 2 of this prompt forbids hand-editing that file, which is what line 243 orders. Acceptance: all three lines amended; no contradiction remains between this prompt and implementation_plan.md.
15. Verification pass (original task 10): typecheck, lint, full Vitest suite, Playwright loop (drill → grade → persist → reload → review, including the kanji and vocab legs from task 11), production build served statically, screenshots at 1440 and 390 widths, detector run, finish review, documenter.

## 6. Phase 1 Definition of Done

- App opens in desktop and mobile viewports with no install and no account.
- Kana, kanji N5, vocab N5, numbers, and dates drills plus an N5 grammar lesson each run end to end: grade, reveal, award XP.
- The graded vocab pool is 641; the two packed-alternative entries are flagged and excluded, not crashed on.
- SRS review completes; reload preserves next-due state; card does not reappear as new.
- The validation gate demonstrably excludes a known-bad entry from graded pools (flagged, not crashed).
- TTS-unavailable path completes text drills with a visible unavailable state.
- Domain rules (grading, XP, FSRS rating map) covered by unit tests; every graded drill builder covered by a unit test; the drill→persist→review loop covered by one Playwright flow.
- Detector findings fixed or handed to the reviewer; finish review disposition acted on; DESIGN.md and `.impeccable/design.json` written by the documenter.
- The completion-task amendments (tasks 12 through 14) landed in implementation_plan.md, PRODUCT.md, and docs/quality.md.

## 7. Gates to later phases

Phase 2 (data remediation) and Phase 3 (polish and full scope) are specified in implementation_plan.md sections 2 and 3. Do not start them early, do not expand them, and do not let Phase 1 code assume their outputs. Phase 2 owns the content pipeline, normalization, curation queue, audio aliasing resolution, conjugation metadata, and attribution clearance. Phase 3 owns N4-N1 enablement (including the level selector), JLPT practice, conjugation drill, the SRS statistics page, achievement toasts, kanji-map wiring to practice_core.json, export/import, and the responsive/accessibility/performance pass.

## 8. Verification protocol

Run, in order, at the integrated head: typecheck; lint; `vitest run`; Playwright e2e; production build; serve the build and smoke-test the loop in a browser; capture desktop (1440) and mobile (390) screenshots; `impeccable detect --json` once over changed UI targets; finish reviewer; documenter. Fix batches between inspection rounds, never per-tweak. Two inspection rounds is the ceiling.

## 9. Reporting

End with: what shipped per task; evidence (commands run and their outcomes); the flagged-content queue with counts; every decision you made that was not already settled (with the file and line you recorded it in); doc updates performed (the completion-task amendments in implementation_plan.md, PRODUCT.md, docs/quality.md, and docs/decisions.md); and open items handed to Phase 2. Claims without evidence are defects.
