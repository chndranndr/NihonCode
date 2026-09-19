# NihonCode Product Requirements Document

## Document Status

- Product: NihonCode (`キタ`)
- Document type: Target requirements for the simplified web release, not a report of completed implementation changes
- Platform scope: Responsive web app for desktop and mobile browsers
- Core scope: Drills, built-in grammar, SRS, JLPT practice, and progress tracking
- Data status: N5–N1 datasets exist under `data/` and were structurally audited (all 43 JSON files parsed, referenced audio checked on disk). They are not yet clean enough to grade directly. See section 18 for measured defects and the gating rule. Build sequencing lives in `implementation_plan.md`.

## 1. Product Overview

NihonCode is a Japanese learning web app for short daily practice. It combines drills, built-in grammar lessons, spaced repetition, JLPT practice sets, and progress tracking in a responsive, dark-mode-first interface.

The app is designed to help learners move between study modes without friction:

1. Quick practice of core language building blocks such as kana, kanji, vocabulary, numbers, dates, and conjugation.
2. Structured study via built-in grammar lessons and quizzes across all JLPT levels.
3. Exam-oriented practice through local JLPT exercise sets (grammar, kanji, listening, reading, vocabulary).
4. Scheduled review of kanji and vocabulary through SRS.
5. Progress tracking through XP, streaks, achievements, and JLPT mastery.

Bundled datasets cover JLPT N5 through N1 in kanji, vocabulary, and grammar. Depth and curation vary by level: N5 grammar is marked reviewed and N5 kanji is clean, while N4–N1 still carry mislabeled readings, dictionary markers, and unreviewed generated content. The kana table is the 46+46 basic gojuon only.

## 2. Product Vision

Provide daily Japanese practice in the browser with no account or app installation required:

- Focused daily drills
- Local-first progress persistence
- Motivating gamification

## 3. Goals

### Primary Goals

- Help users build recognition and recall for foundational Japanese content.
- Encourage daily study through streaks, XP, achievements, and visible progress.
- Reduce switching costs between different study activities.
- Keep all core study modes usable without an account or external service configuration.

### Secondary Goals

- Support self-directed drills and built-in lesson-based study.
- Provide short sessions on both desktop and mobile browsers.

### Non-Goals

- Full classroom-style curriculum management
- Teacher/student accounts
- Social/community features
- Cloud sync or server-backed user profiles
- Mobile wrappers or native app packaging, including Capacitor builds
- Companion apps, including Wear OS and NihonCode Watch
- Mastery Path, placement assessments, guided curriculum maps, and worksheet assignments
- AI features, including AI Grammar, Kaiwa, Image Analyzer, Video Study, transcription, provider profiles, and API key management
- Speech recording or pronunciation scoring drills

## 4. Target Users

### Primary User

A self-motivated beginner Japanese learner who wants daily mobile-friendly practice across kana, kanji, vocab, grammar, and listening.

### Secondary Users

- Intermediate and advanced learners who want kanji, vocabulary, grammar, and JLPT-style practice across N4–N1

## 5. User Needs

- I want fast drills without setup friction.
- I want to see that I am making progress over time.
- I want to hear correct pronunciation while studying.
- I want review scheduling for previously seen content.
- I want grammar explanations with low cognitive overhead.
- I want exam-style practice organized by JLPT level and category.

## 6. Success Criteria

The product should enable a learner to:

- Start a study activity from the dashboard in a few taps.
- Complete a meaningful drill session in under 5 minutes.
- Track level, XP, streak, and JLPT progress clearly.
- Review due SRS cards with visible scheduling feedback.
- Practice with local JLPT exercise sets for any level that has data.

## 7. Product Principles

- Local-first: study data persists in browser storage.
- Web-only: one responsive app, with no installation required.
- Short-session friendly: most features support quick repetition loops.
- Motivation visible: XP, levels, streaks, and achievements are surfaced prominently.
- Self-directed: users choose drills, lessons, and reviews without curriculum onboarding.
- Audio support: pronunciation playback complements written study material.

