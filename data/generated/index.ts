import kanaRaw from "./kana.json";
import kanjiN5Raw from "./kanji_n5.json";
import vocabularyN5Raw from "./vocabulary_n5.json";
import grammarN5Raw from "./grammar_n5.json";
import practiceCoreRaw from "./practice_core.json";
import type {
  ContentMeta,
  GrammarExample,
  GrammarLesson,
  GrammarContent,
  GrammarContentByLevel,
  JLPTLevel,
  KanaContent,
  KanjiEntry,
  KanjiGroup,
  KanjiContent,
  KanjiContentByLevel,
  VocabularyCategory,
  VocabularyEntry,
  VocabularyContent,
  VocabularyContentByLevel,
} from "../../types/content";

export const kanaContent = kanaRaw as KanaContent;
export const defaultJlptLevel: JLPTLevel = "n5";

type JsonModule = { default: unknown };

type PracticeCoreEvidence = {
  questionCount: number;
  questionIds: string[];
};

type PracticeCoreLevel = {
  kanji: Array<PracticeCoreEvidence & { kanji: string }>;
  vocabulary: Array<PracticeCoreEvidence & { kanji: string; kana: string }>;
};

const practiceCoreByLevel = practiceCoreRaw as Record<JLPTLevel, PracticeCoreLevel>;

function normalizePracticeCoreKey(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, "");
}

const practiceCoreLevels: JLPTLevel[] = ["n5", "n4", "n3", "n2", "n1"];

const kanjiPracticeCoreMaps = practiceCoreLevels.reduce(
  (maps, level) => {
    maps[level] = new Map(
      practiceCoreByLevel[level].kanji.map((entry) => [
        normalizePracticeCoreKey(entry.kanji),
        entry,
      ]),
    );
    return maps;
  },
  {} as Record<JLPTLevel, Map<string, PracticeCoreEvidence>>,
);

const vocabularyPracticeCoreMaps = practiceCoreLevels.reduce(
  (maps, level) => {
    maps[level] = new Map(
      practiceCoreByLevel[level].vocabulary.map((entry) => [
        `${normalizePracticeCoreKey(entry.kanji)}|${normalizePracticeCoreKey(entry.kana)}`,
        entry,
      ]),
    );
    return maps;
  },
  {} as Record<JLPTLevel, Map<string, PracticeCoreEvidence>>,
);

function practiceCoreMetadata(evidence?: PracticeCoreEvidence) {
  return {
    isPracticeCore: Boolean(evidence),
    practiceQuestionCount: evidence?.questionCount ?? 0,
  };
}

async function resolveJson(importer: () => Promise<unknown>): Promise<unknown> {
  const loaded = await importer();
  if (loaded && typeof loaded === "object" && "default" in loaded) {
    return (loaded as JsonModule).default;
  }
  return loaded;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

function pickString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeUniqueStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    if (typeof value !== "string") {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(trimmed);
  });

  return result;
}

function normalizeKanjiEntry(rawEntry: unknown, expectedLevel?: JLPTLevel): KanjiEntry | null {
  const entry = asRecord(rawEntry);
  const kanji = pickString(entry.kanji);
  if (!kanji) {
    return null;
  }

  const taggedLevel = pickString(entry.jlpt).toLowerCase();
  if (expectedLevel && taggedLevel && taggedLevel !== expectedLevel) {
    return null;
  }

  const readings = toStringArray(entry.answers);
  const kunReadings = toStringArray(entry.readings_kun_hiragana);
  const onReadings = toStringArray(entry.readings_on_katakana);
  const onyomi = toStringArray(entry.onyomi);
  const kunyomi = toStringArray(entry.kunyomi);
  const combinedReadings = normalizeUniqueStrings([...readings, ...kunReadings, ...onReadings, ...onyomi, ...kunyomi]);
  const reading = pickString(entry.reading, combinedReadings[0] ?? "");
  const meaningsEn = toStringArray(entry.meanings_en);
  const meaning = pickString(entry.meaning, meaningsEn[0] ?? "");

  if (!reading || !meaning) {
    return null;
  }

  return {
    kanji,
    reading,
    meaning,
    answers: combinedReadings.length > 0 ? combinedReadings : undefined,
    ...practiceCoreMetadata(
      expectedLevel
        ? kanjiPracticeCoreMaps[expectedLevel]?.get(normalizePracticeCoreKey(kanji))
        : undefined,
    ),
  };
}

