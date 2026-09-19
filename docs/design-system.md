# Design System

Binding visual grammar for キタ. Authority: `DEVELOPMENT_PROMPT.md` section 4, `.impeccable/surfaces/*.md` (locked briefs), and `mockup.png` (dashboard only). This document restates what code must obey and what `scripts/check-taste.mjs` enforces mechanically.

## World

Terminal console / command deck. Recognizable with all content removed:

- Near-black ground; hairline panel borders with corner ticks.
- Monospace UI face for labels and data; tracked uppercase micro-labels.
- One accent per semantic role: **amber** primary action, **green** success/mastered, **blue** info/learning, **orange** new/due, **red** critical.
- Box-drawing and ASCII ornament (Fuji skyline, vertical margin Japanese, boot ticker, clock/coords stamp) as binding world elements.

## Banned

No glass (`backdrop-filter`), no gradient panel fills, no rounded card shells (`border-radius` > 4px), no stock illustration, no confetti gamification, no display serifs. Dark theme is default and primary; light theme carries the same hairline grammar. Accent color is user-selectable and touches primary action and selection only.

## Mechanically enforced (check-taste.mjs)

| Rule                                                                                         | Failure marker         |
| -------------------------------------------------------------------------------------------- | ---------------------- |
| No JSX inline `style={{…}}` objects — theming via CSS variables / CSS Modules                | `[no-inline-style]`    |
| No literal colors in CSS outside `:root` declarations — declare `--variables`                | `[no-hardcoded-color]` |
| No `backdrop-filter`                                                                         | `[no-glass]`           |
| No `border-radius` > 4px                                                                     | `[no-rounded-shells]`  |
| No gradient fills outside `:root`/`body`                                                     | `[no-gradient-fills]`  |
| Direction-contract markers (THESIS:/OWN-WORLD:/FIRST VIEWPORT:/FORM:) never appear in `src/` | `[contract-leak]`      |

Contextual rules (composition, state sets, motion timing, ornament craft) are not mechanically checkable; they are verified by the impeccable finish review per DEVELOPMENT_PROMPT.md section 8.

## Interaction contracts

- Motion: 150–250ms state feedback only; the ticker types once on load; nothing else choreographs.
- Components ship full state sets: default, hover, focus, active, disabled, loading, error. Skeletons for loading, never spinners inside content. Empty states teach the panel's purpose.
- Navigation: left icon rail at ≥768px; below that the rail collapses and the bottom command bar becomes nav. Desktop bottom bar: status ticker + [1]–[4] keyboard legend; keys jump sections.
- Drill keyboard contract: Enter submits, Enter advances, Esc aborts with confirm.
- Accessibility: accessible labels on controls; visual progress paired with text; kanji map arrow-key navigable with the inspector as a live region; TTS-unavailable shows a visible state and never blocks text study.
- Deferred-feature panels render locked or teaching-empty states — never dead tiles or holes in the grid.

## Theme variables (seed, from src/app/app.css)

`--ground`, `--ink`, `--accent-amber` exist as the scaffold seed. Phase 1 task 2 builds the full theme system: dark default, light variant, user-selectable accent, persisted (`NihonCode-theme`, `NihonCode-theme-accent` per PRD section 10.2), root HTML class + `theme-color` meta updates.

## Surface briefs

`.impeccable/surfaces/dashboard.md`, `drill.md`, `progress.md`, `about.md` — locked composition contracts (THESIS / OWN-WORLD / STORY / FIRST VIEWPORT / FORM). Their text never ships in any artifact (enforced: `[contract-leak]`).