## 8. Supported Platforms and Technical Context

- Frontend: React 19 + TypeScript
- Build system: Vite 6
- Test runner: Vitest for unit and integration checks
- TTS: Web Speech API with Japanese voice detection
- SRS scheduler: FSRS via `ts-fsrs`
- Persistence: IndexedDB (Dexie) for SRS cards, review logs, and drill attempts; `localStorage` for theme, accent, level, settings, and compact progress state; all stores schema-versioned with additive, idempotent migrations
- Delivery: Web build served through a static host

## 9. Information Architecture

The app is organized around a single dashboard with a persistent bottom command bar (HOME, PROGRESS, LEARN, CONFIG).

### Dashboard

- Study level selector (N5–N1)
- Flagship daily routine card (review → learn → drill → track) with a context-aware primary action
- Practice mode grid: Kana, Vocabulary, Kanji, Numbers, Dates, Conjugation
- JLPT Practice entry
- SRS statistics entry

### Study Modes

- Kana, Kanji, Vocabulary, Numbers, Dates, Conjugation drills
- Grammar library and lesson flow
- JLPT Practice (level + category + numbered exercise sets)
- SRS review and SRS statistics

### Supporting Pages

- Progress (XP, streak, JLPT mastery, achievements, weekly activity) and Kanji mastery map
- Settings for SRS preferences and appearance
- About

## 10. Functional Requirements by Feature

### 10.1 Dashboard and Navigation

The dashboard must:

- Display the app brand and the selected study level.
- Allow switching directly between `N5`, `N4`, `N3`, `N2`, and `N1`.
- Show the flagship daily routine with the next recommended action (SRS review, SRS start, vocabulary drill, or progress check).
- Show entry points to all practice modes, built-in grammar, JLPT practice, and progress.
- Show SRS availability (due count or new-card start) on the daily routine card.

Navigation behavior:

- Dashboard is the home state.
- The bottom command bar navigates HOME / PROGRESS / LEARN / CONFIG.
- Browser back navigation returns to the previous app view.

### 10.2 Theme Support

The app must support light and dark mode, dark-first by design direction.

- Theme state is stored locally using `NihonCode-theme`.
- Theme changes update the root HTML class and browser theme color meta tag.
- An accent color preference is stored in `NihonCode-theme-accent` and applied to the interface.

### 10.3 Kana Practice

Purpose:

- Help users practice Hiragana and Katakana recognition/recall.

Requirements:

- User can switch between Hiragana and Katakana tabs.
- User can select individual characters.
- User can select all visible characters or clear visible selections.
- User can choose a question limit: 10, 20, 50, or all selected.
- Drill starts from selected items only.

Current content scope:

- Hiragana All chart
- Katakana All chart
- Basic gojuon only: 46 hiragana + 46 katakana. Voiced, semi-voiced, contracted, and small-kana characters are not in the source data (see section 18).

### 10.4 Kanji Practice

Purpose:

- Practice kanji recognition and readings by level and topic.

Requirements:

- Kanji content is grouped by learner level and semantic group.
- User selects a group, sees a preview list, can tap items for pronunciation, and can start a drill with a configurable limit.
- Drill answers accept kunyomi and onyomi.

Current content scope (generated-content inventory counts, nested group entries; not guaranteed unique pedagogical items):

- N5: 80
- N4: 166
- N3: 367
- N2: 367
- N1: 1232

### 10.5 Vocabulary Practice

Purpose:

- Practice high-frequency vocabulary grouped by semantic category.

Requirements:

- Vocabulary content is organized into categories.
- User selects a category, previews entries, hears pronunciation, and starts a drill with configurable limit.
- Drill answers are typed in romaji.

Current content scope (generated-content inventory counts, nested category entries; not guaranteed unique pedagogical items):

