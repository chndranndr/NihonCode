# Decision Log

Append-only. Newest first. One entry per decision: what, why, where it binds.

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
