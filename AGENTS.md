# NihonCode (キタ) — Agent Map

بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
In the name of Allah, the Most Gracious, the Most Merciful

فَتَعَٰلَى ٱللَّهُ ٱلۡمَلِكُ ٱلۡحَقُّۗ وَلَا تَعۡجَلۡ بِٱلۡقُرۡءَانِ مِن قَبۡلِ أَن يُقۡضَىٰٓ إِلَيۡكَ وَحۡيُهُۥۖ وَقُل رَّبِّ زِدۡنِي عِلۡمٗا
High above all is Allah, the King, the Truth! Be not in haste with the Qur’an before its revelation to thee is completed, but say, “O my Lord! advance me in knowledge.”

Local-first Japanese practice web app. React 19 + TypeScript strict + Vite. No backend, no accounts, all data in the browser. **Phase 1 MVP shipped and verified**: app shell, dashboard, five drills, grammar N5, FSRS SRS review, progress with kanji map, config/about, TTS with unavailable fallback. **Phase 2 curation executed and consolidated**: every N5/N4 entry manually curated (2,298 verdicts in `curation/adjudications.json`), and the app's single dataset is `data/clean/` (committed, includes the 184 listening MP3s and the localized image pool) — which the app reads through `src/content/loaders.ts` + the Zod gate. The raw scrape and the Phase 2 build pipeline were retired by owner directive (docs/decisions.md 2026-09-21); `scripts/audit-clean.mjs` guards the tracked pool (defect zeros, floors, unique IDs, practice_core integrity, media presence). **Phase 3 complete (2026-09-21)**: conjugation metadata + drill, pool matrix on every setup, all five levels enabled with lazy per-level chunks and a dashboard level selector, N3–N1 worklist fully adjudicated (560 verdicts), JLPT practice with per-set progress, SRS statistics page, once-only achievement toasts, practice_core wired into the kanji map, export/import, responsive/a11y/perf pass; DB_VERSION 6 (`jlptProgress`, `activity`). **data-recon (2026-09-23)**: owner brief restored reading/listening — all five JLPT categories ship with local media (1,035 localized images, evidenced per-question audio spans, explanations/answered sentences restored from source); owner confirmed JLPT redistribution rights and permitted amgidex grammar lists for this non-commercial project (docs/attribution.md); commercial redistribution of amgidex content still needs author permission. `data/generated/` and `data/jlpt-raw/` return as read-only comparison evidence only (docs/decisions.md 2026-09-23).

## Read first (authority order)

1. [PRD.md](PRD.md) — scope, non-goals (binding), section 18 measured data defects.
2. [PRODUCT.md](PRODUCT.md) — product truth: users, positioning, brand commitments.
3. [implementation_plan.md](implementation_plan.md) — three phases with definitions of done. Phase gates are strict: finish Phase 1 before touching Phase 2.
4. [DEVELOPMENT_PROMPT.md](DEVELOPMENT_PROMPT.md) — Phase 3 hard constraints, task order, owner-decision gates, verification protocol (Phase 2 record lives in git at `b15c717`).
5. [UI_IMPLEMENTATION_PROMPT.md](UI_IMPLEMENTATION_PROMPT.md) — redesign integration scope, executed 2026-09-22: all nine mockup views run in production `src/` on real data. `mockups/` remains the visual authority for future changes; [DESIGN.md](DESIGN.md) owns target tokens and [.impeccable/README.md](.impeccable/README.md) maps all briefs. `mockup.png` and old review screenshots are historical only.

## Knowledge base

- [docs/index.md](docs/index.md) — docs map
- [docs/architecture.md](docs/architecture.md) — layers, boundaries, data gate
- [docs/development.md](docs/development.md) — commands, environment, verification protocol
- [docs/data-quality.md](docs/data-quality.md) — measured defect ledger + clean-slice gate
- [docs/design-system.md](docs/design-system.md) — binding visual grammar + taste rules
- [docs/quality.md](docs/quality.md) — gap ledger: what is verified, what is missing
- [docs/decisions.md](docs/decisions.md) — decision log (ADR-style)
- [DESIGN.md](DESIGN.md) — approved HTML redesign target (production integration pending); `.impeccable/design.json` sidecar

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

- **Data gate**: `data/clean/` is the only dataset and the app's single source of truth; `src/content/loaders.ts` is its only importer (enforced by `scripts/check-arch.mjs`, which also bans imports of `data/generated/`, `data/jlpt/`, and `data/jlpt-raw/` — comparison evidence only). Content changes land as tracked edits to `data/clean/` plus a docs/data-quality.md ledger update in the same change; `scripts/audit-clean.mjs` fails on any defect, duplicate ID, floor breach, dangling practice_core ref, missing MP3/image, bare `image_urls`, or unresolved passage ref.
- **Layer boundaries**: `src/domain/` is pure (no React, no DOM, no UI imports). Features never import across `src/features/<other>/`. Enforced by `scripts/check-arch.mjs`.
- **Taste**: no inline styles, no hardcoded colors outside `:root`, no glass/gradients/rounded shells. Enforced by `scripts/check-taste.mjs`.
- **Graded pool (curated)**: graded content is kana 46+46; kanji N5–N1 (80/166/367/367/1,232); vocab N5–N1 (738/649/2,097/1,682/2,655); grammar N5–N1 graded lessons (72/130/67/71/45); algorithmic numbers/dates; all five JLPT categories ship (grammar/kanji/vocabulary/reading/listening; data-recon 2026-09-23). Floors enforced by `scripts/audit-clean.mjs`.
- **Direction-contract text never ships**: THESIS/OWN-WORLD/STORY/FIRST VIEWPORT/FORM blocks stay out of code, DOM, and bundles.
- **Stable namespaced IDs** from day one (`kana:hiragana:あ`, `grammar:n5:12`, …); progress never references array positions. `practice_core.json` uses canonical `jlpt:<level>:<category>:<set>:<hash>` ids in the tracked pool; `audit-clean` checks referential integrity directly (docs/data-quality.md "Practice core ID convention").

## Workflow

- Non-trivial work: implement → `npm run check` + `npm test` → review → resolve → final verify (DEVELOPMENT_PROMPT.md section 8).
- Observed failure → smallest durable guardrail: prefer an executable check over prose; extend `scripts/check-*.mjs` or add a test, then update `.harness/manifest.json`.
- Git: pushed to `origin` (github.com/chndranndr/NihonCode), branch `main`. CI runs check+test+build on push/PR; the browser eval is `workflow_dispatch` with `with_eval`.
