---
name: Kita (キタ) — NihonCode
description: Approved HTML redesign; production integration shipped 2026-09-22
colors:
  ground: "#0a0a0c"
  panel: "#101014"
  ink: "#e8e6df"
  dim: "#aaa79f"
  line: "#323238"
  accent: "#f0a500"
  green: "#3ddc84"
  blue: "#4aa3ff"
  red: "#ff7770"
  heat-0: "#202026"
  heat-1: "#164c33"
  heat-2: "#247a48"
  heat-3: "#35ae66"
  heat-4: "#6ade92"
  ground-light: "#f4f2ec"
  panel-light: "#ebe8e0"
  ink-light: "#17161a"
  dim-light: "#625e55"
  line-light: "#b8b4ab"
  accent-light: "#925600"
  green-light: "#176c42"
  blue-light: "#225aa0"
  red-light: "#a32924"
  heat-0-light: "#deddd5"
  heat-1-light: "#b7dfb3"
  heat-2-light: "#75c47d"
  heat-3-light: "#359952"
  heat-4-light: "#176c42"
typography:
  title:
    fontFamily: "Cascadia Mono, Consolas, Liberation Mono, monospace"
    fontSize: "clamp(26px, 3vw, 38px)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-1px"
  heading:
    fontFamily: "Cascadia Mono, Consolas, Liberation Mono, monospace"
    fontSize: "19px"
    fontWeight: 500
  subheading:
    fontFamily: "Cascadia Mono, Consolas, Liberation Mono, monospace"
    fontSize: "15px"
    fontWeight: 500
  body:
    fontFamily: "Cascadia Mono, Consolas, Liberation Mono, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  none: "0px"
spacing:
  small: "12px"
  base: "16px"
  mobile-inline: "18px"
  roomy: "24px"
  desktop-page: "36px"
components:
  button:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "9px 14px"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ground}"
    rounded: "{rounded.none}"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
---

# Design System: Kita (キタ) — NihonCode

## Overview

**Creative North Star: "The Instrument Panel"**

Kita is a terminal-inspired study workspace: monospace readouts, hairline edges and a clear next action. The approved redesign gives each task its own readable layout rather than reproducing the original all-in-one dashboard.

This document extracts the target from `mockups/style.css` and the nine HTML views as of 2026-09-22. Production integration is pending. The demo uses illustrative data; production must use real local state or honest empty states. The old `mockup.png` and `.impeccable/review/*.png` are historical, not the current visual authority.

**Key Characteristics:**

- Square surfaces and hairline separators.
- Monospace hierarchy using size, weight and selective tracking.
- A labeled desktop rail and four-slot mobile navigation.
- Semantic green activity calendars and a four-axis participation overview.
- Readable task-specific layouts with honest empty and locked states.

## Colors

Frontmatter contains the exact mockup tokens. Light-suffixed entries override the corresponding dark roles; source CSS uses the same variable names under the light-theme root selector.

Signal Amber is the default primary action color; Green and Blue are the mockup's alternative selections. Success/activity Green, learning/info Blue and error Red remain semantic regardless of primary selection. Preserve additional production accent choices and warning/due semantics when integrating; the mockup is not permission to delete existing preferences.

Ground and Panel provide tonal separation, Ink and Dim separate primary/supporting text, Line carries dividers. The five Heat steps represent 0, 1, 2, 3, and 4+ completed sessions, not score or XP.

**The One Accent Rule.** Primary selection never recolors semantic status or activity intensity.

## Typography

One local monospace stack, with Japanese-capable system fallback. Title, heading and body roles are specified in frontmatter. Weight changes are intentional: the old all-400 restriction is retired. Mobile body is 13px; Japanese study prompts use the larger page-specific sizes in the mockup.

Use uppercase tracking for short utility labels, not all headings or explanatory copy. Do not apply the old universal tracked-caps rule to sentence-case page titles.

