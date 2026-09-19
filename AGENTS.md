# NihonCode (キタ) — Agent Map

Local-first Japanese practice web app. React 19 + TypeScript strict + Vite. No backend, no accounts, all data in the browser. **Phase 1 MVP shipped**: app shell, dashboard, five drills over the clean slice, grammar N5, FSRS SRS review, progress with kanji map, config/about, TTS with unavailable fallback. Phase 2 (data remediation) and Phase 3 are gated and not started.

## Read first (authority order)

1. [PRD.md](PRD.md) — scope, non-goals (binding), section 18 measured data defects.
2. [PRODUCT.md](PRODUCT.md) — product truth: users, positioning, brand commitments.
3. [implementation_plan.md](implementation_plan.md) — three phases with definitions of done. Phase gates are strict: finish Phase 1 before touching Phase 2.
4. [DEVELOPMENT_PROMPT.md](DEVELOPMENT_PROMPT.md) — hard constraints, task order, verification protocol, design contract summary.
5. `.impeccable/surfaces/*.md` — locked surface briefs (dashboard, drill, progress, about). `mockup.png` — binding visual authority for the dashboard.

## Knowledge base

- [docs/index.md](docs/index.md) — docs map
- [docs/architecture.md](docs/architecture.md) — layers, boundaries, data gate
- [docs/development.md](docs/development.md) — commands, environment, verification protocol
- [docs/data-quality.md](docs/data-quality.md) — measured defect ledger + clean-slice gate
- [docs/design-system.md](docs/design-system.md) — binding visual grammar + taste rules
- [docs/quality.md](docs/quality.md) — gap ledger: what is verified, what is missing
- [docs/decisions.md](docs/decisions.md) — decision log (ADR-style)
- [DESIGN.md](DESIGN.md) — shipped design system (documenter output); `.impeccable/design.json` sidecar

## Commands

| Task                              | Command                                                 |
| --------------------------------- | ------------------------------------------------------- |
| Setup                             | `npm install` (once: `npx playwright install chromium`) |
| Dev server                        | `npm run dev`                                           |
| Isolated server (concurrent-safe) | `npm run dev:isolated` (or `preview:isolated`)          |
| All static checks                 | `npm run check`                                         |
| Unit tests                        | `npm test`                                              |
| Smoke evaluation (browser)        | `npm run eval`                                          |
| Health report                     | `npm run doctor` (add `--with-eval` for browser eval)   |
| Cleanup + entropy report          | `npm run gc -- --dry-run`                               |
| Production build                  | `npm run build`                                         |

## Hard rules (enforced by `npm run check`)

- **Data gate**: raw `data/` is untrusted and read-only. Only `src/content/` may import it. Never hand-edit `data/generated` or `data/jlpt`.
- **Layer boundaries**: `src/domain/` is pure (no React, no DOM, no UI imports). Features never import across `src/features/<other>/`. Enforced by `scripts/check-arch.mjs`.
- **Data drift**: `scripts/audit-data.mjs` fails when raw data/ changes vs `scripts/data-baseline.json`. Deliberate dataset updates require `--write-baseline` plus a `docs/data-quality.md` update in the same change.
- **Taste**: no inline styles, no hardcoded colors outside `:root`, no glass/gradients/rounded shells. Enforced by `scripts/check-taste.mjs`.
- **MVP clean slice only**: graded content is kana 46+46, kanji N5 (80), N5 vocab with Latin romaji (643), grammar N5 (72 reviewed lessons), algorithmic numbers/dates. Everything else waits for Phase 2.
- **Direction-contract text never ships**: THESIS/OWN-WORLD/STORY/FIRST VIEWPORT/FORM blocks stay out of code, DOM, and bundles.
- **Stable namespaced IDs** from day one (`kana:hiragana:あ`, `grammar:n5:12`, …); progress never references array positions. Measured exception: `practice_core.json`'s existing `jlpt:` IDs resolve by array position, not the `number` field — see docs/data-quality.md before touching that convention.

## Workflow

- Non-trivial work: implement → `npm run check` + `npm test` → review → resolve → final verify (DEVELOPMENT_PROMPT.md section 8).
- Observed failure → smallest durable guardrail: prefer an executable check over prose; extend `scripts/check-*.mjs` or add a test, then update `.harness/manifest.json`.
- CI: `.github/workflows/ci.yml` runs check + test on push/PR; the browser eval runs on demand (workflow_dispatch) because it needs a browser download.
- No git repo exists yet; do not commit, push, or initialize VCS unless asked.
