/**
 * The untrusted->typed boundary (implementation_plan.md "Validate at the
 * gate"). The app's only data source is data/clean/ — the committed, curated
 * single source of truth (owner adjudications in curation/adjudications.json;
 * guarded by scripts/audit-clean.mjs). These validators are the last line of
 * defense between that pool and the typed domain models: anything malformed
 * is flagged and excluded from the graded pool, never thrown on.
 *
 * Clean-pool invariants asserted here (mirroring scripts/audit-clean.mjs):
 * stamped namespaced ids match their content fields, romaji is Latin, kana
 * readings are non-empty and unpacked, kanji answers are marker-free and
 * non-empty, only graded grammar lessons enter the pool with answer-in-
 * choices quizzes, and only keyed internally-consistent JLPT questions are
 * served.
 */

import { z } from "zod";

import { grammarLessonId, kanaId, kanjiId, vocabId, type JlptLevel } from "./ids";
import type {
  Flag,
  GateResult,
  GrammarLesson,
  JlptCategory,
  JlptSet,
  KanaItem,
  KanjiItem,
  VocabItem,
} from "./models";

const LATIN_ROMAJI = /^[\x20-\x7e]+$/;
const DICTIONARY_MARKER = /[.-]/;

export function isLatinRomaji(value: string): boolean {
  return LATIN_ROMAJI.test(value);
}

// ---------------------------------------------------------------- schemas ---

const kanaEntrySchema = z.object({ id: z.string(), char: z.string(), romaji: z.string() });

const kanaSchema = z.object({
  hiragana: z.array(kanaEntrySchema),
  katakana: z.array(kanaEntrySchema),
});

const kanjiEntrySchema = z.object({
  id: z.string(),
  kanji: z.string(),
  reading: z.string(),
  meaning: z.string(),
  answers: z.array(z.string()),
});

const kanjiFileSchema = z.object({
  groups: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      entries: z.array(z.unknown()),
    }),
  ),
  meta: z.unknown().nullish(),
});

const vocabEntrySchema = z.object({
  id: z.string(),
  kanji: z.string(),
  romaji: z.string(),
  meaning: z.string(),
  kana: z.string(),
  kanaVariants: z.array(z.string()).optional(),
  romajiVariants: z.array(z.string()).optional(),
  pos: z.enum(["verb", "adjective"]).optional(),
  conjugationClass: z.enum(["godan", "ichidan", "irregular", "i", "na"]).optional(),
});

const vocabFileSchema = z.object({
  categories: z.array(
    z.object({
      id: z.string().nullable(),
      name: z.string(),
      entries: z.array(z.unknown()),
    }),
  ),
});

const grammarLessonSchema = z.object({
  id: z.string(),
  graded: z.boolean(),
  defects: z.array(z.string()),
  title: z.string(),
  level: z.string(),
  category: z.string(),
  pattern: z.string(),
  explanation: z.string(),
  examples: z.array(
    z.object({ jp: z.string(), romaji: z.string().optional(), en: z.string().optional() }),
  ),
  quiz: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      question_en: z.string().optional(),
      question_jp: z.string().optional(),
      choices: z.array(z.string()),
      answer: z.string(),
    }),
  ),
});

const grammarFileSchema = z.object({
  lessons: z.array(z.unknown()),
  meta: z.unknown().nullish(),
});

// ------------------------------------------------------------------ gates ---

export function validateKana(raw: unknown): GateResult<KanaItem> {
  const parsed = kanaSchema.safeParse(raw);
  if (!parsed.success) {
    return { items: [], flags: [{ source: "kana.json", id: null, reason: "file schema invalid" }] };
  }
  const items: KanaItem[] = [];
  const flags: Flag[] = [];
  for (const table of ["hiragana", "katakana"] as const) {
    for (const entry of parsed.data[table]) {
      if (entry.id !== kanaId(table, entry.char)) {
        flags.push({
          source: `kana.json:${table}`,
          id: entry.id,
          reason: "id does not match char",
        });
        continue;
      }
      if (entry.char.length === 0 || !isLatinRomaji(entry.romaji)) {
        flags.push({
          source: `kana.json:${table}`,
          id: entry.id,
          reason: `unreadable entry (char "${entry.char}", romaji "${entry.romaji}")`,
        });
        continue;
      }
      items.push({ id: entry.id, table, char: entry.char, romaji: entry.romaji });
    }
  }
  return { items, flags };
}