- N5: 744
- N4: 666
- N3: 2102
- N2: 1741
- N1: 2685

Known data defect: the `romaji` field is unreliable. Of 7,938 entries, 7,293 store Japanese text in `romaji` (6,812 of those are an exact copy of `kana`); only 643 N5 entries hold genuine Latin romaji. A separate, unquantified set pairs a valid `kana` with a Latin `romaji` for a different sense (for example N5 一日 with `romaji: ichinichi` but `kana: ついたち`). Vocabulary drills must not grade against `romaji` until this is normalized and reviewed (see section 18).

### 10.6 Core Drill Engine

Shared drill behavior for kana/kanji/vocab-based drills:

- Present one item at a time.
- Accept typed input.
- Mark answer correct or wrong.
- Reveal answer and meaning after each submission.
- Provide pronunciation playback via speaker button.
- Show progress bar and item position.
- Show a completion summary with score percentage.
- Award XP on completion.
- Allow retrying the drill with reshuffled items.

Answer rules:

- Matching is case-insensitive.
- Alternate readings may be accepted when defined.
- Kanji drills additionally accept onyomi and kunyomi variations.

### 10.7 Number Practice

Purpose:

- Practice Japanese number recognition and production.

Requirements:

- User chooses direction:
  - Japanese -> Number
  - Number -> Japanese
- User chooses either a preset range or a custom range.
- User chooses question count.
- Drill supports generated values within 1 to 999,999.
- Answer format depends on direction:
  - Numeric input for Japanese -> Number
  - Romaji input for Number -> Japanese
- Number generation includes special reading logic for irregular hundreds/thousands.

### 10.8 Date and Day Practice

Purpose:

- Practice days of the week and full-date reading patterns.

Requirements:

- User chooses mode:
  - Days of week
  - Full dates
- User chooses direction:
  - Japanese -> English
  - English -> Japanese
- Full date mode supports configurable year range and question count.
- Day-of-week mode always generates the 7 weekday items.
- Full-date logic must combine year, month, and day readings.
- Answer matching normalizes punctuation and non-letter characters.

### 10.9 Conjugation Practice

Purpose:

- Practice Japanese verb and adjective conjugations using N5 vocabulary data.

Requirements:

- User chooses word type:
  - Verb
  - Adjective
- User chooses included subtypes:
  - Verbs: godan, ichidan, irregular
  - Adjectives: i-adjective, na-adjective
- User chooses one or more conjugation forms.
- User chooses question count.
- User can preview the eligible word list before starting.
- Generated from vocabulary entries with grammatical metadata.
- During drill:
  - User sees the base word, reading, meaning, and target form label.
  - User can reveal a hint showing the word type.
  - User types the romaji answer.
  - Result view shows correct answer in kanji, hiragana, and romaji with audio.

Current source scope:

- Intended to use N5 vocabulary entries tagged with grammatical metadata. Blocking gap: the vocabulary data has no per-entry verb/adjective conjugation class (godan/ichidan/irregular, i-adjective/na-adjective), and the category buckets are unreliable (for example お手洗い sits under Adjectives, しばらく under Verbs). The conjugation drill cannot ship until that metadata is added (see section 18).

### 10.10 Built-in Grammar Library

Purpose:

- Provide structured grammar lessons and short quizzes.

Requirements:

- User can browse a lesson list.
- Each lesson includes:
  - Title
  - JLPT level
  - Explanation
  - Example sentences with Japanese, romaji, and English
  - Audio playback for Japanese examples
  - 3 multiple-choice quiz questions
- User can progress through quizzes and then move to the next lesson.
- Correct answers award XP via progress service.
- The active lesson is persisted so users can resume.

Current content scope (grammar lesson records):

- N5: 72
- N4: 130
- N3: 182
- N2: 197
- N1: 251

