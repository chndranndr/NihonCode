// Data audit: structural invariants over raw data/ (untrusted source content).
//
// Purpose (implementation_plan.md "Validate at the boundary", "Data reality
// drives sequencing"):
//   1. Detect silent drift in raw data/ — the dataset baselines were measured
//      and reviewed; any change must be a deliberate act recorded by
//      `--write-baseline`, never an accident.
//   2. Guard the MVP clean slice (DEVELOPMENT_PROMPT.md section 2): kana
//      46+46, kanji N5 marker-free, N5 latin-romaji vocab count, grammar N5
//      reviewed with every quiz answer inside its choices.
//   3. Publish the measured defect ledger consumed by docs/data-quality.md and
//      Phase 2 planning.
//
// Modes:
//   node scripts/audit-data.mjs                  compare against baseline, exit nonzero on drift
//   node scripts/audit-data.mjs --write-baseline regenerate scripts/data-baseline.json (deliberate act)
//   node scripts/audit-data.mjs --json           print the full report as JSON
//
// Never writes to data/. Read-only over source content.
//
// Field definitions (authoritative for the baseline numbers; small definitional
// deltas vs the PRD section 18 prose are documented in docs/data-quality.md):
//   latinRomaji      romaji is non-empty and every char is in \x20-\x7E
//   nonLatinRomaji   romaji missing, empty, or containing any non-ASCII char
//   markerAnswer     kanji answer string containing ASCII "." or "-"
//   packedReading    kana or romaji containing ";" "；" or "/"
//   truncatedPrompt  question prompt whose trim() is exactly "「"
//   audioHeaderOk    first bytes are "ID3" or an MPEG frame sync (0xFF 0b111x)
//   practice_core id level:category:set:question where set and question are
//                    1-based ARRAY POSITIONS (not the `number` field, which
//                    diverges from position on 281 of 5,339 questions — see
//                    docs/data-quality.md)

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  openSync,
  readSync,
  closeSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = join(repoRoot, "data");
const baselinePath = join(repoRoot, "scripts", "data-baseline.json");
const levels = ["n5", "n4", "n3", "n2", "n1"];
const cats = ["grammar", "reading", "kanji", "listening", "vocabulary"];
// Reviewed N5 Latin-romaji pool floor (docs/data-quality.md). A floor, not an
// equality: Phase 2 remediation may grow the pool. Deliberate dataset changes
// update this constant together with --write-baseline and the ledger.
const N5_LATIN_VOCAB_POOL_MIN = 643;

const args = new Set(process.argv.slice(2));
const writeBaseline = args.has("--write-baseline");
const asJson = args.has("--json");
const selfTest = args.has("--self-test");

/**
 * Gate evaluation shared by the real run and --self-test. Returns the list of
 * failing gate keys. A non-boolean gate entry is itself a failure: it could
 * never trip the boolean filter, so it is rejected loudly instead of skipped.
 */
function evaluateGate(cleanSlice) {
  const failures = [];
  for (const [key, value] of Object.entries(cleanSlice)) {
    if (typeof value !== "boolean")
      failures.push(`${key} (non-boolean gate entry: ${JSON.stringify(value)})`);
    else if (!value) failures.push(key);
  }
  return failures;
}

