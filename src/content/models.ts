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

/** A pool media reference: remote provenance URL plus the local file the app
 * actually uses. audit-clean proves the local file exists. */
export interface JlptImage {
  url: string;
  /** Pool-relative path under data/clean/ ("images/<level>/<category>/…"). */
  localPath: string;
}

export interface JlptAudioSpan {
  start: number;
  end: number;
}

/** Explicit per-question audio binding. Only present when the mapping is
 * evidenced (measured concatenation spans), never guessed from indices. */
export interface JlptAudioRef {
  url: string;
  localPath: string;
  span: JlptAudioSpan;
}

export interface JlptPassage {
  id: string;
  title: string;
  text: string;
  images: JlptImage[];
}

export interface JlptQuestion {
  id: string;
  /** Position within the set; not unique, never used as a key. */
  number: number;
  prompt: string;
  options: string[];
  /** Index into options; every pooled question is keyed (audit-clean). */
  answerIndex: number;
  answerText: string;
  /** Restored from the source; shown after answering. Absent for listening,
   * where the source has none. */
  explanation?: string;
  /** The full sentence with the answer in place, where the source had one. */
  answeredSentence?: string;
  images: JlptImage[];
  /** Resolves against the owning set's passages; null when none. */
  passageId: string | null;
  /** Explicit audio binding; null when no evidenced mapping exists. */
  audio: JlptAudioRef | null;
}

/** Set-level audio file (concatenated track) without a per-question span. */
export interface JlptSetAudioRef {
  url: string;
  localPath: string;
}

export interface JlptSet {
  level: JlptLevel;
  category: JlptCategory;
  setNumber: number;
  title: string;
  questions: JlptQuestion[];
  passages: JlptPassage[];
  /** Set-level audio; the per-question binding lives on the question. */
  audio: JlptSetAudioRef[];
}

/** practice_core.json reverse index: which JLPT questions touch a kanji or
 * vocab entry. Frozen, audit-clean; IDs resolve to the graded JLPT pools. */
export interface PracticeCoreKanjiRecord {
  kanji: string;
  questionCount: number;
  questionIds: string[];
}

export interface PracticeCoreVocabRecord {
  kanji: string;
  kana: string;
  questionCount: number;
  questionIds: string[];
}

export interface PracticeCoreLevel {
  kanji: PracticeCoreKanjiRecord[];
  vocabulary: PracticeCoreVocabRecord[];
}

export type PracticeCoreIndex = Record<JlptLevel, PracticeCoreLevel>;

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