function normalizeKanjiContent(raw: unknown, expectedLevel?: JLPTLevel): KanjiContent {
  const root = asRecord(raw);
  const groupsRaw = Array.isArray(root.groups) ? root.groups : [];
  const seenKanji = new Set<string>();
  const groups: KanjiGroup[] = groupsRaw
    .map((rawGroup) => {
      const group = asRecord(rawGroup);
      const id = pickString(group.id);
      const name = pickString(group.name, id);
      const entriesRaw = Array.isArray(group.entries) ? group.entries : [];
      const entries = entriesRaw
        .map((entry) => normalizeKanjiEntry(entry, expectedLevel))
        .filter((entry): entry is KanjiEntry => entry !== null)
        .filter((entry) => {
          const key = entry.kanji.trim();
          if (seenKanji.has(key)) {
            return false;
          }
          seenKanji.add(key);
          return true;
        })
        .filter((entry): entry is KanjiEntry => entry !== null);

      if (!id || !name || entries.length === 0) {
        return null;
      }

      return { id, name, entries };
    })
    .filter((group): group is KanjiGroup => group !== null);

  return {
    groups,
    meta: asRecord(root.meta) as ContentMeta,
  };
}

function normalizeVocabularyEntry(
  rawEntry: unknown,
  expectedLevel?: JLPTLevel,
): VocabularyEntry | null {
  const entry = asRecord(rawEntry);
  const kanji = pickString(entry.kanji, pickString(entry.kana));
  const romaji = pickString(entry.romaji);
  const meaning = pickString(entry.meaning);
  if (!kanji || !romaji || !meaning) {
    return null;
  }

  const kana = pickString(entry.kana);
  return {
    kanji,
    romaji,
    meaning,
    kana: kana || undefined,
    ...practiceCoreMetadata(
      expectedLevel
        ? vocabularyPracticeCoreMaps[expectedLevel]?.get(
            `${normalizePracticeCoreKey(kanji)}|${normalizePracticeCoreKey(kana)}`,
          )
        : undefined,
    ),
  };
}

function normalizeVocabularyContent(
  raw: unknown,
  expectedLevel?: JLPTLevel,
): VocabularyContent {
  const root = asRecord(raw);
  const categoriesRaw = Array.isArray(root.categories) ? root.categories : [];
  const categories: VocabularyCategory[] = categoriesRaw
    .map((rawCategory) => {
      const category = asRecord(rawCategory);
      const id = pickString(category.id);
      const name = pickString(category.name, id);
      const entriesRaw = Array.isArray(category.entries) ? category.entries : [];
      const entries = entriesRaw
        .map((entry) => normalizeVocabularyEntry(entry, expectedLevel))
        .filter((entry): entry is VocabularyEntry => entry !== null);

      if (!id || !name || entries.length === 0) {
        return null;
      }

      return { id, name, entries };
    })
    .filter((category): category is VocabularyCategory => category !== null);

  return {
    categories,
    meta: asRecord(root.meta) as ContentMeta,
  };
}

function normalizeGrammarExample(rawExample: unknown): GrammarExample | null {
  const example = asRecord(rawExample);
  const jp = pickString(example.jp);
  const en = pickString(example.en);
  if (!jp || !en) {
    return null;
  }

  const romaji = pickString(example.romaji);
  return {
    jp,
    en,
    romaji: romaji || undefined,
  };
}

function normalizeGrammarLesson(rawLesson: unknown): GrammarLesson | null {
  const lesson = asRecord(rawLesson);
  const idRaw = lesson.id;
  const id = typeof idRaw === "number" ? String(idRaw) : pickString(idRaw);
  const title = pickString(lesson.title);
  const level = pickString(lesson.level);
  const category = pickString(lesson.category);
  const pattern = pickString(lesson.pattern);
  const meaning = pickString(lesson.meaning);
  const explanation = pickString(lesson.explanation, meaning);
  const examplesRaw = Array.isArray(lesson.examples) ? lesson.examples : [];
  const examples = examplesRaw
    .map((example) => normalizeGrammarExample(example))
    .filter((example): example is GrammarExample => example !== null);
  const quiz = Array.isArray(lesson.quiz) ? lesson.quiz.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>> : [];

  if (!id || !title || !level || !category || !pattern || !explanation || examples.length === 0) {
    return null;
  }

  return {
    id,
    title,
    level,
    category,
    pattern,
    meaning: meaning || undefined,
    explanation,
    examples,
    quiz,
  };
}

