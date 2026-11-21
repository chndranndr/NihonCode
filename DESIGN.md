---
name: Kita (キタ), NihonCode
description: Quiet Instrument direction approved and verified in production on 2026-11-20
colors:
  ground: "#141615"
  panel: "#1d201e"
  panel-soft: "#181b19"
  ink: "#eeeae1"
  dim: "#b2afa5"
  line: "#3a403b"
  control-edge: "#68706a"
  accent: "#e6b65c"
  on-accent: "#1b1c19"
  green: "#3ddc84"
  blue: "#4aa3ff"
  orange: "#ff8c42"
  red: "#ff7770"
  heat-0: "#252a26"
  heat-1: "#164c33"
  heat-2: "#247a48"
  heat-3: "#35ae66"
  heat-4: "#6ade92"
  ground-light: "#f5f2ea"
  panel-light: "#fffdf7"
  panel-soft-light: "#eeeae1"
  ink-light: "#24251f"
  dim-light: "#62645c"
  line-light: "#c6c8bc"
  control-edge-light: "#83877c"
  accent-light: "#925600"
  on-accent-light: "#fffdf7"
  green-light: "#176c42"
  blue-light: "#225aa0"
  orange-light: "#8e4600"
  red-light: "#a32924"
  heat-0-light: "#deddd5"
  heat-1-light: "#b7dfb3"
  heat-2-light: "#75c47d"
  heat-3-light: "#359952"
  heat-4-light: "#176c42"
typography:
  title:
    fontFamily: "Avenir Next, Segoe UI, Noto Sans JP, system-ui, sans-serif"
    fontSize: "clamp(30px, 3vw, 40px)"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  heading:
    fontFamily: "Avenir Next, Segoe UI, Noto Sans JP, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
  subheading:
    fontFamily: "Avenir Next, Segoe UI, Noto Sans JP, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: "Avenir Next, Segoe UI, Noto Sans JP, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  reading:
    fontFamily: "Avenir Next, Segoe UI, Noto Sans JP, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.75
  supporting:
    fontFamily: "Avenir Next, Segoe UI, Noto Sans JP, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
  utility:
    fontFamily: "Cascadia Mono, Consolas, Liberation Mono, monospace"
    fontSize: "12px"
    fontWeight: 400
    letterSpacing: "0.08em"
  display-sm:
    fontFamily: "Avenir Next, Segoe UI, Noto Sans JP, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 500
  study-prompt:
    fontFamily: "Avenir Next, Segoe UI, Noto Sans JP, system-ui, sans-serif"
    fontSize: "clamp(64px, 10vw, 104px)"
    fontWeight: 500
rounded:
  none: "0px"
  control: "3px"
  panel: "4px"
spacing:
  small: "12px"
  base: "16px"
  mobile-inline: "18px"
  roomy: "24px"
  intermediate-page: "26px"
  desktop-page: "36px"
components:
  button:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    minHeight: "44px"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
  input:
    backgroundColor: "{colors.panel-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    minHeight: "44px"
  speaker:
    backgroundColor: "{colors.panel-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    minHeight: "44px"
    minWidth: "44px"
---

# Design System: Kita (キタ), NihonCode

## Overview

**Creative North Star: "Quiet Instrument"**

Kita is a calm Japanese study workspace: warm tonal surfaces, humanist reading typography, monospace readouts, hairline edges, and a clear next action. Quiet Instrument evolves the existing instrument-panel identity rather than replacing it with a generic application template.

This document records the owner-approved direction in the [Quiet Instrument design specification](docs/superpowers/specs/2026-11-20-quiet-instrument-ui-revamp-design.md). Production integration was implemented and verified on 2026-11-20. The nine HTML mockups remain historical structural references where their layouts and behavior are retained, but this document supersedes their earlier palette, typography, shape, and motion tokens. Preview data is illustrative; production uses real local state or honest empty states. The old `mockup.png` and `.impeccable/review/*.png` are historical, not the current visual authority.