function rd(relPath) {
  return JSON.parse(readFileSync(join(dataRoot, relPath), "utf8"));
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const isLatin = (s) => typeof s === "string" && s.length > 0 && /^[\x20-\x7e]+$/.test(s);
const hasMarker = (s) => /[.-]/.test(s);
const isPacked = (s) => typeof s === "string" && /[;；/]/.test(s);

function measure() {
  // Scope to the raw source trees only: Phase 2 writes data/clean/ as generated
  // pipeline output, and remediation output must never register as raw-data
  // drift. data/clean/** is excluded by construction.
  const all = [...walk(join(dataRoot, "generated")), ...walk(join(dataRoot, "jlpt"))];
  const r = {};

  r.fileCounts = {
    json: all.filter((f) => f.endsWith(".json")).length,
    mp3: all.filter((f) => f.endsWith(".mp3")).length,
    ts: all.filter((f) => f.endsWith(".ts")).length,
  };

  // --- kana ---
  const kana = rd("generated/kana.json");
  r.kana = { hiragana: kana.hiragana.length, katakana: kana.katakana.length };

  // --- kanji ---
  const kanji = {
    total: 0,
    n5Entries: 0,
    n5MarkerAnswers: 0,
    markerEntriesN4N1: 0,
    markerAnswersN4N1: 0,
  };
  for (const lvl of levels) {
    const d = rd(`generated/kanji_${lvl}.json`);
    for (const g of d.groups) {
      for (const e of g.entries) {
        kanji.total++;
        if (lvl === "n5") kanji.n5Entries++;
        const markers = (e.answers || []).filter(hasMarker).length;
        if (lvl === "n5") kanji.n5MarkerAnswers += markers;
        else {
          kanji.markerAnswersN4N1 += markers;
          if (markers > 0) kanji.markerEntriesN4N1++;
        }
      }
    }
  }
  r.kanji = kanji;

  // --- vocabulary ---
  const vocab = {
    total: 0,
    latinRomaji: 0,
    latinRomajiN5: 0,
    latinRomajiNonN5: 0,
    nonLatinRomaji: 0,
    romajiEqualsKana: 0,
    emptyKanaAndRomaji: 0,
    kanjiInKana: 0,
    packedKana: 0,
    packedRomaji: 0,
  };
  for (const lvl of levels) {
    const d = rd(`generated/vocabulary_${lvl}.json`);
    for (const c of d.categories) {
      for (const e of c.entries) {
        vocab.total++;
        if (isLatin(e.romaji)) {
          vocab.latinRomaji++;
          if (lvl === "n5") vocab.latinRomajiN5++;
          else vocab.latinRomajiNonN5++;
        } else {
          vocab.nonLatinRomaji++;
          if (e.romaji === e.kana) vocab.romajiEqualsKana++;
        }
        if (!e.kana && !e.romaji) vocab.emptyKanaAndRomaji++;
        if (typeof e.kana === "string" && /[\u4e00-\u9fff]/.test(e.kana)) vocab.kanjiInKana++;
        if (isPacked(e.kana)) vocab.packedKana++;
        if (isPacked(e.romaji)) vocab.packedRomaji++;
      }
    }
  }
  r.vocab = vocab;

  // --- grammar ---
  const grammar = { lessons: 0, n5Lessons: 0, quizAnswersOutsideChoices: 0, reviewed: {} };
  for (const lvl of levels) {
    const d = rd(`generated/grammar_${lvl}.json`);
    grammar.lessons += d.lessons.length;
    if (lvl === "n5") grammar.n5Lessons = d.lessons.length;
    grammar.reviewed[lvl] = d.meta?.reviewed === true;
    for (const l of d.lessons) {
      for (const q of l.quiz || []) {
        if (!(q.choices || []).includes(q.answer)) grammar.quizAnswersOutsideChoices++;
      }
    }
  }
  r.grammar = grammar;

  // --- jlpt ---
  const jlpt = {
    sets: 0,
    questions: 0,
    nullAnswerIndex: 0,
    answerTextMismatch: 0,
    truncatedPrompts: 0,
    questionsWithRemoteImages: 0,
    passagesWithRemoteImages: 0,
    emptyPassages: 0,
    boilerplatePassages: 0,
    mp3UrlsInPassageImageUrls: 0,
    audioRefs: 0,
    distinctLocalAudio: 0,
    missingLocalAudio: 0,
    invalidAudioHeader: 0,
  };
  const localPaths = new Set();
  for (const lvl of levels) {
    for (const cat of cats) {
      const arr = rd(`jlpt/${lvl}/${cat}.json`);
      jlpt.sets += arr.length;
      for (const s of arr) {
        for (const q of s.questions || []) {
          jlpt.questions++;
          if (q.answer_index == null) jlpt.nullAnswerIndex++;
          else if (q.answer_text !== (q.options || [])[q.answer_index - 1])
            jlpt.answerTextMismatch++;
          if (typeof q.prompt === "string" && q.prompt.trim() === "「") jlpt.truncatedPrompts++;
          if ((q.image_urls || []).length > 0) jlpt.questionsWithRemoteImages++;
        }
        for (const p of s.passages || []) {
          const text = p.text || "";
          if (!text.trim()) jlpt.emptyPassages++;
          if (/Click here to download this test/i.test(text)) jlpt.boilerplatePassages++;
          const remoteImgs = (p.image_urls || []).filter(
            (u) => typeof u === "string" && !/\.mp3(\?|$)/i.test(u),
          );
          if (remoteImgs.length > 0) jlpt.passagesWithRemoteImages++;
          for (const u of p.image_urls || [])
            if (/\.mp3(\?|$)/i.test(u)) jlpt.mp3UrlsInPassageImageUrls++;
        }
        for (const a of s.audio || []) {
          jlpt.audioRefs++;
          if (a.local_path) localPaths.add(a.local_path);
        }
      }
    }
  }
  jlpt.distinctLocalAudio = localPaths.size;
  for (const lp of localPaths) {
    const p = join(dataRoot, "jlpt", lp);
    if (!existsSync(p)) {
      jlpt.missingLocalAudio++;
      continue;
    }
    if (statSync(p).size === 0) {
      jlpt.invalidAudioHeader++;
      continue;
    }
    const buf = Buffer.alloc(3);
    const fh = openSync(p, "r");
    try {
      readSync(fh, buf, 0, 3, 0);
    } finally {
      closeSync(fh);
    }
    const ok = buf.toString("latin1") === "ID3" || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);
    if (!ok) jlpt.invalidAudioHeader++;
  }
  r.jlpt = jlpt;

  // --- practice_core reverse index ---
  // Two resolutions are measured and reported; NEITHER is gated as the canonical
  // ID scheme. Positional resolution is a dangling-reference check (an ID that
  // resolves by nothing is a broken index). The `number` field cannot be a key:
  // sets contain duplicate and gapped numbers (measured below), and
  // DEVELOPMENT_PROMPT.md section 2 forbids position-based progress keys.
  // Canonical stable IDs are Phase 2 work (implementation_plan.md Phase 2.5).
  const pc = rd("generated/practice_core.json");
  const qIndexPos = new Set();
  const qIndexNum = new Set();
  let duplicateNumberSets = 0;
  let gappedNumberSets = 0;
  let numberPositionMismatch = 0;
  let questionsCounted = 0;
  for (const lvl of levels) {
    for (const cat of cats) {
      const arr = rd(`jlpt/${lvl}/${cat}.json`);
      arr.forEach((s, si) => {
        const numbers = [];
        (s.questions || []).forEach((q, qi) => {
          questionsCounted++;
          qIndexPos.add(`${lvl}:${cat}:${si + 1}:${qi + 1}`);
          if (q.number != null) {
            qIndexNum.add(`${lvl}:${cat}:${si + 1}:${q.number}`);
            numbers.push(q.number);
          }
          if (q.number !== qi + 1) numberPositionMismatch++;
        });
        if (new Set(numbers).size !== numbers.length) duplicateNumberSets++;
        else if (numbers.length > 0 && numbers.some((n, i) => n !== i + 1)) gappedNumberSets++;
      });
    }
  }
  const prc = {
    records: 0,
    countMismatches: 0,
    unresolvedByPosition: 0,
    unresolvedByNumber: 0,
    sharedIds: 0,
    numberPositionMismatch,
    duplicateNumberSets,
    gappedNumberSets,
    questions: questionsCounted,
  };
  const seen = new Map();
  for (const lvl of levels) {
    for (const kind of ["kanji", "vocabulary"]) {
      for (const e of pc[lvl][kind]) {
        prc.records++;
        if (e.questionCount !== e.questionIds.length) prc.countMismatches++;
        for (const id of e.questionIds) {
          if (!qIndexPos.has(id)) prc.unresolvedByPosition++;
          if (!qIndexNum.has(id)) prc.unresolvedByNumber++;
          seen.set(id, (seen.get(id) || 0) + 1);
        }
      }
    }
  }
  for (const c of seen.values()) if (c > 1) prc.sharedIds++;
  r.practiceCore = prc;

  // --- MVP clean slice gate (must hold for Phase 1 to ship) ---
  // Floors for counts later phases legitimately grow (Phase 2.6 kana extension,
  // N5 remediation); ceilings of zero for defects that must stay absent. Every
  // value MUST be boolean; evaluateGate rejects non-boolean entries so a future
  // numeric entry can never be silently skipped by the failure filter.
  r.cleanSlice = {
    kanaAtLeastBasic: r.kana.hiragana >= 46 && r.kana.katakana >= 46,
    kanjiN5AtLeast80: kanji.n5Entries >= 80,
    kanjiN5MarkerFree: kanji.n5MarkerAnswers === 0,
    vocabN5LatinPoolAtLeast: vocab.latinRomajiN5 >= N5_LATIN_VOCAB_POOL_MIN,
    noNonN5LatinLeak: vocab.latinRomajiNonN5 === 0,
    grammarN5Reviewed: grammar.reviewed.n5 === true,
    grammarQuizConsistent: grammar.quizAnswersOutsideChoices === 0,
    audioComplete: jlpt.missingLocalAudio === 0 && jlpt.invalidAudioHeader === 0,
    practiceCoreIndexIntact: prc.unresolvedByPosition === 0 && prc.countMismatches === 0,
  };

  return r;
}

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