function normalizeGrammarContent(raw: unknown): GrammarContent {
  const root = asRecord(raw);
  const lessonsRaw = Array.isArray(root.lessons) ? root.lessons : [];
  const lessons = lessonsRaw
    .map((lesson) => normalizeGrammarLesson(lesson))
    .filter((lesson): lesson is GrammarLesson => lesson !== null);

  return {
    lessons,
    meta: asRecord(root.meta) as ContentMeta,
  };
}

const kanjiImporters: Record<JLPTLevel, () => Promise<unknown>> = {
  n1: () => import("./kanji_n1.json"),
  n2: () => import("./kanji_n2.json"),
  n3: () => import("./kanji_n3.json"),
  n4: () => import("./kanji_n4.json"),
  n5: () => Promise.resolve(kanjiN5Raw),
};

const vocabularyImporters: Record<JLPTLevel, () => Promise<unknown>> = {
  n1: () => import("./vocabulary_n1.json"),
  n2: () => import("./vocabulary_n2.json"),
  n3: () => import("./vocabulary_n3.json"),
  n4: () => import("./vocabulary_n4.json"),
  n5: () => Promise.resolve(vocabularyN5Raw),
};

const grammarImporters: Record<JLPTLevel, () => Promise<unknown>> = {
  n1: () => import("./grammar_n1.json"),
  n2: () => import("./grammar_n2.json"),
  n3: () => import("./grammar_n3.json"),
  n4: () => import("./grammar_n4.json"),
  n5: () => Promise.resolve(grammarN5Raw),
};

export const kanjiByLevel: KanjiContentByLevel = {
  n5: normalizeKanjiContent(kanjiN5Raw, "n5"),
};

export const vocabularyByLevel: VocabularyContentByLevel = {
  n5: normalizeVocabularyContent(vocabularyN5Raw, "n5"),
};

export const grammarByLevel: GrammarContentByLevel = {
  n5: normalizeGrammarContent(grammarN5Raw),
};

export async function loadKanjiContent(level: JLPTLevel = defaultJlptLevel): Promise<KanjiContent> {
  const cached = kanjiByLevel[level];
  if (cached) {
    return cached;
  }
  const raw = await resolveJson(kanjiImporters[level]);
  const normalized = normalizeKanjiContent(raw, level);
  kanjiByLevel[level] = normalized;
  return normalized;
}

export async function loadVocabularyContent(level: JLPTLevel = defaultJlptLevel): Promise<VocabularyContent> {
  const cached = vocabularyByLevel[level];
  if (cached) {
    return cached;
  }
  const raw = await resolveJson(vocabularyImporters[level]);
  const normalized = normalizeVocabularyContent(raw, level);
  vocabularyByLevel[level] = normalized;
  return normalized;
}

export async function loadGrammarContent(level: JLPTLevel = defaultJlptLevel): Promise<GrammarContent> {
  const cached = grammarByLevel[level];
  if (cached) {
    return cached;
  }
  const raw = await resolveJson(grammarImporters[level]);
  const normalized = normalizeGrammarContent(raw);
  grammarByLevel[level] = normalized;
  return normalized;
}

export async function loadStudyContent(level: JLPTLevel = defaultJlptLevel) {
  const [kanji, vocabulary, grammar] = await Promise.all([
    loadKanjiContent(level),
    loadVocabularyContent(level),
    loadGrammarContent(level),
  ]);
  return { kanji, vocabulary, grammar };
}

export function getKanjiContent(level: JLPTLevel = defaultJlptLevel): KanjiContent {
  return kanjiByLevel[level] ?? kanjiByLevel[defaultJlptLevel] ?? { groups: [] };
}

export function getVocabularyContent(level: JLPTLevel = defaultJlptLevel): VocabularyContent {
  return vocabularyByLevel[level] ?? vocabularyByLevel[defaultJlptLevel] ?? { categories: [] };
}

export function getGrammarContent(level: JLPTLevel = defaultJlptLevel): GrammarContent {
  return grammarByLevel[level] ?? grammarByLevel[defaultJlptLevel] ?? { lessons: [] };
}

// Backward-compatible exports used across current screens.
export const kanjiContent = getKanjiContent(defaultJlptLevel);
export const vocabularyContent = getVocabularyContent(defaultJlptLevel);
export const grammarContent = getGrammarContent(defaultJlptLevel);