**Design Read:** A desktop-first Japanese study workspace for self-directed learners, using a warm instrument-panel language with ENERGY 2, RHYTHM 2, and MOTION 1.

**Key Characteristics:**

- Warm green-grey charcoal in dark mode and warm paper in light mode.
- Humanist sans for reading, with monospace reserved for levels, counts, and compact utility labels.
- Four-pixel panel corners, three-pixel control corners, and hairline separators.
- A labeled desktop rail and four-slot mobile navigation.
- Semantic green activity calendars and a four-axis participation overview.
- Task-specific layouts with honest empty, loading, error, disabled, and populated states.
- Labeled pronunciation controls beside Japanese drill prompts and curated grammar examples.

## Colors

Frontmatter contains the target tokens. Light-suffixed entries override the corresponding dark roles; source CSS uses the same variable names under the light-theme root selector. All production colors remain in `:root` or the existing theme scopes, never as hardcoded component values or inline JSX styles.

Signal Amber is the default primary action color. Green, Blue, Orange, and Red remain available as user-selected accents. Success/activity Green, learning/info Blue, and error Red remain semantic regardless of primary selection. Preserve warning/due semantics and all existing theme persistence behavior.

Ground, Panel, and Panel Soft provide tonal separation. Ink and Dim separate primary and supporting text. Line carries dividers and panel edges. Control Edge outlines what must be found at a glance, text fields and calendar day cells, at 3:1 against every surface in both themes; hairlines stay for structure. On Accent supplies explicit foreground text for filled primary actions instead of assuming that the page ground is suitable. The five Heat steps represent 0, 1, 2, 3, and 4+ completed sessions, not score or XP.

**The One Accent Rule.** Primary selection never recolors semantic status or activity intensity.

All final text, control, status, focus, hover, active, and disabled combinations must meet WCAG AA: 4.5:1 for normal text and 3:1 for large text and meaningful graphical controls. Verify both themes and every accent in the browser.

## Typography

Use two local stacks with Japanese-capable system fallbacks. The humanist sans stack carries headings, navigation, explanations, buttons, and study reading. The monospace stack carries levels, counts, progress values, and compact utility labels. No remote font dependency is added.

Title, heading, body, reading, supporting, utility, and study-prompt roles are specified in frontmatter. Interface body is 15px, grammar reading is 17px, supporting copy is 13px, and utility text does not drop below 12px. Japanese drill prompts scale from 64px to 104px according to content and viewport. The 24px display-sm step sits between heading and title: Japanese glyphs in tiles, grammar examples and formulas, JLPT question text, readout figures, and compact mobile headlines. Focal glyphs and large figures use the 30px title floor; result scores use 64px (40px on mobile). Every font size in production CSS is one of these steps, written in px or its rem equivalent (16px root); reading text that must grow with the reader's text-size setting, such as JLPT questions and explanations, uses rem.

Use uppercase tracking only for short utility labels, never for headings or explanatory copy. Long Japanese and English text wraps naturally without clipping or horizontal page overflow.

## Layout

Desktop uses a fixed 156px labeled rail and matching workspace offset. At widths up to 1100px the rail/offset become 110px and main padding becomes 26px. Below 768px the rail becomes a 66px bottom navigation bar and the workspace reserves that height.

Main content has a 1376px maximum width and 36px desktop padding. Mobile main padding is 24px vertically and 18px horizontally. Topbar and footer follow the same inline alignment. Each surface uses its own grid; do not replace the layouts with an equal-card auto-fit grid.

Home emphasizes the next study action; Progress spans the annual calendar; setup gives the pool matrix room; grammar prioritizes reading; practice reduces distractions. Long matrices and calendars scroll inside their panels. Production keeps existing routes, browser back behavior, lazy loading, and functional shortcuts.