if (selfTest) {
  // Prove the gate can actually fail: run evaluateGate against synthetic
  // cleanSlice reports, including the historical defect (a numeric entry that
  // the boolean failure filter silently skipped).
  const healthy = {
    kanaAtLeastBasic: true,
    kanjiN5AtLeast80: true,
    kanjiN5MarkerFree: true,
    vocabN5LatinPoolAtLeast: true,
    noNonN5LatinLeak: true,
    grammarN5Reviewed: true,
    grammarQuizConsistent: true,
    audioComplete: true,
    practiceCoreIndexIntact: true,
  };
  // The live gate must expose exactly these keys; a renamed gate entry that the
  // self-test does not know about is itself a failure.
  const liveKeys = Object.keys(measure().cleanSlice).sort();
  const healthyKeys = Object.keys(healthy).sort();
  if (JSON.stringify(liveKeys) !== JSON.stringify(healthyKeys)) {
    console.error(
      `audit-data --self-test: gate key drift — live [${liveKeys.join(", ")}] vs self-test [${healthyKeys.join(", ")}]`,
    );
    process.exit(1);
  }
  const cases = [
    { name: "healthy gate passes", slice: healthy, expect: [] },
    {
      name: "N4-N1 latin romaji leak fails the gate",
      slice: { ...healthy, noNonN5LatinLeak: false },
      expect: ["noNonN5LatinLeak"],
    },
    {
      name: "N5 latin pool below floor fails the gate",
      slice: { ...healthy, vocabN5LatinPoolAtLeast: false },
      expect: ["vocabN5LatinPoolAtLeast"],
    },
    {
      name: "non-boolean entry is rejected, not skipped",
      slice: { ...healthy, vocabNonN5LatinLeak: 3 },
      expect: ["vocabNonN5LatinLeak (non-boolean gate entry: 3)"],
    },
  ];
  let failures = 0;
  for (const c of cases) {
    const got = evaluateGate(c.slice);
    const ok = JSON.stringify(got) === JSON.stringify(c.expect);
    console.log(
      `  [${ok ? "PASS" : "FAIL"}] ${c.name}` +
        (ok ? "" : ` — expected ${JSON.stringify(c.expect)}, got ${JSON.stringify(got)}`),
    );
    if (!ok) failures++;
  }
  if (failures > 0) {
    console.error(`audit-data --self-test: ${failures} case(s) failed`);
    process.exit(1);
  }
  console.log("audit-data --self-test: OK (gate failure paths exercised)");
  process.exit(0);
}

