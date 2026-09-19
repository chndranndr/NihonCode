import { describe, expect, it } from "vitest";
import { validateJlptSets, validateKanji, validateVocab } from "./gate";
import { loadGrammar, loadKana, loadKanji, loadVocab } from "./loaders";

/**
 * DEVELOPMENT_PROMPT.md task 1 acceptance: the gate excludes and flags
 * known-bad samples (vocab with Japanese romaji, kanji answer with dictionary
 * markers, JLPT record with null key) by excluding and flagging them, not
 * throwing.
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
              { kanji: "一日", romaji: "ついたち", meaning: "first day", kana: "ついたち" },
              { kanji: "水", romaji: "mizu", meaning: "water", kana: "みず" },
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
              { kanji: "足", reading: "あし", meaning: "leg", answers: ["あし", "た.りる"] },
              { kanji: "水", reading: "みず", meaning: "water", answers: ["みず", "スイ"] },
            ],
          },
        ],
      },
      "n5",
    );
    expect(result.items.map((i) => i.char)).toEqual(["水"]);
    expect(result.flags[0].reason).toContain("dictionary markers");
  });

  it("excludes JLPT records with null keys and truncated prompts", () => {
    const result = validateJlptSets(
      [
        {
          title: "Set 1",
          level: "N5",
          type: "reading",
          questions: [
            { number: 1, prompt: "「", options: ["a", "b"], answer_index: 1 },
            { number: 2, prompt: "ok?", options: ["a", "b"], answer_index: null },
            { number: 3, prompt: "fine?", options: ["a", "b"], answer_index: 2 },
            { number: 4, prompt: "range?", options: ["a"], answer_index: 5 },
          ],
        },
      ],
      "n5",
      "reading",
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].answerIndex).toBe(1);
    const reasons = result.flags.map((f) => f.reason);
    expect(reasons).toContain("truncated prompt; question fragment lives in choices");
    expect(reasons).toContain("null answer_index (scraped reference row)");
    expect(reasons).toContain("answer_index outside options range");
  });

  it("survives a structurally broken file without throwing", () => {
    expect(validateVocab({ nope: true }, "n5").flags[0].reason).toBe("file schema invalid");
    expect(validateKanji(null, "n5").items).toEqual([]);
    expect(validateJlptSets("not an array", "n5", "kanji").flags[0].reason).toBe(
      "file schema invalid",
    );
  });
});

describe("validation gate: clean slice pools", () => {
  it("loads the 46+46 basic gojuon", () => {
    const { items, flags } = loadKana();
    expect(flags).toEqual([]);
    expect(items.filter((i) => i.table === "hiragana")).toHaveLength(46);
    expect(items.filter((i) => i.table === "katakana")).toHaveLength(46);
    expect(items[0].id).toBe("kana:hiragana:あ");
  });

  it("loads 80 marker-free kanji N5 entries", () => {
    const { items, flags } = loadKanji("n5");
    expect(flags).toEqual([]);
    expect(items).toHaveLength(80);
    for (const item of items) expect(item.answers.length).toBeGreaterThan(0);
  });

  it("loads the graded N5 vocab pool: 643 Latin romaji minus 2 packed alternatives", () => {
    const { items, flags } = loadVocab("n5");
    // 643 entries hold genuine Latin romaji (audit ledger); 2 of them pack
    // alternatives ("maitoshi / mainen") and are excluded from exact-match
    // grading until Problem C gives them a variants list.
    expect(items).toHaveLength(641);
    for (const item of items) expect(/^[\x20-\x7e]+$/.test(item.romaji)).toBe(true);
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.every((f) => f.id !== null)).toBe(true);
  });

  it("loads the 72 reviewed N5 grammar lessons with answer-in-choices quizzes", () => {
    const { items, flags } = loadGrammar("n5");
    expect(flags).toEqual([]);
    expect(items).toHaveLength(72);
    for (const lesson of items) {
      expect(lesson.quiz.length).toBeGreaterThan(0);
      for (const q of lesson.quiz) expect(q.choices).toContain(q.answer);
    }
  });

  it("refuses non-clean-slice levels without reading files", () => {
    const kanji = loadKanji("n1");
    expect(kanji.items).toEqual([]);
    expect(kanji.flags[0].reason).toContain("not enabled until Phase 2");
    expect(loadVocab("n3").items).toEqual([]);
    expect(loadGrammar("n4").items).toEqual([]);
  });
});
