// audit-clean: the tracked-pool validator. data/clean/ is the repository's
// single source of truth (committed; docs/decisions.md 2026-09-21), so this
// script is the guardrail against bad edits: zero defect classes, unique IDs,
// graded-pool floors, practice_core referential integrity, and every
// referenced listening MP3 present on disk.
//
//   node scripts/audit-clean.mjs              validate data/clean/
//   node scripts/audit-clean.mjs --self-test  prove each guard fires

import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { scrubJapanese } from "./lib/scrub.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const cleanRoot = join(repoRoot, "data", "clean");
const levels = ["n5", "n4", "n3", "n2", "n1"];
const cats = ["grammar", "reading", "kanji", "listening", "vocabulary"];

const isLatin = (s) => typeof s === "string" && s.length > 0 && /^[\x20-\x7e]+$/.test(s);
const hasMarker = (s) => /[.-]/.test(s);
const REMOTE = /^https?:\/\//i;
const BOILERPLATE = /Click here to download this test/i;
// scrubJapanese is idempotent: if it changes a tracked string, a scraper
// artifact (control byte or U+FF0D hyphen) was reintroduced by an edit.
const scrubbed = (s) => typeof s === "string" && scrubJapanese(s) === s;
const VERB_CLASSES = new Set(["godan", "ichidan", "irregular"]);
const ADJ_CLASSES = new Set(["i", "na"]);

// Graded-pool floors (docs/data-quality.md "Tracked-pool gate").
const FLOORS = {
  kanaHiragana: 46,
  kanaKatakana: 46,
  kanji: { n5: 80, n4: 166, n3: 367, n2: 367, n1: 1232 },
  vocab: { n5: 738, n4: 649, n3: 2097, n2: 1682, n1: 2655 },
  grammarGraded: { n5: 72, n4: 130, n3: 67, n2: 71, n1: 45 },
};

// Self-test fixture: put a U+FF0D into the first passage title found, so the
// title-scrub assertion is proven to fire (the tracked pool is healthy).
function injectTitleArtifact(root) {
  for (const lvl of levels)
    for (const cat of cats) {
      const path = join(root, "jlpt", lvl, `${cat}.json`);
      if (!existsSync(path)) continue;
      const sets = JSON.parse(readFileSync(path, "utf8"));
      for (const set of sets) {
        const p = (set.passages || [])[0];
        if (!p) continue;
        p.title = `${p.title || "題"}\uff0d`;
        writeFileSync(path, JSON.stringify(sets), "utf8");
        return true;
      }
    }
  return false;
}

