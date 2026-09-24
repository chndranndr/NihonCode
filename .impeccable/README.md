# Redesign reference map

Updated 2026-09-22 by owner request; production integration shipped the same day under [UI_IMPLEMENTATION_PROMPT.md](../UI_IMPLEMENTATION_PROMPT.md). These briefs describe the approved HTML redesign now running in `src/`.

Visual authority: `mockups/index.html`, `mockups/style.css`, `mockups/app.js`. Behavior: PRD. Tokens: [DESIGN.md](../DESIGN.md). Engineering rules: [design-system.md](../docs/design-system.md). Execution: [UI_IMPLEMENTATION_PROMPT.md](../UI_IMPLEMENTATION_PROMPT.md).

| Mockup view | Brief | Production target |
| --- | --- | --- |
| Home | [dashboard](surfaces/dashboard.md) | DashboardPage |
| Progress | [progress](surfaces/progress.md) | ProgressPage |
| Learn | [learn](surfaces/learn.md) | LearnPage |
| Config | [config](surfaces/config.md) | ConfigPage |
| Practice setup | [drill](surfaces/drill.md) | DrillPage / PoolMatrix |
| Practice | [drill](surfaces/drill.md) | DrillSession |
| Practice results | [drill](surfaces/drill.md) | Existing session summary |
| Grammar | [grammar](surfaces/grammar.md) | GrammarLessonPage |
| JLPT practice | [jlpt](surfaces/jlpt.md) | JlptPage / JlptRunPage |

[About](surfaces/about.md) remains accessible within Config. Existing SRS review and separate `/stats` route are retained and inherit the updated shared style.

`design.json` extends DESIGN.md with component previews and metadata extracted from the approved mockup. Production evidence lives in [docs/quality.md](../docs/quality.md) and `.evidence/after/`. `review/*.png` and root `mockup.png` are historical screenshots; do not treat them as current redesign approval screenshots. Preserve those files; new production evidence must be explicitly labeled after integration.

Prior surface contracts are available in Git history. They do not override these refreshed briefs. Documentation-only direction language must not be copied into the UI or bundle.
