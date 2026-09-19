# NihonCode development prompt

## 0. Mission

You are the implementation agent for NihonCode (キタ), a local-first Japanese practice web app. Build in phases. Phase 1 (MVP) ships first and completely. Do not begin Phase 2 until Phase 1's Definition of Done is verified with evidence. Do not begin Phase 3 until Phase 2's gate passes. Scope discipline is part of the job: nothing outside the named phases gets built.

## 1. Grounding: read before writing code

Read in this order and keep them as authority throughout:

1. `PRD.md` — requirements, non-goals, release criteria, and section 18 (measured data defects).
2. `implementation_plan.md` — phase scope, per-phase Definition of Done, data remediation spec.
3. `PRODUCT.md` — product truth: users, purpose, positioning, constraints, brand commitments.
4. `.impeccable/surfaces/dashboard.md`, `drill.md`, `progress.md`, `about.md` — locked design contracts (THESIS / OWN-WORLD / STORY / FIRST VIEWPORT / FORM).
5. `mockup.png` — binding visual authority for the dashboard surface only.
6. `data/generated/*` and `data/jlpt/*` — untrusted source content. Inspect shapes; never trust field values.

Precedence when artifacts conflict: PRD.md for scope and non-goals; PRODUCT.md for product truth; surface briefs for composition and interaction; mockup.png for dashboard visuals. Pick the higher-precedence reading, proceed, and record the conflict in your final report. Never silently invent a third option.

## 2. Hard constraints

- Non-goals are binding: no AI features of any kind; no native packaging or mobile wrapper; no companion apps; no Mastery Path, placement, curriculum maps, or worksheets; no speech recording or pronunciation scoring; no accounts, cloud sync, or server-backed profiles.
- Raw `data/` is untrusted input. Every read goes through the `src/content` validation gate, which parses, normalizes, flags, and emits typed models with stable namespaced IDs. Components never touch raw JSON and never patch dataset defects inline.
- MVP graded pools are the verified clean slice only: kana (46 hiragana + 46 katakana), kanji N5 (80 entries), vocabulary N5 entries whose `romaji` is genuine Latin (643 entries), grammar N5 (72 lessons, marked reviewed), and the algorithmic Numbers and Dates drills. Everything else is excluded from grading until Phase 2 clears it. Excluded items are flagged and reported, never crashed on.
- Never hand-edit `data/generated` or `data/jlpt`. Never fabricate content, counts, licenses, testimonials, or usage metrics.
- Never copy direction-contract text (the THESIS/OWN-WORLD/STORY/FIRST VIEWPORT/FORM blocks) into any shipped artifact: no code comments, DOM, data attributes, bundles, metadata, or served files.
- Stable namespaced IDs from day one, independent of array order, e.g. `kana:hiragana:あ`, `kanji:n5:水`, `vocab:n5:水|みず`, `grammar:n5:12`, `jlpt:n5:listening:12:3`. Progress references IDs, never positions.
- Storage decision (recorded here, resolves the open item in PRODUCT.md): IndexedDB via Dexie for SRS cards and review logs; `localStorage` for theme, accent, level, settings, and compact progress state. All stores schema-versioned; migrations additive and idempotent. Update the PRODUCT.md Stack line and PRD.md section 12 wording to match, in the same commit as the storage layer.
- No backend, no accounts, no runtime network except lazy-loading bundled assets. The app works offline after load for everything already fetched.

## 3. Stack and architecture

React 19 + TypeScript (strict), Vite, React Router, CSS Modules + CSS variables for theming, `ts-fsrs` for scheduling, Zod at every data boundary, Vitest for domain rules, Playwright for key browser flows. Static web build.

Layout per implementation_plan.md: `src/app` (routing, layout, nav), `src/features` (drills, grammar, review, progress, settings, jlpt, about), `src/domain` (grading, scheduling, XP/streak rules; pure, no React), `src/content` (schemas, gate, normalizers, loaders), `src/storage` (Dexie + localStorage, migrations, export/import later), `src/components` (shared UI). Datasets and audio load lazily per level and route, never all at app start.

## 4. Design contract

- World: terminal console / command deck from `mockup.png`. Near-black ground, hairline panel borders with corner ticks, monospace UI face for labels and data, tracked uppercase micro-labels, one accent per semantic role (amber primary, green success/mastered, blue info/learning, orange new/due, red critical), box-drawing and ASCII ornament (Fuji skyline, vertical margin Japanese, boot ticker, clock/coords stamp) as binding world elements. No glass, no gradient panel fills, no rounded card shells, no stock illustration, no confetti gamification, no display serifs.
- Surfaces and locked compositions: dashboard = instrument panel of live readouts around one focal CTA; drill = instrument channel (status rail, prompt plate, input dock; reveal flip teaches every script, meaning, speaker, and on a miss every accepted reading plus group/category); progress = mission-control telemetry stack with full interactive kanji map and docked per-kanji inspector; about = system-info readout with the content-sources ledger. Follow each brief's FIRST VIEWPORT, constraints, and open-decision list.
- Modes: Operate for dashboard, drill, progress; Read for about.
- Dark theme is the default and primary target (binding). Light theme carries the same hairline grammar. Accent color user-selectable, touching primary action and selection only.
- Navigation: left icon rail owns nav at 768px and above; below that the rail collapses and the bottom command bar becomes nav. On desktop the bottom bar is status ticker plus [1]-[4] keyboard legend; keys jump sections.
- Motion: 150-250ms state feedback only. The ticker types once on load; nothing else choreographs.
- Components ship full state sets: default, hover, focus, active, disabled, loading, error. Skeletons for loading, never spinners inside content. Empty states teach the panel's purpose.
- Accessibility: accessible labels on controls; visual progress paired with text; kanji map arrow-key navigable with the inspector as a live region; drill keyboard contract (Enter submits, Enter advances, Esc aborts with confirm); TTS unavailable shows a visible state and never blocks text study.
- Session contract (drills): XP awards on completion only; no mid-session resume; retry reshuffles; reveal teaches more on a miss.
- Progress semantics per PRD: XP sources are drill correctness, perfect-drill bonus, SRS review completion, grammar quiz completion, daily bonus, streak bonus; level curve quadratic to 50; streak counts study days.
- If the impeccable skill is available in your harness: run `impeccable context` once per session; read `reference/craft-floor.md` immediately before the first UI edit; after the UI is complete run `impeccable detect --json` once over changed targets and fix mechanical findings; then spawn the shipped finish reviewer with the request, briefs, screenshots, and direction contracts; then the shipped documenter to produce DESIGN.md and `.impeccable/design.json`. Inspection rounds are capped at two.

