---
version: 1
slug: "drill"
primary_target: "drill"
related_targets: []
---

# Surface brief: Drill (setup, session, summary)

Scope and visitor mode: Operate. The full drill surface: six per-mode setup screens (kana, kanji, vocabulary, numbers, dates, conjugation), one shared session engine, one completion summary. Phased states: conjugation setup renders locked until Phase 2 metadata lands; kanji and vocabulary setups list only clean-slice groups in MVP. Inherits the dashboard's console world; no new identity.

Audience, job, action, proof: A learner mid-routine picks a mode, configures it in one screen, and runs a sub-five-minute session. The job is recall under low friction: type the reading, get graded, learn from the miss. Proof is the session's own numbers: position, score, XP awarded on completion, and a miss list that teaches. Content ranges: kana 10-92 items, kanji/vocab drills 10-50 from a selected group, numbers 1-999,999, dates with configurable year range, conjugation forms from tagged N5 vocab (locked in MVP).

Chosen direction and memorable moment: Instrument channel, locked from the surface roll (seed ea55bcc0, dealt 6/3/5, lead taken). The session is one focused measurement loop: status rail, prompt plate, input dock. The memorable moment is the reveal flip: the plate turns in place and teaches every script, the meaning, and the speaker; a miss adds every accepted reading and the entry's group or category from real data.

Constraints: session contract confirmed by the owner. Enter submits; graded reveal; Enter advances; Esc aborts with confirm; XP on completion only; no mid-session resume; retry reshuffles. Keyboard-first on desktop; input dock stays reachable on mobile. Console vocabulary hand-built in CSS Modules and CSS variables; no component library; no glass, gradients, rounded card shells, or display serifs. Japanese-capable face chosen at build by measurement, not now. TTS unavailable keeps drills usable with a visible state. Data gate binds: only clean-slice content enters a drill.

Open decisions: exact mono and JP faces; whether summary misses link to an inline item review or stay list-only; setup preview lists cap and paginate long groups.

## Direction contract

THESIS: The drill session is one instrument channel, a status rail, one prompt plate, one input dock, a focused measurement loop. It refuses the category-default flashcard stack and the quiz card grid.

OWN-WORLD: Near-black ground, hairline panel borders with corner ticks, monospace UI face, tracked uppercase micro-labels, amber primary action, green, blue, orange, red semantic states, box-drawing ornament. Recognizable with all content removed.

STORY: The learner sees position and elapsed time, answers one item, the plate flips to teach every script, the meaning, and the speaker, and on a miss every accepted reading. Enter advances. The summary readout proves the session in numbers.

FIRST VIEWPORT: Status rail across the top with position, mode, timer, and session dots. Prompt plate centered at display scale. Input dock pinned at the bottom with the NihonCode:-> prompt and speaker control. No nav chrome beyond the rail. The primary action is the input itself.

FORM: Instrument channel, position 6 of 7 in the grounded ordered list (flashcard stack, quiz board, exam sheet, split console, terminal prompt loop, instrument channel, gauntlet ladder). Seed ea55bcc0, dealt 6, 3, 5; the roll's lead locked by the user.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
