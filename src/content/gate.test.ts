import { beforeAll, describe, expect, it } from "vitest";
import { validateGrammar, validateJlpt, validateKanji, validateVocab } from "./gate";
import { kanjiId, vocabId, type JlptLevel } from "./ids";
import { ENABLED_LEVELS, LevelUnavailableError, loadLevelData, type LevelData } from "./loaders";

/**
 * DEVELOPMENT_PROMPT.md task 1 acceptance: the gate excludes and flags
 * known-bad samples (vocab with Japanese romaji, kanji answer with dictionary
 * markers) by excluding and flagging them, not throwing. Samples are
 * clean-pool shaped (stamped ids), matching data/clean.
 */

describe("validation gate: known-bad samples are flagged, not thrown on", () => {
  it("excludes a vocab entry whose romaji holds Japanese", () => {
    const result = validateVocab(
      {
        categories: [
          {
            id: "c1",
            name: "C",
            entries: [
              {
                id: vocabId("n5", "一日", "ついたち"),
                kanji: "一日",
                romaji: "ついたち",
                meaning: "first day",
                kana: "ついたち",
              },
              {
                id: vocabId("n5", "水", "みず"),
                kanji: "水",
                romaji: "mizu",
                meaning: "water",
                kana: "みず",
              },
            ],
          },
        ],
      },
      "n5",
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].romaji).toBe("mizu");
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].reason).toContain("Problem A");
  });

  it("excludes a kanji entry whose answers carry dictionary markers", () => {
    const result = validateKanji(
      {
        groups: [
          {
            id: "g1",
            name: "G",
            entries: [
              {
                id: kanjiId("n5", "足"),
                kanji: "足",
                reading: "あし",
                meaning: "leg",
                answers: ["あし", "た.りる"],
              },
              {
                id: kanjiId("n5", "水"),
                kanji: "水",
                reading: "みず",
                meaning: "water",
                answers: ["みず", "スイ"],
              },
            ],
          },
        ],
      },
      "n5",
    );
    expect(result.items.map((i) => i.char)).toEqual(["水"]);
    expect(result.flags[0].reason).toContain("dictionary markers");
  });

  it("flags entries whose stamped id disagrees with their content", () => {
    const result = validateVocab(
      {
        categories: [
          {
            id: "c1",
            name: "C",
            entries: [
              {
                id: vocabId("n5", "水", "みず"),
                kanji: "一日",
                romaji: "mizu",
                meaning: "water",
                kana: "みず",
              },
            ],
          },
        ],
      },
      "n5",
    );
    expect(result.items).toEqual([]);
    expect(result.flags[0].reason).toContain("id does not match");
  });

  it("survives a structurally broken file without throwing", () => {
    expect(validateVocab({ nope: true }, "n5").flags[0].reason).toBe("file schema invalid");
    expect(validateKanji(null, "n5").items).toEqual([]);
  });
});

let n5!: LevelData;
beforeAll(async () => {
  n5 = await loadLevelData("n5");
});

describe("validation gate: clean pools", () => {
  it("loads the 46+46 basic gojuon", () => {
    const { items, flags } = n5.kana;
    expect(flags).toEqual([]);
    expect(items.filter((i) => i.table === "hiragana")).toHaveLength(46);
    expect(items.filter((i) => i.table === "katakana")).toHaveLength(46);
    expect(items[0].id).toBe("kana:hiragana:あ");
  });

  it("loads 80 marker-free kanji N5 entries", () => {
    const { items, flags } = n5.kanji;
    expect(flags).toEqual([]);
    expect(items).toHaveLength(80);
    for (const item of items) expect(item.answers.length).toBeGreaterThan(0);
  });

  it("loads the curated N5 vocab pool: 738 graded entries, all Latin romaji", () => {
    const { items, flags } = n5.vocab;
    // Post-curation clean pool (docs/data-quality.md): 738 graded N5 vocab
    // entries; packed alternatives carry variants lists and grade on primary.
    expect(items).toHaveLength(738);
    expect(flags).toEqual([]);
    for (const item of items) expect(/^[\x20-\x7e]+$/.test(item.romaji)).toBe(true);
  });

  it("carries curated conjugation metadata for exactly the conjugable entries", () => {
    const { items } = n5.vocab;
    const conjugatable = items.filter((v) => v.pos !== undefined);
    const verbs = conjugatable.filter((v) => v.pos === "verb");
    const adjs = conjugatable.filter((v) => v.pos === "adjective");
    // Curation counts (docs/data-quality.md "Conjugation metadata").
    expect(verbs).toHaveLength(117);
    expect(adjs).toHaveLength(84);
    for (const v of verbs) expect(["godan", "ichidan", "irregular"]).toContain(v.conjugationClass);
    for (const a of adjs) expect(["i", "na"]).toContain(a.conjugationClass);
    expect(items.filter((v) => v.pos === undefined && v.conjugationClass !== undefined)).toEqual(
      [],
    );
  });

  it("loads the 72 graded N5 grammar lessons with answer-in-choices quizzes", () => {
    const { items, flags } = n5.grammar;
    expect(flags).toEqual([]);
    expect(items).toHaveLength(72);
    for (const lesson of items) {
      expect(lesson.quiz.length).toBeGreaterThan(0);
      for (const q of lesson.quiz) expect(q.choices).toContain(q.answer);
    }
  });

  it("excludes ungraded lessons and lessons outside the level namespace", () => {
    const result = validateGrammarFixture([{ graded: false }, { id: "grammar:n4:1" }]);
    expect(result.items).toEqual([]);
    expect(result.flags.map((f) => f.reason)).toEqual([
      "lesson not graded; excluded from graded pool",
      "id outside this level's namespace",
    ]);
  });
});

