---
version: 1
slug: "dashboard"
primary_target: "dashboard"
related_targets: []
---

# Surface brief: Dashboard (HOME)

Scope and visitor mode: Operate. The HOME surface: status strip, study-level row, daily routine card, practice modes grid, SRS statistics, grammar library, JLPT practice, progress, kanji mastery map, settings panel, left icon rail, bottom ticker/command bar. Full surface with phased states: panels for features deferred past MVP (JLPT practice, conjugation, kanji map beyond N5, achievements beyond basics) render locked or teaching-empty states, never dead tiles or holes in the grid.

Audience, job, action, proof: A self-motivated beginner (N5) on a desktop browser, mid-routine, wants one answer: what do I do right now? One action starts it. Secondary: N4-N1 learners checking progress. Proof is live local state, never decorative: due count and estimated minutes on the routine card, streak and XP in the status strip, SRS totals and mastery breakdown, weekly XP bars, JLPT mastery estimate, grammar lesson position. Every number on screen is true or an honest zero.

Chosen direction and memorable moment: Terminal console / command deck, pinned by the user's mockup.png as binding visual authority: hairline-bordered panels with corner ticks on a near-black ground, monospace UI face for labels and data, tracked uppercase micro-labels, one accent per semantic role (amber primary action, green mastered/success, blue learning/info, orange new/due, red critical), box-drawing and ASCII ornament (Fuji skyline, vertical margin Japanese, boot ticker, clock/coords stamp) as binding world elements per owner confirmation. Focal moment: the routine card CTA, the largest filled element in the first viewport.

Constraints: left icon rail owns navigation at 768px and above; below that the rail collapses and the bottom command bar becomes the nav (PRD). On desktop the bottom bar is status ticker plus [1]-[4] keyboard legend; keys jump sections. Motion is 150-250ms state feedback only; the ticker types once on load. Dark is default and primary target; light theme carries the same hairline grammar. Accent color user-selectable, touching primary action and selection only. No glass, gradient panel fills, rounded card shells, stock illustration, confetti gamification, or display serifs. Data gate binds: only clean-slice content enters drills. Implementation is code-led (no image generation in this harness); mockup.png rides to the finish review as the critique reference.

Open decisions: localStorage vs IndexedDB/Dexie for SRS state (PRODUCT.md); streak-flame glyph (icon-sized SVG vs box-drawing); ASCII skyline as committed text-art asset vs runtime-generated (asset preferred); exact mono and JP faces chosen at build by measurement.

## Direction contract

THESIS: The dashboard is an instrument panel of live readouts arranged around one focal action. It refuses the category-default grid of equal-weight marketing cards and the generic app-shell hero.

OWN-WORLD: Near-black ground, hairline panel borders with corner ticks, monospace UI face, tracked uppercase micro-labels, amber primary action with green, blue, orange, red semantic states, box-drawing and ASCII ornament. Recognizable with all content removed.

STORY: The learner reads today's obligation off live local state and starts it in one action. They believe the numbers because every readout is their own stored progress, and they return daily because the panel shows momentum.

FIRST VIEWPORT: Status strip across the top with brand, level, streak, XP, theme, sync. Left icon rail. Then the level selector, quote with ASCII Fuji skyline, and clock/coords stamp row. Then the routine card whose CTA is the largest filled element on screen, beside the practice modes grid and SRS statistics. Grammar, JLPT, and progress row below; kanji map and settings row last; bottom ticker bar with the [1]-[4] legend.

FORM: Pinned user reference mockup.png supplies both the visual world and the composition, honored under the brief-wins rule; no concept roll ran for this surface, a stated decision, because the user supplied the world as binding authority. The drill surface composition roll (seed ea55bcc0) covers the drill surface only.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
