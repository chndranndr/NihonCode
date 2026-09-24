# Product

> Current-state clarification (2026-09-22): Phase 1–3 have shipped on `data/clean/`; the dirty-pool/MVP sequencing and pre-code inventory below are historical planning evidence, not current availability constraints. Consult AGENTS.md and docs/quality.md for shipped capabilities and remaining owner gates. The approved nine-view HTML redesign is documented in DESIGN.md and .impeccable/README.md; production redesign integration is pending. Do not restore retired datasets or lock supported levels/conjugation based on the historical paragraphs.

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + TypeScript (strict), Vite, React Router, CSS Modules + CSS variables for theming, `ts-fsrs` for scheduling, Vitest for domain-rule tests, Playwright for key browser flows. Delivered as a static web build (PRD.md section 8, implementation_plan.md). Persistence (settled, DEVELOPMENT_PROMPT.md section 2): IndexedDB via Dexie for SRS cards, review logs, and drill attempts; `localStorage` for theme, accent, level, settings, and compact progress state; all stores schema-versioned with additive, idempotent migrations (PRD.md section 12 updated to match).

## Users

Primary: a self-motivated beginner Japanese learner (JLPT N5) studying on a desktop browser in focused sessions. Owner-confirmed usage scene: desktop-first, keyboard input, longer study sittings rather than phone micro-sessions. Mobile-browser layouts remain a PRD requirement, but desktop is the primary design target.

Secondary: intermediate and advanced learners (N4–N1) working through kanji, vocabulary, grammar, and JLPT-style practice sets.

No accounts, no teachers, no classrooms, no social features.

## Product Purpose

Kita is a self-serve Japanese practice app that runs entirely in the browser. It exists to make daily study frictionless: open a tab, pick a drill or review due cards, finish in a few minutes, see progress accumulate. Success means a learner completes a meaningful session in under 5 minutes, returns daily, and can track XP, streak, JLPT mastery, and SRS scheduling at a glance without configuration.

## Positioning

Local-first, zero-setup Japanese practice: no account, no installation, no API keys, no server. Everything (content and progress) lives in the browser. Lighter than a course platform, deeper than a flashcard app, because drills, grammar lessons, FSRS scheduling, and JLPT exam-style sets share one progress system. A cloud-backed competitor could not truthfully copy the no-account, all-data-stays-local claim.

## Operating Context

- Study loop: dashboard → pick mode → drill/lesson/review session → completion summary with score and XP → progress page.
- Flagship daily routine card recommends the next action (SRS review when cards are due, otherwise a drill or progress check).
- Sessions are short and repeatable; drills support immediate retry with reshuffled items.
- Keyboard-driven on desktop: typed answers in romaji or kana, Enter to submit.
- Audio: pronunciation via Web Speech API (browser TTS) with Japanese voice detection; JLPT listening uses bundled MP3s. Audio complements text; study never requires it.
- Bottom command bar navigation: HOME / PROGRESS / LEARN / CONFIG. Browser back returns to the previous view.
- Persistence is per-browser and per-origin. Clearing browser data erases progress; there is no cloud backup.

## Capabilities and Constraints

In scope (PRD.md sections 9–10):

- Drills: Kana (46+46 basic gojuon), Kanji, Vocabulary, Numbers, Dates, Conjugation.
- Built-in grammar library with lessons and quizzes (N5–N1).
- JLPT practice: five categories, numbered local exercise sets, bundled listening audio, per-set progress.
- SRS: FSRS scheduling, due-before-new ordering, configurable daily new-card cap, optional learning-step skip. Access is open at every level; no prerequisite gating.
- Progress: XP, level (quadratic curve to 50), streak, study contribution calendar, four-axis activity mix, JLPT mastery, achievements, kanji mastery map. The calendar and activity mix are an owner-requested extension (2026-09-22), currently demonstrated in the HTML mockup; production integration is pending. Activity mix measures participation, not proficiency (PRD §10.13).
- Settings: SRS preferences, light/dark theme, accent color.
- About page with accurate local-first and persistence-limitation copy.

Excluded (binding non-goals, PRD.md section 3):

- No AI features of any kind (no chat, generation, transcription, image analysis, provider keys).
- No mobile wrapper or native packaging (no Capacitor, no Android/iOS builds).
- No companion apps (Wear OS / KITA Watch removed).
- No Mastery Path, placement tests, curriculum maps, or worksheet assignments.
- No speech recording or pronunciation scoring.
- No cloud sync, accounts, or server-backed profiles.

Hard data constraint: the bundled datasets exist but are not yet grade-ready. 7,293 of 7,938 vocabulary entries hold Japanese text in the `romaji` field; N4–N1 kanji answers contain dictionary markers; JLPT sets contain truncated prompts, null keys, remote image dependencies, and unverified audio-to-question mapping. All content passes a validation gate before grading; flagged items stay out of graded pools (PRD.md section 18, implementation_plan.md Phase 2). The MVP ships on the verified-clean slice only: kana, kanji N5, the 643 N5 vocab entries with genuine Latin romaji (641 graded; 2 pack alternative readings and await a variants list), grammar N5 (marked reviewed), and algorithmic Numbers/Dates drills.

Sequencing constraint: build order is MVP → data remediation → polish. Features depending on dirty data (JLPT practice, conjugation, N4–N1 content) are deferred by design, not by oversight.

## Brand Commitments

- Name: Kita (キタ). Established; not open for rename.
- Dark-mode-first is binding (owner-confirmed): dark is the default on first visit; light mode exists as a user choice.
- Accent color is user-selectable; the interface must support it.
- UI language: English (matches PRD and existing content metadata).

## Evidence on Hand

- PRD.md — full target requirements, non-goals, release criteria, measured data defects (section 18).
- implementation_plan.md — three-phase build plan with per-phase definitions of done.
- data/generated/ — kana, kanji, vocabulary, grammar (N5–N1), practice_core.json reverse index; audited (43 JSON files parsed).
- data/jlpt/ — 688 exercise sets, 5,339 question records, 184 local MP3s; audited with defects catalogued.
- Per-file source metadata: amgidex grammar lists, Tatoeba (CC BY 2.0 FR) example sentences, japanesetest4you exercises/audio. Consolidated attribution and redistribution clearance are pending (implementation_plan.md Phase 2.7).

Absences future work must not fabricate: no app code exists yet; no screenshots, testimonials, users, or usage metrics exist; no logo or brand assets beyond the name; no consolidated license document.

## Product Principles

1. Local-first: everything persists in the browser; the app works with no login and no network after load.
2. Web-only: one responsive app; no installation, no native packaging.
3. Short-session friendly: every mode supports a quick repetition loop; a meaningful session fits in under 5 minutes.
4. Motivation visible: XP, levels, streaks, and achievements are surfaced prominently, never hidden in menus.
5. Self-directed: the learner chooses drills, lessons, and reviews; the app recommends but never gates or forces a curriculum.
6. Trustworthy data over abundant data: content that has not cleared the validation gate never reaches a graded question.

## Accessibility & Inclusion

- Pronunciation audio complements text; all drills and lessons remain fully usable when speech synthesis or a Japanese voice is unavailable, with a visible unavailable state.
- Buttons carry accessible labels; visual progress indicators are paired with text.
- Japanese script must render legibly at study sizes; furigana-bearing example sentences (parenthesized readings) are part of the content and must not be stripped.
- Keyboard operation is a primary input path (desktop-first usage), including answer entry and submission.