describe("validation gate: requested level", () => {
  it("rejects levels outside the enabled set", async () => {
    // Runtime level comes from storage; a corrupted stored value must be
    // rejected, never served.
    await expect(loadLevelData("n9" as JlptLevel)).rejects.toThrow(LevelUnavailableError);
  });

  it("serves every enabled level through the same gate", async () => {
    for (const lvl of ENABLED_LEVELS) {
      const data = await loadLevelData(lvl);
      expect(data.level).toBe(lvl);
      expect(data.kana.items.length).toBeGreaterThan(0);
      expect(data.kanji.items.length).toBeGreaterThan(0);
      expect(data.vocab.items.length).toBeGreaterThan(0);
      expect(data.grammar.items.length).toBeGreaterThan(0);
    }
  });
});

describe("validation gate: JLPT practice sets", () => {
  function jlptFixture(overrides: Record<string, unknown> = {}) {
    const question = {
      id: "jlpt:n5:vocabulary:1:abc123",
      number: 1,
      prompt: "あした、えいがをみませんか",
      options: ["いいえ", "はい", "きのう"],
      answer_index: 1,
      answer_text: "はい",
      ...overrides,
    };
    return [{ set_number: 1, title: "N5 Vocabulary Exercise 01", questions: [question] }];
  }

  it("serves keyed sets with normalized answerIndex", () => {
    const { items, flags } = validateJlpt(jlptFixture(), "n5", "vocabulary");
    expect(flags).toEqual([]);
    expect(items).toHaveLength(1);
    expect(items[0].setNumber).toBe(1);
    expect(items[0].questions[0].answerIndex).toBe(1);
    expect(items[0].questions[0].answerText).toBe("はい");
  });

  it("excludes a truncated prompt, never serving a broken question", () => {
    const { items, flags } = validateJlpt(jlptFixture({ prompt: "「" }), "n5", "vocabulary");
    expect(items).toEqual([]);
    expect(flags[0].reason).toContain("truncated prompt");
  });

  it("excludes a question whose answer_index is out of range", () => {
    const { items, flags } = validateJlpt(jlptFixture({ answer_index: 9 }), "n5", "vocabulary");
    expect(items).toEqual([]);
    expect(flags[0].reason).toContain("answer_index out of range");
  });

  it("excludes a question whose answer_text disagrees with its option", () => {
    const { items, flags } = validateJlpt(
      jlptFixture({ answer_text: "いいえ" }),
      "n5",
      "vocabulary",
    );
    expect(items).toEqual([]);
    expect(flags[0].reason).toContain("disagrees");
  });
});

function validateGrammarFixture(overrides: Array<Record<string, unknown>>) {
  const lesson = (over: Record<string, unknown>) => ({
    id: "grammar:n5:1",
    graded: true,
    defects: [],
    title: "t",
    level: "n5",
    category: "c",
    pattern: "p",
    explanation: "e",
    examples: [{ jp: "j" }],
    quiz: [{ id: 1, choices: ["a"], answer: "a" }],
    ...over,
  });
  return validateGrammar({ lessons: overrides.map(lesson) }, "n5");
}
