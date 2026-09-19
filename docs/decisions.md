# Decision Log

Append-only. Newest first. One entry per decision: what, why, where it binds.

## 2026-09-19 — Phase 1 closeout: root specs amended at the owner's instruction

**Decision.** The owner directed the completion agent to rewrite DEVELOPMENT_PROMPT.md and amend implementation_plan.md, PRODUCT.md, and docs/quality.md to close Phase 1. decisions.md:61-67 records these four specs as owner-authored and prettier-excluded; this entry records the relaxation. Future agents may edit these specs only under an explicit owner instruction for a named task, never as a drive-by formatting or drift fix.

**Why.** Phase 1 shipped with the plan documents out of sync with reality (level selector never built, kanji map pulled forward, vocab count stale). The owner resolved the conflicts by directing the amendments. Without this entry, a future agent reading the governance rule gets contradictory orders.

**Binds.** DEVELOPMENT_PROMPT.md, implementation_plan.md, PRODUCT.md, docs/quality.md, docs/architecture.md.

## 2026-09-19 — Level selector deferred to Phase 3 (closeout task 12)

**Decision.** Phase 1 ships no level selector. implementation_plan.md line 104 amended; the selector moves to Phase 3 with N4–N1 enablement; a gap row exists in docs/quality.md.

**Why.** Nothing writes `prefs.level` and the content gate refuses non-n5 (`src/content/gate.ts`), so a selector would have nothing valid to select. The dashboard renders the level as a readout. PRD §10.1 still binds for the full release.

**Binds.** implementation_plan.md Phase 1/3 scope lists, docs/quality.md gap ledger, PRD §10.1 deferred.

## 2026-09-19 — Kanji map, achievements, coverage are Phase 1 (closeout task 13)

**Decision.** The kanji mastery map with docked inspector, the achievements row, and the coverage-of-studied-material estimate belong to Phase 1 per DEVELOPMENT_PROMPT.md task 7. implementation_plan.md amended: the Phase 3 deferral at line 127 narrowed to toasts and the SRS statistics page; Phase 3 keeps achievement toasts, the SRS statistics page, and wiring the map to practice_core.json.

**Why.** The owner's prompt placed these in Phase 1 task 7 and they shipped at the progress surface. The plan's blanket Phase 3 deferral contradicted the prompt. The practice_core wiring stays a Phase 3 obligation because the shipped map derives from drill attempts only (`src/content/ids.ts` states practice_core is not consumed).

**Binds.** implementation_plan.md lines 116, 128, 215–218, docs/quality.md Proven rows.

## 2026-09-19 — Gate split: pure validators plus bundler loaders

**Decision.** `src/content/gate.ts` holds the pure Zod validators and ID stamping; `src/content/loaders.ts` owns the four clean-slice JSON imports and the `load*` functions. The e2e journey runs the gate validators over fs-read raw files.

**Why.** Playwright's Node ESM loader rejects bundler-style top-level JSON imports, so a spec importing gate.ts crashed the eval suite. The split keeps one source of truth for validation logic while letting the e2e legs build expected answers through the same grading path. check-arch's data-gate rule still holds: all `data/` imports remain inside `src/content/`.

**Binds.** src/content/gate.ts, src/content/loaders.ts, e2e/journey.spec.ts, docs/architecture.md current-state section.

## 2026-09-19 — Legacy loader quarantined, not fixed (closeout task 14c)

**Decision.** `data/generated/index.ts`'s missing `../../types/content` import is resolved by quarantine: the file sits outside the tsconfig, is reference-only, and `src/content/gate.ts` owns the type contract. implementation_plan.md line 243 amended from "fix as part of Phase 1" to this resolution. Deletion is Phase 2 pipeline work.

**Why.** The original instruction ordered a hand-edit of a file DEVELOPMENT_PROMPT.md section 2 forbids touching, and the gate already replaced the loader's function. Quarantine was the measured outcome; the plan now records it.

**Binds.** implementation_plan.md handoff notes, docs/quality.md debts.

## 2026-09-19 — Repository pushed; CI observed green

**Decision.** Initialized git on `main`, committed the full tree, and pushed to `origin` (github.com/chndranndr/NihonCode) at the owner's explicit instruction. `.gitignore` excludes local agent tooling (`.omp/`, `.pi/`, `.pstack/`) and scratch dirs; `.harness/` and `.impeccable/` are tracked as product artifacts. `.gitattributes` pins LF so prettier `--check` and CI agree across platforms.

**Why.** The owner created the remote and asked for the push. The first CI run failed on `format:check` (docs/quality.md table padding); fixed and re-pushed; run 35435907252 is green. `ci` promoted from partial to implemented with that observed evidence; the deferral entry is removed.

**Binds.** .harness/manifest.json (ci implemented), docs/quality.md, AGENTS.md workflow section.

## 2026-09-19 — Eval and dev servers derive collision-free ports

