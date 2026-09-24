---
version: 2
slug: "drill"
primary_target: "DrillPage / PoolMatrix / DrillSession"
related_targets: []
---

# Surface brief: Practice setup, practice and results

Mode: Operate. Updated 2026-09-22. Authority and delivery status: [reference map](../README.md). This replaces the historical launch brief for the approved redesign.

Reference the setup, practice and results views in mockups/app.js. Setup covers Kana, Kanji, Vocabulary, Numbers, Dates and Conjugation. Use the same eligible data as the session builder; display counts, controls, search and pagination honestly.

Kana shows character/romaji; kanji shows character, onyomi/kunyomi and meaning; vocabulary shows word, actual word reading and meaning, without invented per-word onyomi/kunyomi. Number/date previews derive from configured generators and label bounded examples as samples. Conjugation shows base form and generated example for the chosen form/class. Conjugation is available, not awaiting Phase 2.

The session has one clear question, position, answer control and submit action, then explicit correct/incorrect feedback with accepted readings/explanation where available. Preserve production grading and TTS fallback. Enter submits/advances; Esc confirms abort. Keep existing session lifecycle and navigation behavior; do not introduce a timer just because an old brief mentioned one.

Results use actual score, misses and awarded progress with retry and return-to-setup actions. No fabricated XP. A completed retry is a distinct activity session, while repeated saving of one completion is idempotent. Aborts do not contribute. Setup and results can remain states within the existing route.

Mobile keeps input/action reachable, matrices scroll within their panel, and disabled/empty/error states explain next steps. Production redesign integration shipped 2026-09-22; evidence in docs/quality.md "Redesign integration".
