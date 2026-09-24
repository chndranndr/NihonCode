# Attribution and Licensing

Consolidated source metadata for every dataset in `data/` (Phase 2 task 7). The About page renders the clearance statuses from `src/content/sources.ts`; this document is the single source of truth those rows mirror. Redistribution clearance is an owner action; the question list below is prepared for it.

## Sources

| Source               | Content                                                 | License      | Redistribution status                                                                                                                   |
| -------------------- | ------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| amgidex              | Grammar lesson lists (all levels, `grammar_*.json`)     | unspecified  | **Permitted (non-commercial)** — owner decision 2026-09-23; no author license granted, commercial redistribution still needs permission |
| Tatoeba              | Example sentences inside grammar lessons                | CC BY 2.0 FR | **Licensed** — attribution required in About; text bundled locally                                                                      |
| japanesetest4you.com | JLPT exercise sets + listening audio + images (`jlpt/`) | unspecified  | **Licensed by owner** — owner confirmed redistribution rights for the JLPT assets 2026-09-23 (data-recon)                               |

## Per-file provenance

- `data/clean/kana.json`, `kanji_*.json`, `vocabulary_*.json`: curated study content (the tracked pool since the 2026-09-21 cutover; the raw scrape under `data/generated/` it was derived from is retired). Per-file metadata records review state only (`meta.reviewed`, `meta.reading_policy`). No external source field is present; the grammar lists' origin is amgidex per the defect ledger (docs/data-quality.md).
- `data/clean/grammar_*.json`: lesson bodies from the amgidex grammar lists; example sentences from Tatoeba (CC BY 2.0 FR); N5 additionally marked `reviewed: true` with review sources recorded in `meta.review_sources`.
- `data/clean/practice_core.json`: reverse index over the JLPT sets below.
- `data/clean/jlpt/<level>/<category>.json`: scraped from japanesetest4you.com; every set carries its origin URL in `url`. Listening audio ships under `data/clean/audio/` (930 source URLs aliased to 184 local files, measured during Phase 2).

## Release status: non-commercial cleared; commercial needs author permission

Non-commercial use of every dataset is cleared by owner decisions (2026-09-23, data-recon): the JLPT assets carry the owner's redistribution confirmation, and the amgidex grammar lists are permitted for this non-commercial project. No formal license was granted by amgidex, so **commercial or public redistribution of the grammar lists still requires the author's permission**; the JLPT row is cleared by the owner for the scope they confirmed.

## Owner question list (rights confirmation)

1. ~~**amgidex grammar lists**: may NihonCode redistribute the grammar lesson text?~~ Owner decision 2026-09-23: permitted for this non-commercial project; author permission still needed only for commercial/public redistribution.
2. ~~**japanesetest4you exercises**: may the scraped JLPT question sets be redistributed or shipped locally?~~ Confirmed 2026-09-23.
3. ~~**japanesetest4you audio**: may the 184 listening MP3s be redistributed?~~ Confirmed 2026-09-23; extends to the localized images under `data/clean/images/`.
4. **Tatoeba CC BY 2.0 FR**: confirm the bundled examples fall under the CC BY 2.0 FR blanket license and add the required attribution text to the About page.