**Decision.** `scripts/run-e2e.mjs` finds the first free port ≥ 4173 and exports `E2E_PORT`; `playwright.config.ts` reads it for baseURL, webServer command, and url, with `strictPort` and `reuseExistingServer: false`. `scripts/serve-isolated.mjs` does the same for dev/preview (≥ 5173). Vite config binds `127.0.0.1` explicitly (Windows `localhost` resolves IPv6-first, which broke Playwright's IPv4 poll).

**Why.** A fixed preview port made two concurrent evals collide, and `reuseExistingServer` locally would silently test another run's stale build. Measured evidence: serve-isolated derived 5174 while 5173 was occupied, served HTTP 200, and tore down on SIGINT.

**Binds.** playwright.config.ts, scripts/run-e2e.mjs, scripts/serve-isolated.mjs, vite.config.ts; `workspace_isolation` promoted to implemented in the manifest.

## 2026-09-19 — practice_core IDs are not canonical; Phase 2 assigns them

**Decision.** The audit reports both resolutions (`unresolvedByPosition: 0`, `unresolvedByNumber: 32`, `numberPositionMismatch: 281`, 5 duplicate-number sets, 57 gapped sets) and gates neither as the canonical scheme; only index integrity is gated.

**Why.** Positional IDs rebind silently if a set is reordered (DEVELOPMENT_PROMPT.md section 2 forbids position-based progress keys), and `number` is not unique within sets. Making either resolution a passing gate would freeze a data defect into the architecture. Canonical IDs are Phase 2 work (implementation_plan.md Phase 2.5).

**Binds.** scripts/audit-data.mjs (ledger metrics), scripts/data-baseline.json, docs/data-quality.md, AGENTS.md ID rule.

## 2026-09-19 — src/observability is an added layer in the matrix

**Decision.** `src/observability/` joins the binding layer matrix as a dependency-free leaf; `check-arch.mjs` enforces default-deny for any `src/<dir>/` outside the matrix.

**Why.** DEVELOPMENT_PROMPT.md section 3 fixes six layers; the logging seam is cross-cutting infrastructure that every layer must reach without cycles. Without default-deny, an unlisted directory would pass the arch check silently.

**Binds.** scripts/check-arch.mjs layer matrix, docs/architecture.md, manifest architecture_boundaries artifacts.

## 2026-09-19 — Kuskus full profile initialized

**Decision.** Repository harness at `full` profile: command surface on npm scripts; guardrails as dependency-light Node scripts (`check-arch`, `check-taste`, `check-docs`, `audit-data`); smoke eval on Playwright over the production bundle; manifest at `.harness/manifest.json` (schema v2).

**Why.** The project is multi-surface (web app + large untrusted dataset + three-phase plan) and agent-heavy (DEVELOPMENT_PROMPT.md is written for an implementation agent). Full-profile loops map onto constraints the owner already wrote down. Existing artifacts (PRD, plan, briefs, mockup) preserved as authority; nothing replaced.

**Binds.** AGENTS.md, docs/, scripts/, .github/workflows/ci.yml, package.json scripts.

## 2026-09-19 — Raw data frozen by baseline, not by trust

**Decision.** `scripts/data-baseline.json` freezes the structural metrics of `data/generated` + `data/jlpt`; the audit fails on any drift. Regeneration requires `--write-baseline` plus a docs/data-quality.md update in the same change. `data/clean/` (Phase 2 output) is out of scope by construction.

**Why.** The dataset is user-owned, untrusted, hand-audited, and there is no git history to diff against. A frozen baseline makes silent corruption or accidental edits a deterministic failure instead of a mystery bug in a drill.

**Binds.** `npm run check` (audit chained), docs/data-quality.md.

## 2026-09-19 — CI provider: GitHub Actions

**Decision.** `.github/workflows/ci.yml` runs install → check (incl. data audit) → test → build on push/PR; the browser eval is a manual `workflow_dispatch` job.

**Why.** Owner-selected (no VCS or CI evidence existed in the repo to derive one). Eval is dispatch-gated because it downloads Chromium; PRs stay fast while the full eval remains one click away.

**Binds.** .github/workflows/ci.yml; inert until the repo is pushed to GitHub.

## 2026-09-19 — Prettier scoped to owned files; owner specs never reformatted

**Decision.** `format`/`format:check` take an explicit file list (`src scripts e2e docs AGENTS.md` + configs), never `.`. `.prettierignore` additionally excludes the four root specs, `data/`, and tool directories.

**Why.** Prettier normalizes markdown table delimiter rows; PRD.md contains `|---|---:|` styles it would rewrite. With no git, a write-mode pass over owner-authored binding specs would be unrecoverable.

**Binds.** package.json scripts, .prettierignore.

## 2026-09-19 — Observability = structured logs only

**Decision.** The observability seam is a namespaced JSON-lines logger with a bounded ring buffer exposed on `window.__nihonLog`; no metrics/tracing stack.

**Why.** No backend, no telemetry vendor, and the honest current surface is boot/error signals plus e2e-capturable records. Metrics and traces would be speculative infrastructure for an app that has no features yet; the manifest records observability as partial with this reason.

**Binds.** src/observability/logger.ts (tested), e2e/smoke.spec.ts asserts the boot record.

## Prior (owner-authored, recorded elsewhere)

- Storage: Dexie/IndexedDB for SRS + localStorage for settings (DEVELOPMENT_PROMPT.md section 2; resolves the PRODUCT.md open item; PRODUCT.md/PRD wording update is owner-authored and due with the storage commit).
- Dark-first binding; accent user-selectable (PRODUCT.md brand commitments).
- Phase gates: MVP → data remediation → polish, strictly ordered (implementation_plan.md).
