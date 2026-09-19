# Documentation Index

Knowledge base for NihonCode (キタ). Owner-authored binding specs live at the repository root; this directory holds agent-facing engineering knowledge that tracks current state.

| Document                             | Owns                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| [architecture.md](architecture.md)   | Layer boundaries, the data validation gate, stable ID scheme, persistence layout  |
| [development.md](development.md)     | Environment, command surface, verification protocol, CI                           |
| [data-quality.md](data-quality.md)   | Measured defect ledger for raw `data/`, clean-slice gate, baseline drift policy   |
| [design-system.md](design-system.md) | Binding visual grammar, mechanically enforced taste rules, surface brief pointers |
| [quality.md](quality.md)             | Verification coverage: what is proven, gap ledger, known debts                    |
| [decisions.md](decisions.md)         | Decision log: what was decided, why, where recorded                               |

Root authority (owner-written, do not restructure without approval):

- [PRD.md](../PRD.md) — requirements, non-goals, release criteria
- [PRODUCT.md](../PRODUCT.md) — product truth and brand commitments
- [implementation_plan.md](../implementation_plan.md) — phased build plan and gates
- [DEVELOPMENT_PROMPT.md](../DEVELOPMENT_PROMPT.md) — hard constraints and task order

Machine-readable state:

- `.harness/manifest.json` — capability receipt (Kuskus manifest, schema v2)
- `scripts/data-baseline.json` — frozen structural baseline of raw `data/`