Known data defect: all 2,496 quiz answers are structurally members of their choices, but content review is incomplete. N5 grammar is marked reviewed; N4–N1 are not. Confirmed defects include malformed generated answers marked correct (N3 としなら, N1 にかかっなら), generic non-discriminating fill-in-the-blank stems, duplicate examples, and uninstantiated ～ notation used as answers. Lesson IDs restart at `1` per level and need namespacing (see section 18).

### 10.11 Spaced repetition system

Purpose:

- Convert kanji and vocabulary items into reviewable cards with adaptive scheduling.

Requirements:

- Scheduling uses FSRS (`ts-fsrs`); scheduling state is persisted as compact FSRS card state.
- The active card pool is cumulative by selected level (N5 alone at N5; each higher level adds all lower levels).
- Due review cards are shown before new cards.
- The daily cap for new cards is user-configurable (default 20).
- An optional setting lets correct new cards skip learning steps and graduate directly to FSRS review.
- Review outcomes map to FSRS ratings (correct -> Good, incorrect/timeout -> Again).
- Review logs are stored for future tuning/analytics; default FSRS parameters are used.
- SRS access is open at every level; the app recommends a level from progress but does not lock higher-level review behind prerequisite mastery. (The prior mastery-gate design is dropped: with no placement flow, gating blocks returning learners from content they already know.)
- Review session completion updates streak and awards XP.

Current card coverage:

- Kanji and vocabulary cards for N5–N1, scoped by the selected study level.

### 10.12 SRS statistics

Purpose:

- Explain SRS progress at a glance.

Requirements:

- Show:
  - Day streak
  - Due today
  - Learned cards
  - Total cards
  - Overall mastery percentage
  - Mastered / learning / not started breakdown
  - Kanji vs vocabulary progress
- If cards are due, provide CTA to start review.

### 10.13 Progress and gamification

Purpose:

- Make growth visible and reinforce daily engagement.

Requirements:

- Track and display:
  - Total XP
  - Level
  - Streak
  - Today's XP
  - Weekly XP chart
  - JLPT mastery
  - Achievements
- A dedicated Kanji mastery map shows per-character status (mastered / learning / unseen) computed from attempts and accuracy.
- Recalculate JLPT mastery from SRS progress and grammar quiz completion.
- Surface achievement toast notifications when achievements unlock.

Current progress logic:

- XP sources:
  - Drill correctness
  - Perfect drill bonus
  - SRS review completion
  - Grammar quiz completion
  - Daily bonus
  - Streak bonus
- Level curve is quadratic and precomputed up to level 50.

Current JLPT progress scope:

- Progress tracking is level-aware across N5–N1.

### 10.14 Settings

Purpose:

- Let users adjust review workload and appearance.

Requirements:

- User can set the daily cap for new SRS cards.
- User can choose whether correct new cards skip SRS learning steps.
- User can switch between light and dark themes and select an accent color.
- Preferences persist in the same browser.

### 10.15 Audio and pronunciation

Requirements:

- Common study screens should expose a speaker button.
- Playback uses the Web Speech API with Japanese voice detection.
- If speech synthesis or a Japanese voice is unavailable, show that playback is unavailable and keep text-based study usable.
- Romaji-only inputs may be converted to katakana before playback to improve pronunciation.

### 10.16 About

Requirements:

- App includes an About page summarizing the product, its local-first stance, and the tech used.
- App exposes contact information (email link).
- About must explain browser-local storage, lack of cloud sync, and the risk of losing progress when browser data is cleared.

### 10.17 JLPT practice

Purpose:

- Provide exam-style practice sets organized by JLPT level and category.

Requirements:

- User picks a level (N5–N1) and a category:
  - Grammar
  - Kanji
  - Listening
  - Reading
  - Vocabulary
- User picks a numbered local exercise set from the available list.
- Sessions run the set's questions; only questions with answer keys enter the graded run.
- Listening exercises play bundled audio.
- Per-set progress (level, category, set) is persisted locally.

