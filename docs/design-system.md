# Design System

## Authority and delivery status

Quiet Instrument is implemented across the production application shell and study, progress, configuration, and informational views, and verified through static checks, unit and browser suites, and an element-by-element production click-through.

Use this authority order: [PRD.md](../PRD.md) for behavior and non-goals; [PRODUCT.md](../PRODUCT.md) for product and brand commitments; [DESIGN.md](../DESIGN.md) for the approved visual direction, exact tokens, and interaction and state rules. The earlier HTML mockups and surface briefs are retired (docs/decisions.md 2026-11-23); they do not override the approved revamp.

## Design Read and dials

Reading this as a desktop-first Japanese study workspace for self-directed learners, using a warm instrument-panel language with ENERGY 2, RHYTHM 2, and MOTION 1.

- **ENERGY 2:** Warm color, confident typography, and one clear action make the workspace welcoming without promotional spectacle.
- **RHYTHM 2:** The shell remains consistent while study, reading, setup, progress, and configuration screens use compositions suited to their tasks.
- **MOTION 1:** Motion is limited to brief state feedback, hover, focus, answer feedback, and existing achievement notifications. Scroll choreography, ambient animation, confetti, and decorative movement do not belong.

## Visual decisions and reasons

| Decision                                                  | Purpose                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Warm green-grey charcoal and warm paper themes            | Make long study sessions feel calm and comfortable in both lighting contexts.               |
| Humanist sans reading type                                | Keep Japanese and English explanations readable without a terminal aesthetic.               |
| Monospace utility values                                  | Make levels, counts, and compact readouts easy to scan without turning all copy into code.  |
| Tonal surfaces and hairlines                              | Establish hierarchy through separation rather than shadows or floating cards.               |
| Three-pixel controls and four-pixel panels                | Retain precise instrument geometry without sharp brutality or pill-shaped defaults.         |
| Sparse registration corners on focal study surfaces       | Repeat a specific identity motif without decorating every container.                        |
| One primary action per focal region                       | Make the next step clear without urgency, praise, or competing calls to action.             |
| Visible Listen controls                                   | Make pronunciation discoverable and understandable without relying on an unexplained icon.  |
| Structural whitespace and task-specific grids             | Give reading, practice, setup, and telemetry the space and composition their content needs. |
| Real zero, loading, error, disabled, and populated states | Keep the interface honest and usable outside the ideal path.                                |

## Color, type, and shape

[DESIGN.md](../DESIGN.md) owns exact values. Dark mode uses warm green-grey surfaces; light mode uses coordinated paper surfaces. Amber is the default selectable accent, with green, blue, orange, and red also available. Accent selection does not recolor semantic success, learning, error, warning, or activity intensity. Filled actions always use the explicit on-accent foreground.

The local humanist stack is `"Avenir Next", "Segoe UI", "Noto Sans JP", system-ui, sans-serif`. It carries headings, navigation, controls, explanations, and study reading. The local monospace stack carries levels, counts, progress values, and short utility labels. No remote font dependency is allowed.

Interface body copy is 15px, grammar reading is 17px, supporting copy is 13px, and utility text does not drop below 12px. Japanese drill prompts scale from 64px to 104px; grammar examples use approximately 24px to 25px. Uppercase tracking is limited to short utility labels. Long text wraps naturally.

Panels may use a 4px radius and controls a 3px radius. These are maxima, not instructions to round every element. No glass, gradient panel fills, glow, large shadows, rounded shells, stock illustrations, confetti, or decorative ticker. Colors live in the root or theme scopes; components use tokens and classes rather than inline JSX styles or hardcoded colors.

## Layout and navigation

Desktop uses a fixed 156px labeled rail and matching workspace offset. At widths up to 1100px the rail and offset become 110px and main padding becomes 26px. Below 768px, four equal bottom navigation slots replace the rail. Main content is capped at 1376px with 36px desktop padding and 18px mobile inline padding.

Mobile content reserves 66px plus `env(safe-area-inset-bottom, 0px)` for the bottom rail, with matching scroll padding and scroll margin. This prevents focused fields and final controls from being hidden behind navigation.

