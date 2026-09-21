# NihonCode (キタ) — Agent Map

بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
In the name of Allah, the Most Gracious, the Most Merciful

فَتَعَٰلَى ٱللَّهُ ٱلۡمَلِكُ ٱلۡحَقُّۗ وَلَا تَعۡجَلۡ بِٱلۡقُرۡءَانِ مِن قَبۡلِ أَن يُقۡضَىٰٓ إِلَيۡكَ وَحۡيُهُۥۖ وَقُل رَّبِّ زِدۡنِي عِلۡمٗا
High above all is Allah, the King, the Truth! Be not in haste with the Qur’an before its revelation to thee is completed, but say, “O my Lord! advance me in knowledge.”

Local-first Japanese practice web app. React 19 + TypeScript strict + Vite. No backend, no accounts, all data in the browser. **Phase 1 MVP shipped and verified**: app shell, dashboard, five drills, grammar N5, FSRS SRS review, progress with kanji map, config/about, TTS with unavailable fallback. **Phase 2 curation executed and consolidated**: every N5/N4 entry manually curated (2,298 verdicts in `curation/adjudications.json`), and the repository now holds exactly one dataset — `data/clean/` (committed, includes the 184 listening MP3s) — which the app reads through `src/content/loaders.ts` + the Zod gate. The raw scrape and the Phase 2 build pipeline were retired by owner directive (docs/decisions.md 2026-09-21); `scripts/audit-clean.mjs` guards the tracked pool (defect zeros, floors, unique IDs, practice_core integrity, MP3 presence). DB_VERSION 4 remaps progress rows to the re-keyed N5 vocab ids. **Owner work remains**: confirm the listening audio sample, confirm redistribution rights (docs/attribution.md), and the open items in docs/data-quality.md (incl. the frozen N3–N1 curation worklist `curation/queue-n3-n1.json`).

## Read first (authority order)

1. [PRD.md](PRD.md) — scope, non-goals (binding), section 18 measured data defects.
2. [PRODUCT.md](PRODUCT.md) — product truth: users, positioning, brand commitments.
3. [implementation_plan.md](implementation_plan.md) — three phases with definitions of done. Phase gates are strict: finish Phase 1 before touching Phase 2.
4. [DEVELOPMENT_PROMPT.md](DEVELOPMENT_PROMPT.md) — Phase 3 hard constraints, task order, owner-decision gates, verification protocol (Phase 2 record lives in git at `b15c717`).
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
| Validate clean pool               | `npm run audit:clean`                                   |
| Rekey map check                   | `npm run check:rekeys`                                  |
| Unit tests                        | `npm test`                                              |
| Smoke evaluation (browser)        | `npm run eval`                                          |
| Health report                     | `npm run doctor` (add `--with-eval` for browser eval)   |
| Cleanup + entropy report          | `npm run gc -- --dry-run`                               |
| Production build                  | `npm run build`                                         |

## Hard rules (enforced by `npm run check`)

- **Data gate**: `data/clean/` is the only dataset and the app's single source of truth; `src/content/loaders.ts` is its only importer (enforced by `scripts/check-arch.mjs`). Content changes land as tracked edits to `data/clean/` plus a docs/data-quality.md ledger update in the same change; `scripts/audit-clean.mjs` fails on any defect, duplicate ID, floor breach, dangling practice_core ref, or missing MP3.
- **Layer boundaries**: `src/domain/` is pure (no React, no DOM, no UI imports). Features never import across `src/features/<other>/`. Enforced by `scripts/check-arch.mjs`.
- **Taste**: no inline styles, no hardcoded colors outside `:root`, no glass/gradients/rounded shells. Enforced by `scripts/check-taste.mjs`.
- **Graded pool (curated)**: graded content is kana 46+46, kanji N5 (80), N5 vocab (738), grammar N5 (72 graded lessons), algorithmic numbers/dates. N4–N1 and JLPT pools exist in `data/clean/` but stay out of the bundle until Phase 3 enablement.
- **Direction-contract text never ships**: THESIS/OWN-WORLD/STORY/FIRST VIEWPORT/FORM blocks stay out of code, DOM, and bundles.
- **Stable namespaced IDs** from day one (`kana:hiragana:あ`, `grammar:n5:12`, …); progress never references array positions. Measured exception: `practice_core.json`'s existing `jlpt:` IDs resolve by array position, not the `number` field — see docs/data-quality.md before touching that convention.

## Workflow

- Non-trivial work: implement → `npm run check` + `npm test` → review → resolve → final verify (DEVELOPMENT_PROMPT.md section 8).
- Observed failure → smallest durable guardrail: prefer an executable check over prose; extend `scripts/check-*.mjs` or add a test, then update `.harness/manifest.json`.
- Git: pushed to `origin` (github.com/chndranndr/NihonCode), branch `main`. CI runs check+test+build on push/PR; the browser eval is `workflow_dispatch` with `with_eval`.
