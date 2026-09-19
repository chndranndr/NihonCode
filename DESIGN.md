---
name: Kita (キタ) — NihonCode
description: Terminal console / command deck for local-first Japanese practice
colors:
  ground: "#0a0a0c"
  panel: "#101014"
  hairline: "#2a2a30"
  ink: "#e8e6df"
  ink-dim: "#8a887f"
  accent-primary: "#f0a500"
  accent-success: "#3ddc84"
  accent-info: "#4aa3ff"
  accent-due: "#ff8c42"
  accent-critical: "#ff4d4d"
  ground-light: "#f4f2ec"
  panel-light: "#ebe8e0"
  ink-light: "#17161a"
  ink-dim-light: "#6b6960"
  hairline-light: "#c9c5ba"
typography:
  display:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, Menlo, monospace"
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.2em"
  prompt:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, Menlo, monospace"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1.3
  title:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, Menlo, monospace"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.3
  heading:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, Menlo, monospace"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.3
  cell:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, Menlo, monospace"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.2
  micro:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    letterSpacing: "0.2em"
  key:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, Menlo, monospace"
    fontSize: "0.7rem"
    fontWeight: 400
  body:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, Menlo, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, Menlo, monospace"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, Menlo, monospace"
    fontSize: "0.625rem"
    fontWeight: 400
    letterSpacing: "0.3em"
rounded:
  none: "0px"
  max: "4px"
spacing:
  tight: "0.5rem"
  base: "1rem"
  roomy: "1.5rem"
components:
  button:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.5rem 1rem"
  button-primary:
    backgroundColor: "{colors.accent-primary}"
    textColor: "{colors.ground}"
    rounded: "{rounded.none}"
    padding: "0.5rem 1rem"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1rem"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.75rem"
---

# Design System: Kita (キタ) — NihonCode

## Overview

**Creative North Star: "The Instrument Panel"**

Kita renders study as telemetry. The learner opens a command deck, not a course catalog: near-black ground, hairline panels with corner ticks, monospace readouts, tracked uppercase micro-labels, and one focal action that answers "what do I do right now". Every number on screen is the learner's own stored state or an honest zero; nothing is decorative. Density is instrument-like — tight groups inside panels, generous separation between them — and the world stays recognizable with all content removed.

Dark is the default and the primary target (owner-confirmed); light carries the identical hairline grammar, never a separate aesthetic. The accent is user-selectable but touches the primary action and selection only; semantic roles keep their own fixed accents so status is readable at a glance.

**Key Characteristics:**

- Hairline-bordered panels with accent corner ticks; no rounded shells, no glass, no gradients.
- Monospace everything: labels, data, and body share one stack; tracking and case carry hierarchy.
- One accent per semantic role: amber primary, green mastered, blue learning, orange new/due, red critical.
- ASCII ornament as iconography: bracketed rail glyphs, typed ticker, box-drawing flourishes.
- Locked and empty states teach; dead tiles never ship.

## Colors

A two-ground neutral system (near-black dark, warm paper light) with five fixed semantic accents.

### Primary

