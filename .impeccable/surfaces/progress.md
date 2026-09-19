---
version: 1
slug: "progress"
primary_target: "progress"
related_targets: []
---

# Surface brief: Progress (PROGRESS route, incl. SRS statistics)

Scope and visitor mode: Operate. One surface owning XP, level, streak, today's XP, weekly activity (7-day bars), JLPT mastery estimate, achievements, the full interactive kanji mastery map, and the SRS statistics section (due today, learned cards, total cards, mastery %, mastered/learning/new breakdown, kanji vs vocabulary split). No separate SRS stats page; the dashboard SRS panel deep-links here. Phased states: achievements beyond basics render locked or empty-teaching rows in MVP; JLPT mastery shows honest zeros for levels with no studied material.

Audience, job, action, proof: The learner returns to answer one question: is my effort compounding? They scan readouts, drill into the kanji map, and leave motivated or redirected to review. Proof is their own stored history rendered as instruments: streak in days, XP totals, weekly bars from real daily totals, mastery percentages computed from SRS state and grammar completion, per-kanji attempts and accuracy. Every number is true or an honest zero; nothing decorative.

Chosen direction and memorable moment: Mission control telemetry stack, locked from the surface roll (seed b54cee39, dealt 3/6/1, lead taken). The page reads top-down like a console telemetry session: status strip, then a stacked telemetry column of live instrument panels (weekly bars, SRS gauge row with split bar, achievements ticker), and the kanji mastery map as one full-width interactive panel with level filter and a per-kanji inspector docked at its right. The memorable moment is the inspector: selecting a kanji in the grid reveals its readings, attempt count, accuracy, last seen, and status, making the mastered/learning/unseen computation inspectable rather than asserted.

Constraints: weekly bars only at launch (week/month/all-time switching and heat calendars are polish-phase candidates, not MVP). Console vocabulary inherited: near-black ground, hairline panels with corner ticks, monospace face, tracked uppercase micro-labels, semantic accent roles, box-drawing ornament. No glass, gradients, rounded card shells, confetti, or display serifs. Motion 150-250ms state feedback only. Keyboard reachable: map grid navigable by arrow keys with the inspector as live region. Data gate binds: map and stats render only clean-slice studied material in MVP.

Open decisions: exact mono and JP faces chosen at build by measurement; whether the achievements row links to a detail sheet or stays a ticker; inspector's link-out target (kanji drill setup prefilled vs read-only).

## Direction contract

THESIS: Progress is a telemetry session, a vertical stack of live instruments that read the learner's own history. It refuses the category-default grid of equal-weight stat cards and the decorative gamification wall.

OWN-WORLD: Near-black ground, hairline panel borders with corner ticks, monospace UI face, tracked uppercase micro-labels, amber primary action with green, blue, orange, red semantic states, box-drawing chart and grid ornament. Recognizable with all content removed.

STORY: The learner sees compounding effort as live readouts, trusts them because every value derives from their stored sessions, and drills into any kanji to inspect the computation behind its status.

FIRST VIEWPORT: Status strip across the top with streak, total XP, level, today's XP. Below it the weekly activity bar panel and the SRS gauge row with the mastered/learning/new split bar. The kanji mastery map panel begins within the first viewport on desktop with its inspector docked right; the achievements ticker closes the column.

FORM: Mission control telemetry stack, position 3 of 7 in the grounded ordered list (stats panel grid, ledger account book, mission control telemetry stack, streak calendar wall, report card transcript, mastery atlas, gauntlet ladder). Seed b54cee39, dealt 3, 6, 1; the roll's lead locked by the user.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