Home emphasizes the next study action. Progress gives the annual calendar room. Setup preserves the eligible-pool matrix. Grammar prioritizes long-form reading. Practice reduces distractions. Settings uses readable rows, and About uses restrained section separators. Do not replace these compositions with an equal-card auto-fit grid.

Long matrices and annual calendars scroll inside their panels. Production routes, browser Back behavior, lazy loading, and Alt+1 through Alt+4 shortcuts remain intact.

## Controls and interaction

Use native controls with visible text labels, hairline borders, and targets of at least 44px. Focal primary actions and answer fields use 48px where appropriate. Focus uses a visible 2px accent outline with 4px offset. Hover, active, focus, selected, and disabled states differ through border, text, shape, or opacity in addition to color. Enabled controls show `cursor: pointer`; disabled controls show `cursor: not-allowed` and a real reason where needed.

State-only transitions affect color, border color, background color, and opacity for 160ms under `prefers-reduced-motion: no-preference`. Under reduced motion their duration is zero. Do not add entrance, floating, parallax, typing, or celebration animation.

Enter submits or advances drills. Escape opens exit confirmation where the study flow requires it. Dialogs close with Escape and expose a visible resume action. Feedback remains text-paired and screen-reader accessible.

## Pronunciation and listening

Reuse the shared SpeakerButton for drill prompts, SRS prompts, and every curated Japanese grammar example. Available controls show a speaker icon and visible **Listen** text. Unavailable controls show **Audio unavailable**, remain disabled, and expose the existing reason. Accessible names combine the visible label with prompt or example context.

Pronunciation controls remain at least 44px in both dimensions and wrap without colliding with Japanese text. Existing voice detection, playback, errors, and `role="status"` feedback remain intact. Optional audio failure never blocks text study. JLPT Listening retains its bundled native audio player; speech synthesis is not substituted for recorded material.

## Study activity and data views

PRD §10.13 owns counting and storage. Home displays 91 days through today; Progress displays the selected year and activity overview. Seven Sunday–Saturday rows, week columns, month labels, green 0/1/2/3/4+ completed-session bins, exact-count detail, and a legend make the calendar understandable without color alone.

All levels contribute. Available years come from history plus the current year. Future dates are unavailable. One completed session counts once; retries are separate sessions, while aborted runs and individual answers are not contributions. Legacy detail is never fabricated from XP.

The overview has equal fixed 0–100% axes: Drills left, SRS Review top, JLPT right, Grammar bottom. Exact counts and one-decimal shares accompany the green polygon. Zero sessions means zero shares and an empty state. This measures participation, not proficiency, exam readiness, or a target balance.

Kanji mastery, achievements, coverage, SRS statistics, JLPT progress, and configuration values use actual local state. Preserve their test IDs, stable namespaced IDs, keyboard behavior, and real actions.

## UI states

- **Loading:** Keep the shell stable, reserve asynchronous content space, and expose textual loading with `role="status"`.
- **Empty:** Show real zero values and a useful next action where appropriate. Never show sample achievements or fictional activity as product data.
- **Error:** Preserve navigation and explain failure in the relevant content region. Retry only when wired to real recovery.
- **Disabled:** Keep labels and reasons legible. Do not render unavailable choices as actionable controls.
- **Populated:** Use validated content and existing local persistence without changing grading, scheduling, XP, result payloads, or import/export formats.

## Accessibility and verification

Preserve landmarks, one logical `h1` per view, hierarchical headings, document titles, Japanese language metadata, zoom support, visible field labels, and image alt text. Keyboard users retain logical Tab and Shift+Tab order, Enter and Space activation, Escape dialogs, calendar roving focus, kanji arrow navigation, and route shortcuts.

Verify 320px, 390px, 768px, 1024px, and 1440px layouts without document overflow, clipping, collision, or bottom-rail occlusion. Verify 200% text zoom for study and JLPT controls. All text and meaningful graphical controls meet WCAG AA in both themes and every accent.

Use `npm run check`, `npm test`, `npm run build`, `npm run audit:clean`, `npm run eval`, and `npm run doctor`. The visual and interaction contracts live in `e2e/a11y.spec.ts`, `e2e/journey.spec.ts`, and the existing browser suites. Final production evidence also requires an element-by-element browser click-through, both themes, all accents, reduced motion, keyboard use, responsive widths, and exact console and resource results.