## Layout

Desktop uses a fixed 156px labeled rail and matching workspace offset. At widths up to 1100px the rail/offset become 110px and main padding becomes 26px. Below 768px the rail becomes a 66px bottom navigation bar and the workspace reserves that height.

Main content has a 1376px maximum width and 36px desktop padding. Mobile main padding is 24px vertically and 18px horizontally. Topbar and footer follow the same inline alignment. Each surface uses its own grid; do not replace the layouts with an equal-card auto-fit grid.

Home emphasizes the next study action; Progress spans the annual calendar; setup gives the pool matrix room; grammar prioritizes reading; practice reduces distractions. Long matrices/calendars scroll inside their panels. Production keeps existing routes and functional shortcuts; the mockup footer's preview selector and demo badges do not ship.

## Elevation & Depth

Flat surfaces, thin dividers and restrained corner accents create structure without shadows, glass or lifting cards. Feedback is visible border/color/focus state. Do not require a typing animation where the reference has none; any introduced motion stays within the existing 150–250ms state-feedback limit and respects reduced motion.

**The Flat-By-Default Rule.** Depth comes from layout, borders and tonal separation, not shadows.

## Shapes

Square corners are the target. The production taste guard's 4px ceiling is a maximum, not a request to round containers. Hairline dividers and small square calendar cells repeat the console geometry.

## Components

### Buttons and fields

Panel-filled native controls, square borders, at least 44px control height. Primary actions use accent fill and ground text. Focus uses a visible 2px accent outline with 4px offset. Disabled state remains distinguishable and explains unavailable actions. Inputs have persistent accessible labels.

### Navigation and panels

Labeled Home/Progress/Learn/Config rail with an accent left-edge selection marker; mobile uses four equal bottom slots with a top-edge marker. Panels use varied layouts, whitespace and small corner details where shown, not identical card shells everywhere.

### Contribution calendar

Home shows 91 days; Progress shows a selected calendar year. Seven Sunday–Saturday rows, week columns, month labels and Less–More legend. Expose exact date/count by hover/focus and selectable category detail. One roving tab stop, arrow navigation, contained mobile scrolling, future-day unavailable state and honest zero state. Activity green is independent of user accent.

### Activity quadrant

Fixed 0–100% axes: Drills left, SRS Review top, JLPT right, Grammar bottom. Thin green axes, visible points and restrained translucent fill accompany exact counts and one-decimal percentages from the same selected-year data as the calendar. Zero data means zero shares, not an invented polygon. This measures participation, never proficiency. PRD §10.13 owns counting and storage semantics.

### Pool matrix

Kana character/romaji; kanji onyomi/kunyomi/meaning; vocabulary word reading/meaning; generated number/date items or honestly labeled bounded examples; conjugation base/form examples. Keep controls, count and eligible session pool consistent. Paginate or contain long lists without clipping Japanese text.

### Practice, results and JLPT

One question and answer action, explicit grading feedback, next-step control and actual session summary. Typed drills and JLPT radio options share visual feedback, not a forced single input type. JLPT adds real level/category/set selection and per-set state; Listening/Reading retain owner gates. Mockup repeated questions and reset-on-reload behavior never become production logic.

### Grammar, settings and retained capabilities

Grammar combines readable examples and explanation with quiz/resume state. Settings rows wrap and preserve theme, accent, study preferences, export/import and About. Keep TTS unavailable state, achievements, kanji inspection, SRS review and the existing separate statistics route accessible even where the preview simplifies them.

## Do's and Don'ts

- Do use actual local state in production and explicitly label sample previews.
- Do preserve keyboard access, text-paired status and both themes.
- Do retain existing product capabilities absent from the simplified mockup.
- Don't introduce glass, gradients, rounded shells or decorative statistics.
- Don't copy preview controls, fixture history or historical screenshot layouts into production.
- Don't equate activity distribution with mastery or exam readiness.
