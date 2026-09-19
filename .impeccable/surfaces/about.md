---
version: 1
slug: "about"
primary_target: "about"
related_targets: []
---

# Surface brief: About (CONFIG subview)

Scope and visitor mode: Read. A CONFIG subview beside Settings (SETTINGS / ABOUT tabs), keeping the four-slot command bar and rail exactly as the PRD words them. Carries the full manifest: product summary and local-first stance, storage truth (browser-local, no cloud sync, clearing browser data wipes progress), tech list (React 19, TypeScript, Vite, ts-fsrs, Web Speech API), content attribution with license and clearance status per source, contact email, version and build stamp. No changelog ledger at launch.

Audience, job, action, proof: A curious or cautious learner (or a reviewer) wants to know what this app is, where their data lives, and what content it stands on. They read, verify, and leave. Proof is factual rows only: every value is true at build time or marked pending. The storage section states the wipe-on-clear truth as its own rows, not buried prose.

Chosen direction and memorable moment: System info readout, locked from the surface roll (seed f31ee05e, dealt 5/1/4, lead taken). About reads as a console system-info screen: framed key-value sections in monospace (PRODUCT, STANCE, PLATFORM, STORAGE, SPEECH, SCHEDULER), then a CONTENT SOURCES ledger with license and clearance status inline per source, then CONTACT and the version stamp. The memorable moment is the sources ledger: the page names every dataset origin and its license, with pending clearances shown as pending, which is the most honest thing an About page in this product can do.

Constraints: contact email ships as a clearly-marked placeholder (hello@NihonCode.app) listed in the handoff as a user-supplied asset to replace before release; the UI marks it as placeholder so no real inbox is invented. Clearance statuses render from a data file, never hardcoded prose, so Phase 2.7 updates flip them without a redesign. Console vocabulary inherited: hairline panels, corner ticks, mono face, tracked uppercase micro-labels, semantic accents. No glass, gradients, rounded shells, or display serifs. Read-mode measure: value columns stay scannable; long license names wrap, never truncate.

Open decisions: exact mono and JP faces chosen at build by measurement; whether the version stamp includes a build hash; whether the sources ledger links out to each license text or names it inline only.

## Direction contract

THESIS: About is a system-info readout, framed key-value rows that state what the product is and what it stands on. It refuses the marketing About page with hero copy and feature recaps.

OWN-WORLD: Near-black ground, hairline panel borders with corner ticks, monospace UI face, tracked uppercase micro-labels, semantic accent roles for status values (green cleared, orange pending), box-drawing section rules. Recognizable with all content removed.

STORY: The reader verifies the product's claims row by row: what it is, where data lives, what breaks when storage clears, which sources the content stands on and at what license status. Trust is earned by precision, not persuasion.

FIRST VIEWPORT: The framed system-info block fills the first viewport: PRODUCT, STANCE, PLATFORM, STORAGE, SPEECH, SCHEDULER rows, with the CONTENT SOURCES ledger beginning below the fold on short screens and within it on tall ones. No hero, no imagery.

FORM: System info readout, position 5 of 7 in the grounded ordered list (marketing About page, colophon plate, FAQ accordion, changelog timeline, system info readout, license ledger first, credits roll). Seed f31ee05e, dealt 5, 1, 4; the roll's lead locked by the user.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