The decorative ticker is removed. Retain a concise local-data note and the keyboard legend where space allows. The mockup footer's preview selector and demo badges do not ship.

## Elevation & Depth

Flat surfaces, thin dividers, tonal panels, and restrained registration-corner details create structure without shadows, glass, gradients, glow, or lifting cards. Use the corner motif on focal study surfaces rather than stamping it on every container.

Feedback uses visible border, text, shape, and focus states. Nonessential state-only transitions last 160ms and respect reduced motion. There is no typing-animation requirement, scroll choreography, ambient movement, or confetti.

**The Flat-By-Default Rule.** Depth comes from layout, borders, and tonal separation, not shadows.

## Shapes

Panels may use a 4px radius and controls a 3px radius. The production taste guard's 4px ceiling remains a maximum, not a request to round every container. Do not make buttons, fields, badges, and panels pill-shaped. Hairline dividers and small square calendar cells repeat the console geometry.

## Components

### Buttons and fields

Use native controls with panel-filled surfaces, hairline borders, and at least 44px targets, including standalone text links and back links. Focal primary actions and answer fields use 48px heights where appropriate. Primary actions use accent fill and explicit on-accent text. Secondary actions use surface and border contrast. Inputs have persistent visible labels.

Focus uses a visible 2px accent outline with 4px offset. Hover, active, focus, and disabled states differ through border, text, shape, or opacity in addition to color. Enabled controls show `cursor: pointer`; disabled controls show `cursor: not-allowed` and explain genuinely unavailable actions. Dead controls are removed.

### Navigation and panels

Use the labeled Home/Progress/Learn/Config rail with an accent left-edge selection marker; mobile uses four equal bottom slots with a top-edge marker. Selection never relies on color alone. The top bar carries the active study level (JLPT N5) and the local-data note; it never repeats the page name, which the rail and heading already give.

Page headings stand alone: no eyebrow label sits above an `h1`. A fact that belongs with the heading, such as a grammar category or a JLPT set number, sits beneath it as a dim mono meta line (`.page-meta`). An e2e test fails on a label directly above a page heading. Panels use varied layouts, whitespace, and small corner details where appropriate, not identical card shells everywhere.

### Pronunciation and listening

Reuse the existing shared SpeakerButton for drill prompts, SRS prompts, and every curated Japanese grammar example. Available controls show a speaker icon and the visible label **Listen**. Unavailable controls show **Audio unavailable**, remain disabled, and retain a visible reason. Accessible names contain the visible label plus the prompt or example context.

The control remains at least 44px in both dimensions, keyboard operable, and readable on mobile. Existing voice detection, playback, error recovery, and `role="status"` feedback remain intact. Text study continues when audio is unavailable. JLPT Listening retains its bundled native audio player; TTS is not substituted for recorded listening material.

### Contribution calendar

Home shows 91 days; Progress shows a selected calendar year. Seven Sunday–Saturday rows, week columns, month labels, and Less–More legend. Expose exact date/count by hover/focus and selectable category detail. One roving tab stop, arrow navigation, contained mobile scrolling, future-day unavailable state, and honest zero state. On coarse pointers each day keeps its small visual square but sits on a 24px pitch with an invisible 24px hit area; a calendar wider than its box opens scrolled to the current week. Activity green is independent of user accent.

### Activity quadrant

Fixed 0–100% axes: Drills left, SRS Review top, JLPT right, Grammar bottom. Thin green axes, visible points, and restrained translucent fill accompany exact counts and one-decimal percentages from the same selected-year data as the calendar. Zero data means zero shares, not an invented polygon. This measures participation, never proficiency. PRD §10.13 owns counting and storage semantics.

### Pool matrix