## 5. Phase 1 task order

Execute in order; each task ends with its acceptance check passing before the next starts.

1. Scaffold and foundations: tooling, strict TS, routing, storage layer (Dexie + localStorage, versioned), stable ID scheme, `src/content` validation gate. Acceptance: gate unit tests pass against known-bad samples (a vocab entry with Japanese in `romaji`, a kanji answer with dictionary markers, a JLPT record with a null key) by excluding and flagging them, not throwing.
2. Shell: HOME/PROGRESS/LEARN/CONFIG routes, rail and bottom bar behavior at the 768px boundary, theme system with dark default and accent variable, ticker. Acceptance: keyboard keys 1-4 jump sections; theme persists across reload.
3. Dashboard per its brief: status strip, level row, routine card with state-driven CTA (due > 0 → START REVIEW with count and estimate; else start new cards or a drill), practice modes grid, SRS statistics panel, grammar panel, JLPT panel, progress panel, kanji map compact panel, settings panel; deferred-feature panels render locked or teaching-empty states. Acceptance: every readout is live local state or an honest zero; CTA state machine covered by tests.
4. Drill surface per its brief: setup screens for kana, kanji, vocabulary, numbers, dates (conjugation locked with a reason); shared session engine (status rail, prompt plate, input dock, reveal flip); completion summary with score, XP, miss list, retry-reshuffled. Acceptance: full loop grades correctly on the clean slice; Esc abort confirms and awards nothing; TTS-unavailable path completes.
5. Grammar N5 lesson flow: list, lesson view with examples and audio button, three-question quiz, XP on completion, active-lesson resume. Acceptance: resume survives reload.
6. SRS: card pool from the clean slice, FSRS scheduling via ts-fsrs, due-before-new, configurable daily cap, learning-step skip setting, review session wired to the drill engine, review logs in Dexie. Acceptance: a reviewed card's next-due state persists across reload and does not reappear as new.
7. Progress surface per its brief: status strip, weekly XP bars, SRS gauge row with split bar, full kanji mastery map with level filter and docked inspector (readings, attempts, accuracy, last seen, status), achievements row, JLPT mastery estimate. Acceptance: map values derive from stored attempts; inspector updates on selection without navigation.
8. About and Settings per their briefs: CONFIG subview tabs; About as system-info readout with sources ledger (statuses from a data file), placeholder contact email visibly marked, version stamp; Settings with SRS prefs, theme, accent. Acceptance: clearance statuses render from data, not prose.
9. TTS service: Web Speech API with Japanese voice detection, katakana conversion for romaji-only input, unavailable fallback everywhere a speaker appears.
10. Verification pass: typecheck, lint, full Vitest suite, Playwright loop (drill → grade → persist → reload → review), production build served statically, screenshots at 1440 and 390 widths, detector run, finish review, documenter.

## 6. Phase 1 Definition of Done

- App opens in desktop and mobile viewports with no install and no account.
- Kana, kanji N5, numbers drills and an N5 grammar lesson run end to end: grade, reveal, award XP.
- SRS review completes; reload preserves next-due state; card does not reappear as new.
- The validation gate demonstrably excludes a known-bad entry from graded pools (flagged, not crashed).
- TTS-unavailable path completes text drills with a visible unavailable state.
- Domain rules (grading, XP, FSRS rating map) covered by unit tests; the drill→persist→review loop covered by one Playwright flow.
- Detector findings fixed or handed to the reviewer; finish review disposition acted on; DESIGN.md and `.impeccable/design.json` written by the documenter.

## 7. Gates to later phases

Phase 2 (data remediation) and Phase 3 (polish and full scope) are specified in implementation_plan.md sections 2 and 3. Do not start them early, do not expand them, and do not let Phase 1 code assume their outputs. Phase 2 owns the content pipeline, normalization, curation queue, audio aliasing resolution, conjugation metadata, and attribution clearance. Phase 3 owns N4-N1 enablement, JLPT practice, conjugation drill, SRS statistics page merge decisions, achievements depth, export/import, and the responsive/accessibility/performance pass.

## 8. Verification protocol

Run, in order, at the integrated head: typecheck; lint; `vitest run`; Playwright e2e; production build; serve the build and smoke-test the loop in a browser; capture desktop (1440) and mobile (390) screenshots; `impeccable detect --json` once over changed UI targets; finish reviewer; documenter. Fix batches between inspection rounds, never per-tweak. Two inspection rounds is the ceiling.

## 9. Reporting

End with: what shipped per task; evidence (commands run and their outcomes); the flagged-content queue with counts; every decision you made that was not already settled (with the file and line you recorded it in); doc updates performed (PRODUCT.md Stack line, PRD section 12); and open items handed to Phase 2. Claims without evidence are defects.
