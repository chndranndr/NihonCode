# Kita HTML mockup

Open `index.html` directly in a browser, or visit `/mockups/index.html` on the repository's development server. No build step or external resources are needed.

Nine linked views: Home, Progress, Learn, Config, Practice setup, Practice, Practice results, Grammar lesson, and JLPT practice. The footer's **Preview page** selector opens any view directly. JLPT offers Grammar/Kanji/Vocabulary set selection and uses the shared practice/results flow with multiple-choice answers. Its two sets use the same three sample questions in different orders; listening/reading stay unavailable.

Practice setup supports six sample matrices, search, pagination, question counts, kana scripts, number ranges, date modes, and conjugation examples. Start a session to try answers and see results. Config changes the preview theme and accent. The grammar lesson includes a short interactive question.

All data is illustrative. Level switches do not load real level content, sessions use the small sample pool, and preferences reset on reload. This mockup neither reads nor writes production progress. The real application is unchanged.

Home now shows a 91-day contribution calendar. Progress shows a year-selectable calendar and a four-axis breakdown of completed sessions (Drills, SRS Review, Grammar, JLPT). Select a day for exact counts; use arrow keys inside the calendar. The deterministic sample history ends on 22 September 2026 and is separate from interactive practice runs. Counts and category shares come from the same sample history. See PRD §10.13 for the production requirement, which is not implemented here.

Run the small interaction/data check with `node mockups/check.mjs` (uses the repository's existing jsdom dependency).