Setup leads with its options, question count, and START, then the pool, so the start action is in the first viewport. Kana character/romaji; kanji onyomi/kunyomi/meaning (a katakana segment, spaces allowed, is on'yomi); vocabulary word reading/meaning; generated number/date items or honestly labeled bounded examples; conjugation base/form examples. Keep controls, count, and eligible session pool consistent. Paginate or contain long lists without clipping Japanese text.

### Practice, results, and JLPT

One question and answer action, explicit grading feedback, next-step control, and actual session summary. The answer region remains stable through input, feedback, grading, and next-item transitions. Typed drills and JLPT radio options share visual feedback, not a forced single input type. Completion uses real score, count, XP, and answer review without confetti or invented praise.

The answer label names what to type in exactly the script the grader accepts ("reading in kana or romaji"), linked as the field description; format-heavy answers show an example placeholder. Feedback recolors the reveal panel's own hairline green or red, never a side stripe, and a miss echoes what was typed. The summary puts its actions directly under the score: with misses, RETRY MISSES leads; stats include XP earned; the review table lists misses first with a text verdict. A score takes the accent only at 60% or above; below that it stays plain ink.

Sessions are keyboard-complete. JLPT options answer to A–D and 1–4 (no modifiers, so Alt+1–4 navigation is untouched); after an answer, focus moves to NEXT so it scrolls into view and Enter advances, and each new question focuses its prompt. Drills and JLPT sets show a visible EXIT SESSION; Escape toggles the leave confirm, which focuses its keep-practising action.

JLPT adds real level/category/set selection and per-set state. Reading and Listening reserve media space and retain owner gates. Mockup repeated questions and reset-on-reload behavior never become production logic.

### Grammar, settings, and retained capabilities

Grammar combines a comfortable long-form reading measure, readable examples, explanation, pronunciation, and quiz/resume state. Settings rows wrap and preserve theme, accent, study preferences, export/import, local-data limits, attribution, and About. Keep achievements, kanji inspection, SRS review, and the existing separate statistics route accessible even where a preview simplifies them.

## UI states

- **Loading:** Keep the shell stable, reserve asynchronous content space, and expose a textual loading indicator with `role="status"`.
- **Empty:** Show real zero values and a useful next action where appropriate. Never use decorative activity, sample achievements, or fictional progress.
- **Error:** Preserve navigation and explain the failure in the relevant content region. Retry appears only when connected to real recovery behavior.
- **Disabled:** Keep the label and reason legible. Optional audio failure never blocks text study.
- **Populated:** Use actual local state and validated content, with stable namespaced IDs and existing progress references.
- **Announcements:** Achievement toasts sit bottom-right, clear of page heads and result stats, and above the bottom navigation on phones.

## Accessibility and motion

Preserve landmarks, one logical `h1` per view, hierarchical headings, page titles, language metadata, and zoom support. Preserve logical Tab and Shift+Tab order, Enter and Space activation, Escape for dialogs, and Alt+1 through Alt+4 navigation. Images retain appropriate alt text and form fields retain visible labels.

Verify 320px, 390px, 768px, intermediate, and wide desktop layouts without overflow, clipping, collision, or inaccessible navigation. Status, correctness, selection, and progress never rely on color alone. Remove nonessential transitions under `prefers-reduced-motion: reduce`. The stored theme and accent apply before first paint (inline bootstrap in `index.html`), and control color transitions are held while the theme or accent repaints, so neither flashes nor lags. Any essential ongoing motion requires a pause mechanism.

## Do's and Don'ts

- Do use actual local state in production and explicitly label sample previews.
- Do preserve keyboard access, text-paired status, both themes, and all five accents.
- Do retain existing product capabilities absent from simplified previews.
- Do keep pronunciation visible and understandable beside Japanese study text.
- Don't introduce glass, gradients, rounded shells, decorative statistics, or a decorative ticker.
- Don't copy preview controls, fixture history, or historical screenshot layouts into production.
- Don't equate activity distribution with mastery or exam readiness.
- Don't change routes, study mechanics, persistence, content loaders, or product scope for a visual revamp.
