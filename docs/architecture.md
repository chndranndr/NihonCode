# Architecture

Single-page React app, one repo, no backend. Static build served from any static host. Source of truth: `implementation_plan.md` (Architecture section) and `DEVELOPMENT_PROMPT.md` section 3. This document tracks the current state and the enforced boundaries.

## Current state

Phase 1 shipped (tasks 1–9 plus the closeout extension). `src/` contains the full app shell, all six clean-slice drills plus SRS review, grammar lessons, progress telemetry, settings/about, the validation gate with bundler loaders, Dexie + localStorage persistence, and the observability seam. The gate's raw-file loading lives in `content/loaders.ts` (bundler side); `content/gate.ts` is a pure validator module so tests and e2e can run it without bundler JSON imports.

## Layers (target layout)

```
src/
  app/           routing, layout, nav rail + bottom command bar
  features/      drills/ grammar/ review/ progress/ settings/ jlpt/ about/
  domain/        grading, scheduling (FSRS), XP/streak rules — pure, no React
  content/       schemas, validation gate, normalizers, loaders → typed models
  storage/       Dexie (SRS cards, review logs) + localStorage (settings, compact progress)
  components/    shared UI
  observability/ structured logging seam (exists now) — dependency-free leaf
data/
  generated/     source content (untrusted input, read-only)
  jlpt/          source exercises + audio (untrusted input, read-only)
  clean/         Phase 2 output: normalized, validated, ID-stamped datasets
```

`observability/` is part of the binding layout of DEVELOPMENT_PROMPT.md section 3, recorded as a decision (docs/decisions.md). It is a leaf every layer may import, and it imports nothing from the repo. `scripts/check-arch.mjs` enforces the matrix with default-deny: a top-level `src/<dir>/` outside the matrix is a violation, so an unclassified layer can never pass silently.

## Enforced boundaries

`scripts/check-arch.mjs` resolves every relative import to a repository path (depth-independent) and fails the build on violations:

1. **The data gate is clean-only.** The app's single source of truth is the committed `data/clean/`, imported only by `content/loaders.ts`; `check-arch` rejects any `src/` import of `data/clean` outside content, and of `data/generated`/`data/jlpt` anywhere (those raw dirs were retired at the 2026-09-21 cutover — the rule also blocks reintroducing them). Raw JSON never reaches a component; components and features consume typed models emitted by the gate.
2. **domain/ is pure.** No React imports, no DOM/BOM globals (`document`, `window`, `localStorage`, `indexedDB`, `navigator`), no imports from `app/`, `features/`, `components/`, or `storage/`. Everything in domain is unit-testable without React.
3. **content/ is pure.** No React, no imports from the UI layers; it owns parsing, normalization, flagging, and ID stamping only.
4. **Features do not import across each other.** `features/drills` must not import `features/grammar`. Shared logic goes to `domain/`; shared UI goes to `components/`.
5. **observability/ is a leaf.** It may import nothing from the repository (external packages and its own directory only), so every layer can depend on it without cycles.
6. **No component patches dataset defects inline.** Normalization and flagging happen in `content/`; suspicious items are excluded from graded pools and reported, never silently fixed at render time.

## The validation gate (Phase 1 task 1)

Raw `data/` is untrusted input. The gate in `src/content/` must:

- parse each dataset with a Zod schema (Zod arrives with task 1; not yet a dependency);
- reject or flag malformed entries — a flagged entry never crashes a drill;
- stamp stable namespaced IDs;
- restrict graded pools to the clean slice (see [data-quality.md](data-quality.md));
- emit a machine-readable flag report for the review queue.

Acceptance (DEVELOPMENT_PROMPT.md task 1): gate unit tests pass against known-bad samples — a vocab entry with Japanese in `romaji`, a kanji answer with dictionary markers — by excluding and flagging them, not throwing.

## Stable IDs

Namespaced, content-order-independent, from day one (progress rows reference IDs, never positions):

| Content       | ID shape                               | Example                         |
| ------------- | -------------------------------------- | ------------------------------- |
| Kana          | `kana:<table>:<char>`                  | `kana:hiragana:あ`              |
| Kanji         | `kanji:<level>:<char>`                 | `kanji:n5:水`                   |
| Vocabulary    | `vocab:<level>:<kanji>\|<kana>`        | `vocab:n5:水\|みず`             |
| Grammar       | `grammar:<level>:<lessonId>`           | `grammar:n5:12`                 |
| JLPT question | `jlpt:<level>:<category>:<set>:<hash>` | `jlpt:n5:listening:12:a3f9c2d1` |

**Resolved in Phase 2 task 8, frozen at the 2026-09-21 cutover**: the raw `practice_core.json` IDs never satisfied this scheme — they resolve only by array position (32 of them fail to resolve by the `number` field, which is duplicated/gapped in 62 sets). The tracked pool stores the canonical content-hash shape directly; `scripts/audit-clean.mjs` asserts referential integrity (every `questionIds` ref resolves to a graded question, counts match). The deriver and the raw file were retired with the build pipeline (docs/decisions.md 2026-09-21). See [data-quality.md](data-quality.md#practice-core-id-convention-resolved-phase-2-task-8).

## Persistence (decided)

Recorded in DEVELOPMENT_PROMPT.md section 2: IndexedDB via **Dexie** for SRS cards and review logs (the volume case); **localStorage** for theme, accent, level, settings, and compact progress state. All stores schema-versioned; migrations additive and idempotent. When the storage layer lands, PRODUCT.md Stack line and PRD.md section 12 wording must be updated by the owner in the same commit (they are owner-authored).

## Lazy loading

Datasets and audio load per level and per route, never all at app start (PRD performance requirement; verified in Phase 3 by the network-idle assertion in the eval suite).