export function validateKanji(raw: unknown, level: JlptLevel): GateResult<KanjiItem> {
  const parsed = kanjiFileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      items: [],
      flags: [{ source: `kanji_${level}.json`, id: null, reason: "file schema invalid" }],
    };
  }
  const items: KanjiItem[] = [];
  const flags: Flag[] = [];
  for (const group of parsed.data.groups) {
    for (const entryRaw of group.entries) {
      const entry = kanjiEntrySchema.safeParse(entryRaw);
      if (!entry.success) {
        flags.push({
          source: `kanji_${level}.json:${group.id}`,
          id: null,
          reason: "entry schema invalid",
        });
        continue;
      }
      const id = kanjiId(level, entry.data.kanji);
      if (entry.data.id !== id) {
        flags.push({
          source: `kanji_${level}.json:${group.id}`,
          id: entry.data.id,
          reason: "id does not match kanji",
        });
        continue;
      }
      const marked = entry.data.answers.filter((a) => DICTIONARY_MARKER.test(a));
      if (marked.length > 0) {
        flags.push({
          source: `kanji_${level}.json:${group.id}`,
          id,
          reason: `dictionary markers in answers: ${marked.slice(0, 3).join(", ")}`,
        });
        continue;
      }
      if (entry.data.answers.length === 0) {
        flags.push({
          source: `kanji_${level}.json:${group.id}`,
          id,
          reason: "no accepted answers",
        });
        continue;
      }
      items.push({
        id,
        level,
        char: entry.data.kanji,
        reading: entry.data.reading,
        meaning: entry.data.meaning,
        answers: entry.data.answers,
      });
    }
  }
  return { items, flags };
}

export function validateVocab(raw: unknown, level: JlptLevel): GateResult<VocabItem> {
  const parsed = vocabFileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      items: [],
      flags: [{ source: `vocabulary_${level}.json`, id: null, reason: "file schema invalid" }],
    };
  }
  const items: VocabItem[] = [];
  const flags: Flag[] = [];
  for (const category of parsed.data.categories) {
    for (const entryRaw of category.entries) {
      const entry = vocabEntrySchema.safeParse(entryRaw);
      if (!entry.success) {
        flags.push({
          source: `vocabulary_${level}.json:${category.id}`,
          id: null,
          reason: "entry schema invalid",
        });
        continue;
      }
      const id = vocabId(level, entry.data.kanji, entry.data.kana);
      if (entry.data.id !== id) {
        flags.push({
          source: `vocabulary_${level}.json:${category.id}`,
          id: entry.data.id,
          reason: "id does not match kanji+kana",
        });
        continue;
      }
      if (!isLatinRomaji(entry.data.romaji)) {
        flags.push({
          source: `vocabulary_${level}.json:${category.id}`,
          id,
          reason: "romaji holds Japanese text (Problem A); excluded from graded pool",
        });
        continue;
      }
      if (entry.data.kana.length === 0) {
        flags.push({
          source: `vocabulary_${level}.json:${category.id}`,
          id,
          reason: "empty kana reading",
        });
        continue;
      }
      if (/[;；/]/.test(entry.data.romaji) || /[;；]/.test(entry.data.kana)) {
        flags.push({
          source: `vocabulary_${level}.json:${category.id}`,
          id,
          reason:
            "packed alternatives (Problem C); needs a variants list before exact-match grading",
        });
        continue;
      }
      items.push({
        id,
        level,
        kanji: entry.data.kanji,
        kana: entry.data.kana,
        romaji: entry.data.romaji,
        meaning: entry.data.meaning,
        pos: entry.data.pos,
        conjugationClass: entry.data.conjugationClass,
      });
    }
  }
  return { items, flags };
}

