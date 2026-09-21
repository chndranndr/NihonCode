/**
 * Typed domain models emitted by the validation gate. Raw JSON never crosses
 * this boundary: features and components consume only these shapes.
 */

import type { JlptLevel, KanaTable } from "./ids";

export interface KanaItem {
  id: string;
  table: KanaTable;
  char: string;
  romaji: string;
}

export interface KanjiItem {
  id: string;
  level: JlptLevel;
  char: string;
  reading: string;
  meaning: string;
  /** Accepted learner answers, normalized (no dictionary markers). */
  answers: string[];
}

export interface VocabItem {
  id: string;
  level: JlptLevel;
  kanji: string;
  kana: string;
  /** Guaranteed genuine Latin romaji by the gate. */
  romaji: string;
  meaning: string;
  /** Curated part of speech; only conjugable entries carry it (PRD §10.9). */
  pos?: "verb" | "adjective";
  /** Curated conjugation class; paired with pos, never inferred from category. */
  conjugationClass?: "godan" | "ichidan" | "irregular" | "i" | "na";
}

export interface GrammarExample {
  jp: string;
  romaji: string;
  en: string;
}

export interface GrammarQuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  answer: string;
}

export interface GrammarLesson {
  id: string;
  level: JlptLevel;
  lessonId: string;
  title: string;
  category: string;
  pattern: string;
  explanation: string;
  examples: GrammarExample[];
  quiz: GrammarQuizQuestion[];
}

export type JlptCategory = "grammar" | "kanji" | "listening" | "reading" | "vocabulary";

export interface JlptQuestion {
  id: string;
  /** Position within the set; not unique, never used as a key. */
  number: number;
  prompt: string;
  options: string[];
  /** Index into options; every pooled question is keyed (audit-clean). */
  answerIndex: number;
  answerText: string;
}

export interface JlptSet {
  level: JlptLevel;
  category: JlptCategory;
  setNumber: number;
  title: string;
  questions: JlptQuestion[];
}

/** A gate decision on one raw entry: excluded from graded pools, with reason. */
export interface Flag {
  source: string;
  id: string | null;
  reason: string;
}

export interface GateResult<T> {
  items: T[];
  flags: Flag[];
}
