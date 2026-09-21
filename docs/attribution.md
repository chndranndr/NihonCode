# Attribution and Licensing

Consolidated source metadata for every dataset in `data/` (Phase 2 task 7). The About page renders the clearance statuses from `src/content/sources.ts`; this document is the single source of truth those rows mirror. Redistribution clearance is an owner action; the question list below is prepared for it.

## Sources

| Source               | Content                                             | License      | Redistribution status                                              |
| -------------------- | --------------------------------------------------- | ------------ | ------------------------------------------------------------------ |
| amgidex              | Grammar lesson lists (all levels, `grammar_*.json`) | unspecified  | **Pending** — redistribution rights unconfirmed                    |
| Tatoeba              | Example sentences inside grammar lessons            | CC BY 2.0 FR | **Licensed** — attribution required in About; text bundled locally |
| japanesetest4you.com | JLPT exercise sets + listening audio (`jlpt/`)      | unspecified  | **Pending** — scraped sets and audio; rights unconfirmed           |

## Per-file provenance

- `data/clean/kana.json`, `kanji_*.json`, `vocabulary_*.json`: curated study content (the tracked pool since the 2026-09-21 cutover; the raw scrape under `data/generated/` it was derived from is retired). Per-file metadata records review state only (`meta.reviewed`, `meta.reading_policy`). No external source field is present; the grammar lists' origin is amgidex per the defect ledger (docs/data-quality.md).
- `data/clean/grammar_*.json`: lesson bodies from the amgidex grammar lists; example sentences from Tatoeba (CC BY 2.0 FR); N5 additionally marked `reviewed: true` with review sources recorded in `meta.review_sources`.
- `data/clean/practice_core.json`: reverse index over the JLPT sets below.
- `data/clean/jlpt/<level>/<category>.json`: scraped from japanesetest4you.com; every set carries its origin URL in `url`. Listening audio ships under `data/clean/audio/` (930 source URLs aliased to 184 local files, measured during Phase 2).

## Release status: blocked

Public release is **blocked** until redistribution rights are confirmed for the two unspecified-license sources. Reasons:

1. amgidex grammar lists ship in every level's lesson files; no license was granted or found.
2. japanesetest4you exercises and audio are scraped; the site's terms do not permit redistribution as far as we can verify offline, and the audio aliasing (docs/data-quality.md) means even correct playback depends on an unverified mapping.
3. Tatoeba content is licensed (CC BY 2.0 FR) but is embedded in grammar lessons that also carry amgidex text, so it does not unblock the lessons.

## Owner question list (rights confirmation)

1. **amgidex grammar lists**: may NihonCode redistribute the grammar lesson text (titles, patterns, explanations) in a local app, and under what license? Contact/attribution wording?
2. **japanesetest4you exercises**: may the scraped JLPT question sets be redistributed or shipped locally? If not, the JLPT feature must ship without these sets.
3. **japanesetest4you audio**: may the 184 listening MP3s be redistributed? If not, listening practice cannot ship with bundled audio.
4. **Tatoeba CC BY 2.0 FR**: confirm the bundled examples fall under the CC BY 2.0 FR blanket license and add the required attribution text to the About page.

Record each answer (or an explicit denial) in docs/decisions.md and flip the matching row in `src/content/sources.ts` from `pending` to `licensed` or `blocked` in the same change.