Current content scope (local exercise set counts per category from the bundled manifest):

| Level | Grammar | Kanji | Listening | Reading | Vocabulary |
|---|---|---|---|---|---|
| N5 | 26 | 19 | 43 | 12 | 19 |
| N4 | 30 | 19 | 54 | 21 | 26 |
| N3 | 29 | 31 | 22 | 16 | 21 |
| N2 | 25 | 21 | 35 | 41 | 26 |
| N1 | 26 | 21 | 28 | 55 | 22 |

Listening audio files are present under `data/jlpt/audio` (184 MP3s, all non-empty with valid headers). Known data defects: 927 question records across 182 sets plus 108 passages reference remote `japanesetest4you.com` images that are not packaged locally; 33 records have a truncated `「` prompt with the question fragment pushed into the choices; 5 N3 reading records have null answer keys (scraped reference rows); 4 N2 reading passages are empty and image-dependent; and 930 distinct source audio URLs alias onto the 184 local files, so per-question audio correspondence is unverified. JLPT practice cannot ship until these are resolved (see section 18).

## 11. Content Requirements

### Content Quality Requirements

- Each drill item should include character, expected reading, and meaning.
- Kanji items should include onyomi and kunyomi.
- Vocabulary entries used for conjugation must be tagged with category and verb/adjective type.
- Grammar lessons must include explanation, examples, and quiz questions.
- Source content lives in `data/generated` and `data/jlpt` and is untrusted input. A content pipeline normalizes and validates it into typed, ID-stamped app datasets; hand-editing pipeline output is prohibited. No pipeline exists in the repo yet (see `implementation_plan.md` Phase 2).
- Lessons and exercises ship as static content. Learners do not generate content or configure external providers.

### Data Readiness Gate

Content counts in this document describe what is present in `data/`, not what is safe to grade. The full measured defect inventory, the normalization and curation pipeline, and the human-review queue are specified in section 18 and sequenced in `implementation_plan.md`. The app loads raw `data/` only through a validation gate that emits typed, ID-stamped models and excludes flagged items from graded pools. No feature ships over content that has not cleared that gate.

## 12. Data and Persistence Requirements

Study data and preferences are local to the current browser and site origin; no backend or cross-device sync is required. Volume state (SRS cards, review logs, drill attempts) lives in IndexedDB via Dexie; compact state lives in `localStorage`. All stores are schema-versioned with additive, idempotent migrations.

### Storage Domains

IndexedDB (Dexie):

- SRS cards and review logs
- Drill attempt history (per-item mastery)

Compact `localStorage` state:

- Theme preference and accent color
- Selected study level
- SRS preferences (daily new-card cap, learning-step skip)
- Overall progress (XP, streak, weekly buckets)
- Grammar lesson completion and active lesson
- JLPT practice progress and active set

### Persistence Requirements

- App must remain usable with no login.
- Returning users should retain progress on the same device/browser.
- New content added to source datasets should merge into existing SRS state without deleting progress.
- Removing retired features must preserve existing SRS history, XP, achievements, grammar completion, and JLPT practice progress in the same browser.

## 13. Non-functional requirements

### Performance

- Dashboard and drill transitions should feel immediate on common desktop and mobile browsers.
- Drill views should support rapid repeated submission without layout instability.

### Reliability

- Loaded drills, grammar lessons, SRS, and progress must remain usable without a network connection.
- Initial loading and fetching uncached content or listening audio require a network connection. Full offline installation is not a release requirement.
- Speech synthesis availability and offline playback depend on the browser and available Japanese voices.
- Reloading the page must retain saved study progress and preferences.

### Usability

- UI must support desktop and mobile browser layouts.
- Primary actions should be visible and reachable with minimal taps.
- Study completion states should feel rewarding and easy to understand.

### Accessibility

