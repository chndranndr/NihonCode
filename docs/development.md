# Development

## Environment

- Node 24 (verified with v24.19.0), npm 11. Windows/macOS/Linux; scripts use `node` directly, no shell-isms.
- Setup: `npm install`, then once per machine: `npx playwright install chromium` (browser download for the smoke eval).

## Command surface

One task runner: npm scripts. Everything agents need is discoverable from `package.json`.

| Command                   | What it does                                                                                                                                                                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`             | Vite dev server (port 5173)                                                                                                                                                                                                                                                                    |
| `npm run dev:isolated`    | Dev server on the first free port ≥ 5173; prints JSON `{port,url,pid}`; `preview:isolated` for the built app; teardown via SIGINT/SIGTERM                                                                                                                                                      |
| `npm run build`           | Production bundle to `dist/`                                                                                                                                                                                                                                                                   |
| `npm run preview`         | Serve `dist/` statically                                                                                                                                                                                                                                                                       |
| `npm run check`           | typecheck + lint + format:check + arch + taste + docs links + audit-clean self-test + audit-clean over the tracked pool                                                                                                                                                                        |
| `npm test`                | Vitest unit suite (jsdom)                                                                                                                                                                                                                                                                      |
| `npm run eval`            | Playwright smoke eval: builds, serves, drives desktop + mobile viewports                                                                                                                                                                                                                       |
| `npm run doctor`          | Full health report (manifest, check, test, gc dry-run; `--with-eval` adds browser eval); `--json` for machines                                                                                                                                                                                 |
| `npm run gc -- --dry-run` | Cleanup candidates + entropy findings, read-only                                                                                                                                                                                                                                               |
| `npm run gc`              | Delete known generated artifacts (`dist/`, `test-results/`, `playwright-report/`, `coverage/`, vite cache); entropy findings remain report-only                                                                                                                                                |
| `npm run audit:clean`     | Tracked-pool validator over `data/clean/`: zero defect classes, graded-pool floors, unique IDs, practice_core referential integrity, referenced MP3s present; `--self-test` proves five failure paths (duplicate ID, passage-title artifact, pool floor, missing audio, id/content derivation) |
| `npm run format`          | Prettier over owned files only (never over `data/` or owner root docs)                                                                                                                                                                                                                         |

## Verification protocol

Per DEVELOPMENT_PROMPT.md section 8, at the integrated head (not per-agent mid-flight):

1. `npm run check`
2. `npm test`
3. `npm run eval` (Playwright: the drill → grade → persist → reload → review loop once Phase 1 task 6 lands)
4. `npm run build`, then smoke-test the served bundle
5. Screenshots at 1440 and 390 widths; `impeccable detect --json` once over changed UI targets; finish reviewer; documenter (inspection rounds capped at two)

Fast inner loop while developing: `npm run test:watch` plus `npm run dev`.

## Concurrency / isolation

Concurrent agents or working copies must not share ports or learner state:

- Use `npm run dev:isolated` (or `preview:isolated`) — it derives a collision-free port and tears down deterministically on SIGINT/SIGTERM.
- Playwright gives each test a fresh browser context (isolated localStorage); `npm run eval` derives a free port ≥ 4173 and exports `E2E_PORT`, which `playwright.config.ts` uses for baseURL and its webServer (`strictPort`, `reuseExistingServer: false`), so concurrent evals cannot collide or test a stale server.
- There is no database or file-system state shared between runs; progress lives in per-context browser storage.

## CI

`.github/workflows/ci.yml`: on push/PR — install, `npm run check`, `npm test`, `npm run build`. The browser eval runs via `workflow_dispatch` (manual) because it needs a Chromium download; run it locally before merging UI work. The repo has no git remote yet; CI activates when the repository is pushed to GitHub.

## Guardrail scripts

All under `scripts/`, all dependency-light (Node stdlib only):

| Script               | Guards                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `check-arch.mjs`     | Layer boundaries ([architecture.md](architecture.md))                                                                       |
| `check-taste.mjs`    | Design contract mechanics ([design-system.md](design-system.md))                                                            |
| `check-docs.mjs`     | Relative links + anchors in AGENTS.md, README.md, and docs/                                                                 |
| `audit-clean.mjs`    | Tracked pool: defect zeros, floors, unique IDs, practice_core integrity, MP3 presence (self-test proves five failure paths) |
| `check-rekeys.mjs`   | VOCAB_N5_REKEYS map vs the tracked pool (24 pairs, non-vacuous)                                                             |
| `doctor.mjs`         | Manifest validity + orchestrated health report                                                                              |
| `gc.mjs`             | Generated-artifact cleanup + entropy scan                                                                                   |
| `serve-isolated.mjs` | Collision-free dev/preview server                                                                                           |
| `run-e2e.mjs`        | Eval wrapper with browser-install remediation                                                                               |

Adding a guardrail: write the smallest executable check, wire it into `npm run check` (or `doctor`), prove it fails on the original failure class, then update `.harness/manifest.json` capabilities.
