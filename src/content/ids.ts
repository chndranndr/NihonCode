/**
 * Stable namespaced content IDs (DEVELOPMENT_PROMPT.md section 2).
 * Content-order-independent: progress rows reference these, never positions.
 * Note: the legacy practice_core.json index uses its own positional scheme and
 * is NOT consumed through these builders (docs/data-quality.md).
 */

export type JlptLevel = "n5" | "n4" | "n3" | "n2" | "n1";
export type KanaTable = "hiragana" | "katakana";
export type JlptCategory = "grammar" | "reading" | "kanji" | "listening" | "vocabulary";

export function kanaId(table: KanaTable, char: string): string {
  return `kana:${table}:${char}`;
}

export function kanjiId(level: JlptLevel, char: string): string {
  return `kanji:${level}:${char}`;
}

export function vocabId(level: JlptLevel, kanji: string, kana: string): string {
  return `vocab:${level}:${kanji}|${kana}`;
}

export function grammarLessonId(level: JlptLevel, lessonId: string): string {
  return `grammar:${level}:${lessonId}`;
}

export function jlptQuestionId(
  level: JlptLevel,
  category: JlptCategory,
  set: number,
  question: number,
): string {
  return `jlpt:${level}:${category}:${set}:${question}`;
}