- Buttons should include accessible labels where applicable.
- Visual progress indicators should be paired with text labels.
- Pronunciation playback must complement text content. Text-based drills and lessons remain usable when speech synthesis is unavailable.

### Privacy

- No user account is required.
- User study data is stored in the browser and is not sent to an app-owned backend.

## 14. Limitations and scope boundaries

- No user authentication or cloud backup/sync
- Clearing browser data or switching browser, device, or site origin does not retain local progress
- Source data in `data/` has measured defects (section 18); affected content is excluded from graded pools until the data readiness gate passes
- Japanese pronunciation playback depends on browser speech synthesis and available voices
- Some UI copy and content are beginner-focused even when higher learner levels are selectable
- Content depth varies by level; N5 is the most curated

## 15. Future web improvements

These are outside the current release requirements:

- Grammar SRS and custom review decks
- Better answer normalization for long-form responses
- More nuanced proficiency analytics
- Import/export of local progress

## 16. Release criteria

The simplified web release is ready when:

- Users can open the app in desktop and mobile browsers without installing anything or creating an account.
- Dashboard navigation, all six drill modes, built-in grammar quizzes, JLPT practice, SRS review, and progress tracking work end to end.
- Bundled N5–N1 content has cleared the section 18 data readiness gate, with clear messaging that depth and curation vary by level.
- Progress and preferences survive a page reload in the same browser.
- Existing retained study data survives removal of the excluded features.
- Pronunciation uses browser speech synthesis, with a visible unavailable state when no Japanese voice is available.
- JLPT listening sets play the correct bundled audio for the correct question, with the remote-image and audio-aliasing defects from section 18 resolved.
- All excluded features in section 3 are removed from navigation, routes, settings, runtime dependencies, and release tooling, rather than hidden behind toggles.
- About accurately describes browser-local persistence and its limitations.
- The data readiness gate reports zero unresolved defects in the included pool: no Japanese text in a `romaji` field, no dictionary markers in accepted kanji answers, no truncated-prompt or null-key JLPT records in graded sets, and no unresolved remote-image dependencies.
- Content attribution and redistribution licensing are documented and cleared, or release is explicitly blocked with the reason recorded.

NihonCode is a self-directed practice app, not a complete guided JLPT curriculum.

## 17. Appendix: Feature inventory

Features in the simplified web scope:

- Dashboard with N5–N1 level selector and flagship daily routine
- Light/dark mode with accent color
- Kana selection and drill mode
- Kanji category browsing and drill mode (N5–N1)
- Vocabulary category browsing and drill mode (N5–N1)
- Number drill setup and practice
- Date/day drill setup and practice
- Conjugation drill setup and practice
- Built-in grammar library with quizzes (N5–N1)
- JLPT practice sets with five categories, bundled listening audio, and per-set progress
- FSRS-based SRS review with configurable new-card cap and learning-step skip
- SRS statistics page
- Progress page with XP, streaks, JLPT mastery, achievements, and weekly activity
- Kanji mastery map with per-character status
- Achievement toast notifications
- About page with local-first messaging and contact email

## 18. Data readiness and known defects

Measured by parsing all 43 JSON files under `data/` and checking every referenced audio file on disk. These are structural counts, not a certification that each Japanese reading or answer key is pedagogically correct. Remediation is sequenced in `implementation_plan.md` Phase 2.

### Verified inventory

| Asset | Count | Note |
|---|---:|---|
| Kana | 46 hiragana + 46 katakana | Basic gojuon only |
| Kanji entries | 2,212 | N5: 80, N4: 166, N3: 367, N2: 367, N1: 1,232 |
| Vocabulary entries | 7,938 | N5: 744, N4: 666, N3: 2,102, N2: 1,741, N1: 2,685 |
| Grammar lessons | 832 | 2,496 quiz questions total |
| JLPT exercise sets | 688 | 5,339 question records; `answer_index` is 1-based |
| Local listening MP3s | 184 | All exist, non-empty, valid MP3 header |
| practice_core.json | 775 records | Clean reverse index; all question IDs resolve to JLPT questions |

