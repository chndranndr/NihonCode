# Architecture

Single-page React app, one repo, no backend. Static build served from any static host. This document is the source of truth for the layer layout, the enforced boundaries, and the data, ID, and persistence rules.

## Current state

All five levels ship. `src/` contains the app shell, the drills (kana, kanji, vocab, numbers, dates, conjugation) plus SRS review, grammar lessons, JLPT practice, SRS statistics, progress telemetry, settings/about, the validation gate with bundler loaders, Dexie + localStorage persistence, and the observability seam. The gate's raw-file loading lives in `content/loaders.ts` (bundler side); `content/gate.ts` is a pure validator module so tests and e2e can run it without bundler JSON imports.

## Layers (target layout)

```
src/
  app/           routing, layout, nav rail (bottom bar on phones), global stylesheet app.css
  features/      dashboard/ drills/ grammar/ jlpt/ learn/ progress/ review/ settings/ stats/
  domain/        grading, scheduling (FSRS), XP/streak rules — pure, no React
  content/       schemas, validation gate, normalizers, loaders → typed models
  storage/       Dexie (SRS cards, review logs) + localStorage (settings, compact progress)
  components/    shared UI
  observability/ structured logging seam (exists now) — dependency-free leaf
data/
  generated/     retired frozen evidence (untracked comparison input)
  jlpt-raw/      raw scrape: JSON tracked as provenance, audio ignored (duplicate of clean)
  clean/         the app's single source of truth: graded pools, JLPT sets, local media
```

`observability/` is part of the binding layout, recorded as a decision (docs/decisions.md). It is a leaf every layer may import, and it imports nothing from the repo. `scripts/check-arch.mjs` enforces the matrix with default-deny: a top-level `src/<dir>/` outside the matrix is a violation, so an unclassified layer can never pass silently.

## Enforced boundaries

`scripts/check-arch.mjs` resolves every relative import to a repository path (depth-independent) and fails the build on violations:

1. **The data gate is clean-only.** The app's single source of truth is the committed `data/clean/`, imported only by `content/loaders.ts`; `check-arch` rejects any `src/` import of `data/clean` outside content, and of `data/generated`/`data/jlpt`/`data/jlpt-raw` anywhere (comparison evidence, never runtime input). Raw JSON never reaches a component; components and features consume typed models emitted by the gate.
2. **domain/ is pure.** No React imports, no DOM/BOM globals (`document`, `window`, `localStorage`, `indexedDB`, `navigator`), no imports from `app/`, `features/`, `components/`, or `storage/`. Everything in domain is unit-testable without React.
3. **content/ is pure.** No React, no imports from the UI layers; it owns parsing, normalization, flagging, and ID stamping only.
4. **Features do not import across each other.** `features/drills` must not import `features/grammar`. Shared logic goes to `domain/`; shared UI goes to `components/`.
5. **observability/ is a leaf.** It may import nothing from the repository (external packages and its own directory only), so every layer can depend on it without cycles.
6. **No component patches dataset defects inline.** Normalization and flagging happen in `content/`; suspicious items are excluded from graded pools and reported, never silently fixed at render time.

## The validation gate

Dataset JSON is untrusted input. The gate in `src/content/` must:

- parse each dataset with a Zod schema (Zod is the gate's dependency);
- reject or flag malformed entries — a flagged entry never crashes a drill;
- stamp stable namespaced IDs;
- restrict graded pools to the clean slice (see [data-quality.md](data-quality.md));
- emit a machine-readable flag report for the review queue.

Acceptance: gate unit tests pass against known-bad samples — a vocab entry with Japanese in `romaji`, a kanji answer with dictionary markers — by excluding and flagging them, not throwing.

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

## Re-key rule

Editing kana/kanji re-derives `vocabId`/`kanjiId` and orphans stored progress. Keep graded IDs byte-identical, or ship a Dexie version bump with a remap in the same change; `npm run check:rekeys` verifies the N5 vocab rekey map against the pool (standalone, not part of `npm run check`). Conjugation class is curated per entry, never inferred from category buckets (PRD §18). Flagged or unreviewed content stays out of graded pools until a human approves it.

## Persistence (decided)

Decided and recorded (docs/decisions.md): IndexedDB via **Dexie** for SRS cards and review logs (the volume case); **localStorage** for theme, accent, level, settings, and compact progress state. All stores schema-versioned; migrations additive and idempotent. Session state (queue, answers) lives in React state; only progress, SRS cards, and prefs persist. Components never grade or schedule: grading and scheduling live in `src/domain/`. Current `DB_VERSION` is 6 (`src/storage/db.ts`).

## Lazy loading

Datasets and audio load per level and per route, never all at app start (PRD performance requirement; verified in Phase 3 by the network-idle assertion in the eval suite).
