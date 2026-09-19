/**
 * The untrusted->typed boundary (implementation_plan.md "Validate at the
 * boundary", DEVELOPMENT_PROMPT.md section 2). Every read goes through a Zod
 * schema; malformed entries are excluded from graded pools and flagged, never
 * thrown on. Pure module: raw-file loading lives in loaders.ts (bundler side)
 * and in fs-read e2e legs; check-arch.mjs keeps all data/ imports inside
 * src/content. Components and features consume only src/content/models.ts.
 *
 * MVP graded pools (clean slice only): kana 46+46 basic gojuon; kanji N5 with
 * marker-free answers; vocabulary N5 entries whose romaji is genuine Latin;
 * grammar N5 lessons whose meta is reviewed and whose quiz answers are members
 * of their choices. JLPT validation is a pure function over caller-supplied
 * raw values.
 */

import { z } from "zod";
import { grammarLessonId, jlptQuestionId, kanaId, kanjiId, vocabId } from "./ids";
import type { JlptCategory, JlptLevel } from "./ids";
import type {
  Flag,
  GateResult,
  GrammarLesson,
  JlptQuestion,
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

const kanaSchema = z.object({
  hiragana: z.array(z.object({ char: z.string(), romaji: z.string() })),
  katakana: z.array(z.object({ char: z.string(), romaji: z.string() })),
});

const kanjiEntrySchema = z.object({
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
});

const vocabEntrySchema = z.object({
  kanji: z.string(),
  romaji: z.string(),
  meaning: z.string(),
  kana: z.string(),
});

const vocabFileSchema = z.object({
  categories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      entries: z.array(z.unknown()),
    }),
  ),
});

const grammarLessonSchema = z.object({
  id: z.string(),
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
  meta: z.object({ reviewed: z.boolean().optional() }).optional(),
});

const jlptQuestionSchema = z.object({
  number: z.number(),
  prompt: z.string(),
  options: z.array(z.string()),
  answer_index: z.number().nullable(),
  explanation: z.string().optional(),
});

const jlptSetSchema = z.object({
  title: z.string(),
  level: z.string(),
  type: z.string(),
  questions: z.array(z.unknown()),
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
      if (entry.char.length === 0 || !isLatinRomaji(entry.romaji)) {
        flags.push({
          source: `kana.json:${table}`,
          id: null,
          reason: `unreadable entry (char "${entry.char}", romaji "${entry.romaji}")`,
        });
        continue;
      }
      items.push({ id: kanaId(table, entry.char), table, char: entry.char, romaji: entry.romaji });
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
  const reviewed = parsed.data.meta?.reviewed === true;
  const items: GrammarLesson[] = [];
  const flags: Flag[] = [];
  for (const lessonRaw of parsed.data.lessons) {
    const lesson = grammarLessonSchema.safeParse(lessonRaw);
    if (!lesson.success) {
      flags.push({ source: `grammar_${level}.json`, id: null, reason: "lesson schema invalid" });
      continue;
    }
    const id = grammarLessonId(level, lesson.data.id);
    if (!reviewed) {
      flags.push({
        source: `grammar_${level}.json`,
        id,
        reason: "level not marked reviewed; excluded from graded pool",
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
      lessonId: lesson.data.id,
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

/**
 * Pure JLPT validation over caller-supplied raw values. Phase 1 ships no JLPT
 * import at all; tests feed known-bad fixtures (null answer_index, truncated
 * prompt) to prove the gate flags rather than crashes (DEVELOPMENT_PROMPT.md
 * task 1 acceptance). Phase 2 wires real file reads behind the cleared pool.
 */
export function validateJlptSets(
  raw: unknown,
  level: JlptLevel,
  category: JlptCategory,
): GateResult<JlptQuestion> {
  const sets = z.array(z.unknown()).safeParse(raw);
  if (!sets.success) {
    return {
      items: [],
      flags: [
        { source: `jlpt/${level}/${category}.json`, id: null, reason: "file schema invalid" },
      ],
    };
  }
  const items: JlptQuestion[] = [];
  const flags: Flag[] = [];
  sets.data.forEach((setRaw, setIndex) => {
    const set = jlptSetSchema.safeParse(setRaw);
    if (!set.success) {
      flags.push({
        source: `jlpt/${level}/${category}.json`,
        id: null,
        reason: `set ${setIndex + 1} schema invalid`,
      });
      return;
    }
    set.data.questions.forEach((qRaw, qIndex) => {
      const q = jlptQuestionSchema.safeParse(qRaw);
      const id = jlptQuestionId(level, category, setIndex + 1, qIndex + 1);
      if (!q.success) {
        flags.push({ source: set.data.title, id, reason: "question schema invalid" });
        return;
      }
      if (q.data.answer_index == null) {
        flags.push({
          source: set.data.title,
          id,
          reason: "null answer_index (scraped reference row)",
        });
        return;
      }
      if (q.data.answer_index < 1 || q.data.answer_index > q.data.options.length) {
        flags.push({ source: set.data.title, id, reason: "answer_index outside options range" });
        return;
      }
      if (q.data.prompt.trim() === "「") {
        flags.push({
          source: set.data.title,
          id,
          reason: "truncated prompt; question fragment lives in choices",
        });
        return;
      }
      items.push({
        id,
        level,
        category,
        set: setIndex + 1,
        number: q.data.number,
        prompt: q.data.prompt,
        options: q.data.options,
        answerIndex: q.data.answer_index - 1,
        explanation: q.data.explanation ?? "",
      });
    });
  });
  return { items, flags };
}