const report = measure();

if (writeBaseline) {
  writeFileSync(baselinePath, JSON.stringify(report, null, 2) + "\n");
  console.log(`audit-data: baseline written to scripts/data-baseline.json`);
  process.exit(0);
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

if (!existsSync(baselinePath)) {
  console.error(
    "audit-data: scripts/data-baseline.json missing. Run: node scripts/audit-data.mjs --write-baseline",
  );
  process.exit(1);
}

const baseline = flatten(JSON.parse(readFileSync(baselinePath, "utf8")));
const current = flatten(report);
const drift = [];
for (const key of Object.keys(baseline).sort()) {
  const b = JSON.stringify(baseline[key]);
  const c = JSON.stringify(current[key]);
  if (b !== c) drift.push(`${key}: baseline ${b} -> observed ${c}`);
}
for (const key of Object.keys(current).sort()) {
  if (!(key in baseline))
    drift.push(`${key}: new metric (absent from baseline) -> ${JSON.stringify(current[key])}`);
}

const gateFailures = evaluateGate(report.cleanSlice);

if (drift.length > 0 || gateFailures.length > 0) {
  if (drift.length > 0) {
    console.error(
      `audit-data: ${drift.length} baseline drift(s) in raw data/ (must never change silently):`,
    );
    for (const d of drift) console.error(`  ${d}`);
  }
  if (gateFailures.length > 0) {
    console.error(`audit-data: MVP clean-slice gate FAILED: ${gateFailures.join(", ")}`);
  }
  console.error(
    "\nRemediation: raw data/ is user-owned and must not be hand-edited. If the change was a deliberate,\n" +
      "reviewed dataset update, record it with `node scripts/audit-data.mjs --write-baseline` and update\n" +
      "docs/data-quality.md in the same change. See docs/data-quality.md for the defect ledger.",
  );
  process.exit(1);
}

const metricCount = Object.keys(current).length;
console.log(`audit-data: OK (${metricCount} metrics match baseline; clean-slice gate holds)`);