### Vocabulary `romaji` field (three distinct problems)

- Mislabeled field. 7,293 of 7,938 entries store Japanese text in `romaji`; 6,812 of those are an exact copy of `kana`. Only 643 entries (all N5) hold genuine Latin romaji. This is a field-content defect, fixable by regeneration or renaming.
- Semantic reading mismatch. Some entries pair a valid `kana` with a Latin `romaji` for a different sense (for example 一日 with `romaji: ichinichi` and `kana: ついたち`). Not quantified. Detecting it needs a kana-to-romaji normalizer plus human review; a character-class check cannot catch it.
- Packed alternatives. A few entries encode multiple readings in one string (`maitoshi / mainen`, `yoi/ii`, kana `いい; よい`). These need a structured variants list before exact-match grading or TTS.
- Also: 2 N4 entries have empty `kana` and `romaji` (かまう, ごらんになる); 8 entries put kanji in the `kana` field (7 N4, 1 N1).

### Kanji answers (dictionary markers)

- N4–N1 accepted-answer lists retain dictionary notation: 1,130 entries and 2,455 answer strings contain markers like `た.りる`, `-こ.む`, `-ネン`. N5 is clean. Display reading and accepted learner answers need separate normalization.

### Grammar (content curation)

- Structurally valid (every answer appears in its choices), with confirmed content defects: malformed answers marked correct (N3 としなら, N1 にかかっなら), generic non-discriminating fill-in-the-blank stems in N3/N2/N1, duplicate examples and instruction-as-example (N3 lesson id 8), and uninstantiated ～ notation used as an answer (N4 あまり～ない). N5 metadata is marked reviewed; N4–N1 are not. Lesson IDs restart at `1` per level and need namespacing.

### JLPT (structural defects and remote media)

- Remote images with no local copy: 927 question records across 182 sets, plus 108 passages, reference `japanesetest4you.com` image URLs.
- Truncated prompts: 33 records have the prompt `「` with the question fragment pushed into the choices; internal answer contradictions are confirmed (N1 reading 12, N3 reading 9, N2 reading 6, N2 vocabulary 3, N1 vocabulary 3).
- Missing keys: 5 N3 reading records have null `answer_index` and are scraped reference rows, not questions; 2 more reference rows carry keys but are not questions. The `number` field repeats within sets and is not a safe unique key.
- Empty-text passages: 4 (all N2 reading, `passage-3`, sets 13/17/21/31) depend entirely on a remote image to be answerable.
- Boilerplate passages: 2 (N3 reading sets 15 and 16) read "Click here to download this test for offline viewing."
- Wrong field: 5 MP3 URLs are stored in reading `image_urls` (N3 reading sets 15 and 16).
- Audio aliasing: 930 distinct source URLs map onto the 184 local MP3 paths; every local path is referenced by more than one source URL. Listening sets carry 4–7 audio references each (average 5.08) for about 5 questions. Whether each local file is one segment, a concatenation, or correctly matched to its questions is unverified. Listening playback does not ship until sampled sets are confirmed.

### Integration gaps

- `data/generated/index.ts` imports types from `../../types/content`, which does not exist in this repo. The loader is carried over from the prior app; its type contract must be recreated or the loader replaced.
- No content pipeline exists in the repo yet, despite section 11 requiring one.
- No consolidated attribution document. Per-file metadata names amgidex grammar lists, Tatoeba (CC BY 2.0 FR) example sentences, and japanesetest4you exercises and audio. Redistribution rights must be confirmed before public release.

### practice_core.json

- Validated clean: 775 records, `questionCount` always matches `questionIds.length`, and every ID resolves to an existing JLPT question. 130 IDs are shared across items, which is legitimate when one question tests a compound. This is a reverse index for kanji/vocab mastery, not Mastery Path data.