- **Signal Amber** (#f0a500): the primary action and the user-selectable accent. Largest filled element on any screen; rarity is the point.

### Secondary

- **Mastered Green** (#3ddc84): success verdicts, mastered kanji cells, licensed source status.
- **Learning Blue** (#4aa3ff): in-progress states, learning kanji cells.
- **Due Orange** (#ff8c42): new/due counts, LOCKED tags, pending clearance.
- **Critical Red** (#ff4d4d): wrong verdicts, critical alerts.

### Neutral

- **Ground** (#0a0a0c): page background, dark default.
- **Panel** (#101014): panel fill, input fill.
- **Hairline** (#2a2a30): every border, divider, and progress track.
- **Ink** (#e8e6df): body and prompt text.
- **Ink Dim** (#8a887f): micro-labels, secondary readouts (7.1:1 on ground).

### Named Rules

**The One Accent Rule.** `--accent` rebinds the user's chosen hue for primary action and selection only; semantic roles never follow it.

**The Hairline Rule.** Every structural edge is 1px `--hairline`. Depth comes from ground/panel tonal steps and corner ticks, never from shadows or fills.

## Typography

**Display Font:** ui-monospace stack (Cascadia Mono, Consolas, Menlo)
**Body Font:** same stack
**Label Font:** same stack, tracked uppercase

**Character:** One voice, three registers. Hierarchy comes from size, tracking, and case — never from a second family or weight play.

### Hierarchy

- **Display** (400, 3rem, 1.2, 0.2em tracking): brand mark and summary scores.
- **Prompt** (400, 2rem, 1.3): drill prompts and inspector characters.
- **Title** (400, 1.5rem, 1.3): lesson and surface titles.
- **Heading** (400, 1.25rem, 1.3): panel-group headings.
- **Cell** (400, 1rem, 1.2): kanji map glyphs; legibility at study size is the floor.
- **Body** (400, 14px, 1.5): explanations, reasons, examples; measure capped by panel width.
- **Small** (400, 0.8rem, 1.4): secondary translations under examples.
- **Micro** (400, 0.75rem, 0.2em, uppercase): tracked micro buttons and bar links.
- **Key** (400, 0.7rem): bottom-bar key legend.
- **Label** (400, 0.625rem, 0.3em, uppercase): panel titles, status strip, buttons.

### Named Rules

**The Tracked Caps Rule.** Micro-labels are always uppercase with 0.3em tracking; body copy is never tracked.

## Layout

Two-column frame at ≥768px: 56px icon rail + content column capped at 1200px. Below 768px the rail collapses and the bottom bar becomes navigation; the ticker and key legend disappear with it. Content grids use `repeat(auto-fit, minmax(280px, 1fr))` so panels reflow without bespoke breakpoints. Rhythm: 0.5rem inside groups, 1rem between panels, 1.5rem page padding.

## Elevation & Depth

No shadows anywhere. Depth is tonal: ground → panel → ink, plus accent corner ticks that frame each panel. Hover and focus states shift border color to the accent; nothing lifts.

### Named Rules

**The Flat-By-Default Rule.** `box-shadow` does not exist in this system. State feedback is border and color only, 150–250ms.

## Shapes

Square corners (0px) as the form language; 4px is the mechanical ceiling enforced by `check-taste`. Borders are 1px hairlines; panels add two accent corner ticks via pseudo-elements. No clipping, no masks, no rounded pills.

## Components

### Buttons

- **Shape:** square (0px)
- **Primary:** accent fill, ground text, tracked caps, 0.5rem 1rem
- **Hover / Focus:** hairline → accent border; focus-visible 1px accent outline at 2px offset
- **Secondary:** transparent fill, hairline border, ink text; `aria-current` pages take accent border + text

### Panels

- **Corner Style:** square with accent ticks top-left and bottom-right
- **Background:** panel on ground
- **Border:** 1px hairline
- **Internal Padding:** 1rem

### Inputs

- **Style:** 1px hairline, panel fill, square
- **Focus:** accent caret + focus-visible outline
- **Disabled:** ink-dim text, not-allowed cursor (speaker N/A)

### Navigation

- Desktop: icon rail with bracketed ASCII glyphs; bottom bar is ticker + [1]–[4] key legend.
- Mobile: bottom bar nav buttons in tracked caps; active page takes accent border.
- Links: ink text with hairline underline (3px offset); hover shifts text and underline to the accent.

### Speaker (signature)

- Available: `TTS` label button; unavailable: disabled `N/A` with the reason in title/aria-label. Text study never blocks on audio.

### Kanji Mastery Map (signature)

- Grid of square cells; unseen = ink-dim, learning = blue border, mastered = green border. Arrow-key navigable; docked inspector is a live region.

### Achievement Ticker

- Locked and unlocked rows in one list: open square locked, filled square unlocked, requirement text in the row title so a locked row teaches.

### Coverage Readout

- Percentage of the clean-slice pool (learned cards plus completed lessons), always paired with the sentence that it is not an exam-competence estimate.

### Setting Row

- Label plus controls on one line; the row wraps inside its panel so a six-choice accent group never overflows the hairline border.

## Do's and Don'ts

### Do:

- **Do** keep every readout live local state or an honest zero.
- **Do** teach with locked and empty panels: title, tag, one-sentence reason.
- **Do** pair every visual progress indicator with text.
- **Do** theme browser surfaces (selection, caret, scrollbars) from the palette.

### Don't:

- **Don't** round a shell past 4px or add glass, gradients, or shadows.
- **Don't** let the user accent leak into semantic roles.
- **Don't** ship a dead tile, a spinner inside content, or a kicker above a heading.
- **Don't** introduce a second type family or an icon font; the world's lettering is its iconography.
