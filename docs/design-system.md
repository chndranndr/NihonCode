# Design System

## Authority and delivery status

The approved redesign is implemented in `mockups/index.html`, `mockups/style.css`, and `mockups/app.js` and integrated into production `src/` (2026-09-22): shell, tokens, all nine views, contribution calendars and the activity quadrant run on stored completions. Sample data and preview controls are not product requirements.

Use this order: PRD for behavior and non-goals; the latest HTML mockup for visual composition; [DESIGN.md](../DESIGN.md) for extracted tokens and reusable patterns; [.impeccable surface briefs](../.impeccable/README.md) for page contracts. [UI_IMPLEMENTATION_PROMPT.md](../UI_IMPLEMENTATION_PROMPT.md) governs integration and verification. The original `mockup.png` and old review screenshots are historical references, not competing redesign authority.

## Visual grammar

Terminal console / command deck: near-black dark default, warm-paper light variant, monospace text, square surfaces, hairline dividers, restrained corner details and ASCII Fuji ornament where shown in the mockup. Use the mockup's labeled navigation rail and spacious, differentiated page layouts, not the original icon-only dashboard composition.

Primary accent is selectable. Green success/activity, blue learning/info and red error roles do not follow that selection. Existing due/warning semantics remain available; do not remove production states merely because sample data omits them. DESIGN.md owns exact target values and layout measurements.

No glass, gradient panel fills, rounded shells, stock illustrations, confetti or display serifs. No decorative invented statistics. No inline JSX styles or hardcoded CSS colors outside `:root`; use CSS tokens and classes. Keep layer boundaries, native controls and existing dependencies.

## Interaction and responsive contracts

Desktop rail is 156px, reduced to 110px at widths up to 1100px. Below 768px use the four-slot bottom navigation. Content is capped at 1376px with 36px desktop padding, 26px intermediate and 18px horizontal mobile padding. Retain production URLs, browser back and keyboard shortcuts without intercepting text input.

Controls have visible focus and clear disabled/loading/error/empty states. Primary controls target at least 44px height. Dense calendar cells use roving keyboard focus plus touch-selectable details. Long tables and annual calendars scroll within their panels; no page overflow. Text and Japanese glyphs must remain legible in both themes.

Enter submits/advances drills; Esc confirms exit. Feedback remains text-paired and screen-reader accessible. TTS absence never blocks text practice. Avoid decorative motion; any added state feedback follows the existing 150–250ms limit and reduced-motion preference. Do not invent a mandatory typing ticker where the mockup has none.

## Study activity

PRD §10.13 owns the full data contract. Home displays 91 days through today; Progress displays the selected year and its activity overview. Seven Sunday–Saturday rows, week columns, month/day labels, green 0/1/2/3/4+ completed-session bins, exact-count inspector and legend.

All levels contribute. Available years come from history plus the current year. Future dates are unavailable. One completed session counts once; retries are separate sessions, aborted runs and individual answers are not contributions. Production needs stable completion IDs and captured local dates; unavailable legacy detail must not be fabricated from XP.

The overview has equal fixed 0–100% axes: Drills left, SRS Review top, JLPT right, Grammar bottom. Restrained green polygon and visible points accompany exact counts and one-decimal shares. Zero sessions means zero shares and an empty state. This is participation, not proficiency or a target balance.

## Components and surfaces

Shared target patterns: labeled navigation, routine panel, metric readout, pool matrix, contribution calendar, activity quadrant, typed-answer dock, JLPT radio options, answer feedback, results summary, grammar reading layout, and settings rows.

See [.impeccable/README.md](../.impeccable/README.md) for all nine view mappings plus retained About/review/statistics obligations. Keep actual eligible pools, grading, SRS, achievements, export/import, preferences and owner-gated JLPT categories intact.

## Verification

Use the existing checks and browser eval documented in [development.md](development.md). Compare all production views with the mockup at desktop, tablet and mobile widths, both themes; exercise real completion and reload/backup flows. Mockup checks prove only the reference demo. Production evidence is recorded in [quality.md](quality.md) (integration row, 2026-09-22).