export function auditClean(root) {
  const rd = (rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));
  const failures = [];
  const fail = (msg) => failures.push(msg);

  function assertUniqueIds(poolName, ids) {
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id)) fail(`${poolName}: duplicate ID ${id}`);
      seen.add(id);
    }
  }

  const kana = rd("kana.json");
  assertUniqueIds(
    "kana",
    [...kana.hiragana, ...kana.katakana].map((e) => e.id),
  );
  for (const table of ["hiragana", "katakana"]) {
    for (const e of kana[table]) {
      if (!isLatin(e.romaji)) fail(`kana ${table} ${e.char}: non-latin romaji "${e.romaji}"`);
      // Ids are content-derived (src/content/ids.ts); a stored id that
      // disagrees with its own fields orphans progress rows silently.
      if (e.id !== `kana:${table}:${e.char}`)
        fail(`kana ${table} ${e.char}: id "${e.id}" does not match its char`);
    }
  }
  if (kana.hiragana.length < FLOORS.kanaHiragana)
    fail(`kana hiragana below floor: ${kana.hiragana.length} < ${FLOORS.kanaHiragana}`);
  if (kana.katakana.length < FLOORS.kanaKatakana)
    fail(`kana katakana below floor: ${kana.katakana.length} < ${FLOORS.kanaKatakana}`);

  const kanjiCounts = {};
  for (const lvl of levels) {
    const d = rd(`kanji_${lvl}.json`);
    const ids = [];
    for (const g of d.groups) {
      for (const e of g.entries) {
        ids.push(e.id);
        const marked = (e.answers || []).filter(hasMarker);
        if (marked.length > 0) {
          fail(`kanji ${lvl} ${e.kanji}: dictionary markers in accepted set: ${marked.join(", ")}`);
        }
        if (e.id !== `kanji:${lvl}:${e.kanji}`)
          fail(`kanji ${lvl} ${e.kanji}: id "${e.id}" does not match its kanji`);
      }
    }
    kanjiCounts[lvl] = ids.length;
    assertUniqueIds(`kanji_${lvl}`, ids);
  }
  for (const lvl of Object.keys(FLOORS.kanji))
    if (kanjiCounts[lvl] < FLOORS.kanji[lvl])
      fail(`kanji ${lvl} below floor: ${kanjiCounts[lvl]} < ${FLOORS.kanji[lvl]}`);

  const vocabCounts = {};
  for (const lvl of levels) {
    const d = rd(`vocabulary_${lvl}.json`);
    const ids = [];
    for (const c of d.categories) {
      for (const e of c.entries) {
        ids.push(e.id);
        if (!isLatin(e.romaji)) {
          fail(`vocab ${lvl} ${e.id}: non-latin romaji "${e.romaji}"`);
        }
        if (e.id !== `vocab:${lvl}:${e.kanji}|${e.kana}`)
          fail(`vocab ${lvl} ${e.id}: id does not match its kanji|kana`);
        if ((c.id === "verbs" || c.id === "adjectives") && lvl === "n5") {
          // Curated per entry (DEVELOPMENT_PROMPT task 1); N4-N1 get theirs
          // with their curation pass, then this guard extends level by level.
          const pos = c.id === "verbs" ? "verb" : "adjective";
          const classes = c.id === "verbs" ? VERB_CLASSES : ADJ_CLASSES;
          if (e.pos !== pos || !classes.has(e.conjugationClass))
            fail(`vocab ${lvl} ${e.id}: ${c.id} entry missing valid ${pos} conjugation class`);
        } else if (e.pos !== undefined || e.conjugationClass !== undefined) {
          fail(`vocab ${lvl} ${e.id}: conjugation metadata on non-conjugable ${c.id}`);
        }
      }
    }
    vocabCounts[lvl] = ids.length;
    assertUniqueIds(`vocabulary_${lvl}`, ids);
  }
  for (const lvl of Object.keys(FLOORS.vocab))
    if (vocabCounts[lvl] < FLOORS.vocab[lvl])
      fail(`vocab ${lvl} below floor: ${vocabCounts[lvl]} < ${FLOORS.vocab[lvl]}`);

  const gradedCounts = {};
  for (const lvl of levels) {
    const d = rd(`grammar_${lvl}.json`);
    const ids = [];
    let graded = 0;
    for (const l of d.lessons) {
      ids.push(l.id);
      if (l.graded) {
        graded++;
        const quizStrings = [];
        for (const q of l.quiz || []) {
          quizStrings.push(q.answer ?? "", ...(q.choices || []));
          if (!(q.choices || []).includes(q.answer)) {
            fail(`grammar ${lvl} ${l.id}: quiz ${q.id} answer not among choices`);
          }
        }
        if (quizStrings.some((s) => /[〜～]/.test(s))) {
          fail(`grammar ${lvl} ${l.id}: graded lesson still holds ～ in quiz strings`);
        }
      }
    }
    gradedCounts[lvl] = graded;
    assertUniqueIds(`grammar_${lvl}`, ids);
  }
  for (const lvl of Object.keys(FLOORS.grammarGraded))
    if (gradedCounts[lvl] < FLOORS.grammarGraded[lvl])
      fail(
        `grammar ${lvl} graded below floor: ${gradedCounts[lvl]} < ${FLOORS.grammarGraded[lvl]}`,
      );

  const jlptIds = [];
  // Media contract (data-recon 2026-09-23): provenance keeps the source URL,
  // runtime uses the local copy. Every local_path must exist; bare image_urls
  // arrays and any remote runtime path are violations.
  function checkImages(owner, images) {
    for (const im of images || []) {
      if (!im.url) fail(`${owner}: image without provenance url`);
      if (!im.local_path) fail(`${owner}: image without local_path`);
      else if (REMOTE.test(im.local_path)) fail(`${owner}: remote local_path ${im.local_path}`);
      else if (!/\.\w+$/.test(im.local_path))
        fail(`${owner}: image local_path lacks an extension: ${im.local_path}`);
      else if (/\.mp3$/i.test(im.local_path)) fail(`${owner}: mp3 referenced as image`);
      else if (!existsSync(join(root, im.local_path)))
        fail(`${owner}: missing local image ${im.local_path}`);
    }
  }
  for (const lvl of levels) {
    for (const cat of cats) {
      const arr = rd(`jlpt/${lvl}/${cat}.json`);
      for (const set of arr) {
        const passageIds = new Set((set.passages || []).map((p) => p.id));
        for (const q of set.questions || []) {
          jlptIds.push(q.id);
          if (typeof q.prompt === "string" && q.prompt.trim() === "「") {
            fail(`jlpt ${lvl} ${cat} ${set.set_number} ${q.id}: truncated prompt in graded pool`);
          }
          if (q.answer_index == null) {
            fail(`jlpt ${lvl} ${cat} ${set.set_number} ${q.id}: null answer_index in graded pool`);
          }
          if (new Set(q.options || []).size !== (q.options || []).length)
            fail(`jlpt ${lvl} ${cat} ${q.id}: duplicate options in graded pool`);
          if ((q.image_urls || []).length > 0) {
            fail(`jlpt ${lvl} ${cat} ${q.id}: bare image_urls survived (use images[])`);
          }
          checkImages(`jlpt ${lvl} ${cat} ${q.id}`, q.images);
          if (q.passage_id && !passageIds.has(q.passage_id)) {
            fail(`jlpt ${lvl} ${cat} ${q.id}: passage_id ${q.passage_id} unresolved in set`);
          }
          if (q.audio) {
            if (REMOTE.test(q.audio.local_path || ""))
              fail(`jlpt ${lvl} ${cat} ${q.id}: remote audio local_path`);
            if (!q.audio.local_path || !existsSync(join(root, q.audio.local_path)))
              fail(`jlpt ${lvl} ${cat} ${q.id}: missing audio file ${q.audio.local_path}`);
            const span = q.audio.span;
            if (
              !span ||
              typeof span.start !== "number" ||
              typeof span.end !== "number" ||
              span.end <= span.start
            )
              fail(`jlpt ${lvl} ${cat} ${q.id}: audio binding without a valid span`);
          }
          if (q.answer_index != null) {
            const opt = (q.options || [])[q.answer_index];
            if (opt !== q.answer_text) {
              fail(`jlpt ${lvl} ${cat} ${q.id}: answer_text does not match options[answer_index]`);
            }
          }
          if (typeof q.explanation === "string" && q.explanation.length) {
            const t = q.explanation
              .trim()
              .replace(/["'’”）」』)\]]+$/, "")
              .trim();
            if (t.length < 20 || !/[。．.!！?？]$/.test(t))
              fail(`jlpt ${lvl} ${cat} ${q.id}: truncated or unterminated explanation`);
          }
          const scrubFields = [
            q.prompt,
            ...(q.options || []),
            q.answer_text,
            q.explanation,
            q.answered_sentence,
          ];
          for (const s of scrubFields) {
            if (typeof s !== "string") continue;
            if (!scrubbed(s))
              fail(`jlpt ${lvl} ${cat} ${q.id}: scrub artifact survived in question text`);
          }
        }
        for (const p of set.passages || []) {
          const text = (p.text || "").trim();
          if (!text && !(p.images || []).length)
            fail(`jlpt ${lvl} ${cat} ${set.set_number} ${p.id}: empty passage survived`);
          if (BOILERPLATE.test(text))
            fail(`jlpt ${lvl} ${cat} ${set.set_number} ${p.id}: boilerplate passage survived`);
          if ((p.image_urls || []).length > 0)
            fail(`jlpt ${lvl} ${cat} ${p.id}: image_urls survived on passage`);
          checkImages(`jlpt ${lvl} ${cat} ${p.id}`, p.images);
          if (!scrubbed(p.text || "") || !scrubbed(p.title || ""))
            fail(`jlpt ${lvl} ${cat} ${p.id}: scrub artifact survived in passage`);
          if (cat === "reading" && !(set.questions || []).some((q) => q.passage_id === p.id))
            fail(`jlpt ${lvl} ${cat} ${set.set_number} ${p.id}: passage referenced by no question`);
        }
        for (const a of set.audio || []) {
          if (REMOTE.test(a.local_path || "")) {
            fail(`jlpt ${lvl} ${cat} ${set.set_number}: remote audio local_path`);
          }
          if (a.local_path && !existsSync(join(root, a.local_path))) {
            fail(`jlpt ${lvl} ${cat} ${set.set_number}: missing audio file ${a.local_path}`);
          }
        }
      }
    }
  }
  assertUniqueIds("jlpt", jlptIds);

  // practice_core integrity: every reverse-index reference must resolve to a
  // question that exists in the graded pools, with matching counts.
  const jlptIdSet = new Set(jlptIds);
  const core = rd("practice_core.json");
  for (const lvl of levels) {
    for (const cat of Object.keys(core[lvl] || {})) {
      for (const rec of core[lvl][cat]) {
        const refs = rec.questionIds || [];
        if (rec.questionCount !== refs.length)
          fail(
            `practice_core ${lvl} ${cat} ${rec.kanji ?? rec.vocab ?? "?"}: questionCount ${rec.questionCount} != ${refs.length} refs`,
          );
        for (const qid of refs) {
          if (!jlptIdSet.has(qid))
            fail(`practice_core ${lvl} ${cat}: dangling question ref ${qid}`);
        }
      }
    }
  }

  return failures;
}

// CLI entry guard: importing this module (e.g. for programmatic census) must
// not run the validator or exit. Missing argv[1] (piped stdin, odd wrappers)
// falls through to CLI execution — a silent skip would be a vacuous pass.
const isDirectRun = !process.argv[1] || fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectRun) {
  if (process.argv.includes("--self-test")) {
    // Prove the validator fails on: a duplicate ID, a scrub artifact in a
    // passage title, a graded pool dropping below its floor, a referenced MP3
    // going missing, and a stored id that disagrees with its own content
    // fields. Each fixture is the only executable proof its guard fires (the
    // tracked pool is healthy, so none can occur naturally).
    const tmp = mkdtempSync(join(tmpdir(), "audit-clean-selftest-"));
    try {
      cpSync(cleanRoot, tmp, { recursive: true });
      const vocabPath = join(tmp, "vocabulary_n5.json");
      const vocab = JSON.parse(readFileSync(vocabPath, "utf8"));
      const first = vocab.categories[0].entries[0];
      vocab.categories[0].entries[1].id = first.id;
      writeFileSync(vocabPath, JSON.stringify(vocab), "utf8");
      const failures = auditClean(tmp);
      if (!failures.some((f) => f.includes("duplicate ID"))) {
        console.error("audit-clean --self-test: FAIL — duplicate ID not detected");
        process.exit(1);
      }
      rmSync(vocabPath);
      cpSync(join(cleanRoot, "vocabulary_n5.json"), vocabPath);
      if (!injectTitleArtifact(tmp)) {
        console.error("audit-clean --self-test: FAIL — no passage found to inject into");
        process.exit(1);
      }
      const titleFailures = auditClean(tmp);
      if (!titleFailures.some((f) => f.includes("scrub artifact survived in passage"))) {
        console.error("audit-clean --self-test: FAIL — passage title artifact not detected");
        process.exit(1);
      }
      const floorVocab = JSON.parse(readFileSync(vocabPath, "utf8"));
      floorVocab.categories[0].entries = floorVocab.categories[0].entries.slice(0, 10);
      writeFileSync(vocabPath, JSON.stringify(floorVocab), "utf8");
      const floorFailures = auditClean(tmp);
      if (!floorFailures.some((f) => f.includes("vocab n5 below floor"))) {
        console.error("audit-clean --self-test: FAIL — graded-pool floor not detected");
        process.exit(1);
      }
      rmSync(vocabPath);
      cpSync(join(cleanRoot, "vocabulary_n5.json"), vocabPath);
      let audioRel = null;
      const sets = JSON.parse(readFileSync(join(tmp, "jlpt", "n5", "listening.json"), "utf8"));
      outer: for (const s of sets)
        for (const a of s.audio || [])
          if (a.local_path) {
            audioRel = a.local_path;
            break outer;
          }
      if (!audioRel) {
        console.error("audit-clean --self-test: FAIL — no audio ref found to delete");
        process.exit(1);
      }
      rmSync(join(tmp, audioRel));
      const audioFailures = auditClean(tmp);
      if (!audioFailures.some((f) => f.includes("missing audio file"))) {
        console.error("audit-clean --self-test: FAIL — missing audio file not detected");
        process.exit(1);
      }
      const deriveVocab = JSON.parse(readFileSync(vocabPath, "utf8"));
      deriveVocab.categories[0].entries[0].kana = "かわったよみ";
      writeFileSync(vocabPath, JSON.stringify(deriveVocab), "utf8");
      const deriveFailures = auditClean(tmp);
      if (!deriveFailures.some((f) => f.includes("does not match its kanji|kana"))) {
        console.error(
          "audit-clean --self-test: FAIL — id/content derivation mismatch not detected",
        );
        process.exit(1);
      }
      rmSync(vocabPath);
      cpSync(join(cleanRoot, "vocabulary_n5.json"), vocabPath);
      const classVocab = JSON.parse(readFileSync(vocabPath, "utf8"));
      const verbsCat = classVocab.categories.find((c) => c.id === "verbs");
      verbsCat.entries[0].conjugationClass = "ichidan-super";
      writeFileSync(vocabPath, JSON.stringify(classVocab), "utf8");
      const classFailures = auditClean(tmp);
      if (!classFailures.some((f) => f.includes("conjugation class"))) {
        console.error("audit-clean --self-test: FAIL — invalid conjugation class not detected");
        process.exit(1);
      }
      const listeningPath = join(tmp, "jlpt", "n5", "listening.json");
      const listeningSets = JSON.parse(readFileSync(listeningPath, "utf8"));
      const probeSet = listeningSets.find((s) => (s.questions || []).length > 0);
      if (!probeSet) {
        console.error("audit-clean --self-test: FAIL — no listening question to inject into");
        process.exit(1);
      }
      probeSet.questions[0].image_urls = ["https://example.com/x.jpg"];
      writeFileSync(listeningPath, JSON.stringify(listeningSets), "utf8");
      const imgFailures = auditClean(tmp);
      if (!imgFailures.some((f) => f.includes("bare image_urls survived"))) {
        console.error("audit-clean --self-test: FAIL — bare image_urls not detected");
        process.exit(1);
      }
      const explainPath = join(tmp, "jlpt", "n3", "grammar.json");
      const explainSets = JSON.parse(readFileSync(explainPath, "utf8"));
      let explainTarget = null;
      outer2: for (const s of explainSets)
        for (const q of s.questions || [])
          if (typeof q.explanation === "string") {
            explainTarget = q;
            break outer2;
          }
      if (!explainTarget) {
        console.error(
          "audit-clean --self-test: FAIL — no question explanation found to inject into",
        );
        process.exit(1);
      }
      explainTarget.explanation += "\uff0d";
      writeFileSync(explainPath, JSON.stringify(explainSets), "utf8");
      const explainFailures = auditClean(tmp);
      if (!explainFailures.some((f) => f.includes("scrub artifact survived in question text"))) {
        console.error("audit-clean --self-test: FAIL — explanation scrub artifact not detected");
        process.exit(1);
      }
      explainTarget.explanation = "「維持」(iji) means";
      writeFileSync(explainPath, JSON.stringify(explainSets), "utf8");
      const stubFailures = auditClean(tmp);
      if (!stubFailures.some((f) => f.includes("truncated or unterminated explanation"))) {
        console.error("audit-clean --self-test: FAIL — truncated explanation not detected");
        process.exit(1);
      }
      const dupPath = join(tmp, "jlpt", "n5", "listening.json");
      const dupSets = JSON.parse(readFileSync(dupPath, "utf8"));
      const dupProbe = dupSets.find((s) => (s.questions || []).length > 0);
      if (!dupProbe) {
        console.error(
          "audit-clean --self-test: FAIL — no listening question for duplicate-options probe",
        );
        process.exit(1);
      }
      dupProbe.questions[0].options = [
        ...dupProbe.questions[0].options,
        dupProbe.questions[0].options[0],
      ];
      writeFileSync(dupPath, JSON.stringify(dupSets), "utf8");
      const dupFailures = auditClean(tmp);
      if (!dupFailures.some((f) => f.includes("duplicate options"))) {
        console.error("audit-clean --self-test: FAIL — duplicate options not detected");
        process.exit(1);
      }
      console.log(
        "audit-clean --self-test: OK (duplicate ID, passage title artifact, pool floor, missing audio, id derivation, conjugation class, bare image_urls, explanation scrub artifact, duplicate options rejected)",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    process.exit(0);
  }

  if (!existsSync(join(cleanRoot, "kana.json"))) {
    console.error("audit-clean: data/clean/ missing — it is tracked; restore it from git");
    process.exit(1);
  }

  const failures = auditClean(cleanRoot);
  if (failures.length > 0) {
    console.error(`audit-clean: FAIL (${failures.length} finding(s))`);
    for (const f of failures.slice(0, 40)) console.error(`  - ${f}`);
    if (failures.length > 40) console.error(`  … ${failures.length - 40} more`);
    process.exit(1);
  }

  console.log("audit-clean: OK (zero defects, floors hold, IDs unique, audio present)");
}