export function validateGrammar(raw: unknown, level: JlptLevel): GateResult<GrammarLesson> {
  const parsed = grammarFileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      items: [],
      flags: [{ source: `grammar_${level}.json`, id: null, reason: "file schema invalid" }],
    };
  }
  const prefix = `grammar:${level}:`;
  const items: GrammarLesson[] = [];
  const flags: Flag[] = [];
  for (const lessonRaw of parsed.data.lessons) {
    const lesson = grammarLessonSchema.safeParse(lessonRaw);
    if (!lesson.success) {
      flags.push({ source: `grammar_${level}.json`, id: null, reason: "lesson schema invalid" });
      continue;
    }
    if (!lesson.data.id.startsWith(prefix)) {
      flags.push({
        source: `grammar_${level}.json`,
        id: lesson.data.id,
        reason: "id outside this level's namespace",
      });
      continue;
    }
    const id = lesson.data.id;
    if (grammarLessonId(level, id.slice(prefix.length)) !== id) {
      flags.push({ source: `grammar_${level}.json`, id, reason: "id does not round-trip" });
      continue;
    }
    if (!lesson.data.graded) {
      flags.push({
        source: `grammar_${level}.json`,
        id,
        reason: "lesson not graded; excluded from graded pool",
      });
      continue;
    }
    const quiz: GrammarLesson["quiz"] = [];
    let quizOk = true;
    for (const q of lesson.data.quiz) {
      if (!q.choices.includes(q.answer)) {
        flags.push({
          source: `grammar_${level}.json`,
          id,
          reason: `quiz ${String(q.id)}: answer not among choices`,
        });
        quizOk = false;
        break;
      }
      const prompt = q.question_jp ?? q.question_en ?? "";
      quiz.push({ id: `${id}:q${String(q.id)}`, prompt, choices: q.choices, answer: q.answer });
    }
    if (!quizOk || quiz.length === 0) continue;
    items.push({
      id,
      level,
      lessonId: id.slice(prefix.length),
      title: lesson.data.title,
      category: lesson.data.category,
      pattern: lesson.data.pattern,
      explanation: lesson.data.explanation,
      examples: lesson.data.examples.map((e) => ({
        jp: e.jp,
        romaji: e.romaji ?? "",
        en: e.en ?? "",
      })),
      quiz,
    });
  }
  return { items, flags };
}

const jlptQuestionSchema = z.object({
  id: z.string(),
  number: z.number(),
  prompt: z.string(),
  options: z.array(z.string()).min(2),
  answer_index: z.number(),
  answer_text: z.string(),
});

const jlptSetSchema = z.object({
  set_number: z.number(),
  title: z.string(),
  questions: z.array(z.unknown()),
});

/**
 * JLPT practice sets (PRD 10.17): only keyed, internally consistent questions
 * enter the graded pool. audit-clean already asserts this on the tracked
 * files; the gate is the app-side boundary that re-proves it at load.
 */
export function validateJlpt(
  raw: unknown,
  level: JlptLevel,
  category: JlptCategory,
): GateResult<JlptSet> {
  const parsed = z.array(jlptSetSchema).safeParse(raw);
  if (!parsed.success) {
    return {
      items: [],
      flags: [
        { source: `jlpt/${level}/${category}.json`, id: null, reason: "file schema invalid" },
      ],
    };
  }
  const prefix = `jlpt:${level}:${category}:`;
  const items: JlptSet[] = [];
  const flags: Flag[] = [];
  for (const setRaw of parsed.data) {
    const questions: JlptSet["questions"] = [];
    let setOk = true;
    for (const qRaw of setRaw.questions) {
      const q = jlptQuestionSchema.safeParse(qRaw);
      if (!q.success) {
        flags.push({
          source: `jlpt/${level}/${category}.json`,
          id: null,
          reason: "question schema invalid",
        });
        setOk = false;
        break;
      }
      const d = q.data;
      if (!d.id.startsWith(`${prefix}${setRaw.set_number}:`)) {
        flags.push({
          source: `jlpt/${level}/${category}.json`,
          id: d.id,
          reason: "id outside this set's namespace",
        });
        setOk = false;
        break;
      }
      if (d.prompt.trim() === "「") {
        flags.push({
          source: `jlpt/${level}/${category}.json`,
          id: d.id,
          reason: "truncated prompt in graded pool",
        });
        setOk = false;
        break;
      }
      if (d.answer_index < 0 || d.answer_index >= d.options.length) {
        flags.push({
          source: `jlpt/${level}/${category}.json`,
          id: d.id,
          reason: "answer_index out of range",
        });
        setOk = false;
        break;
      }
      if (d.options[d.answer_index] !== d.answer_text) {
        flags.push({
          source: `jlpt/${level}/${category}.json`,
          id: d.id,
          reason: "answer_text disagrees with options[answer_index]",
        });
        setOk = false;
        break;
      }
      questions.push({
        id: d.id,
        number: d.number,
        prompt: d.prompt,
        options: d.options,
        answerIndex: d.answer_index,
        answerText: d.answer_text,
      });
    }
    if (!setOk || questions.length === 0) continue;
    items.push({
      level,
      category,
      setNumber: setRaw.set_number,
      title: setRaw.title,
      questions,
    });
  }
  return { items, flags };
}
