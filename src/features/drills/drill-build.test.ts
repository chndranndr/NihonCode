import { describe, expect, it } from "vitest";
import { buildItems, DEFAULT_OPTIONS, type DrillOptions } from "./DrillPage";
import { loadGrammar, loadKana, loadKanji, loadVocab } from "../../content/loaders";

const pools = {
  kana: loadKana().items,
  kanji: loadKanji("n5").items,
  vocab: loadVocab("n5").items,
  grammar: loadGrammar("n5").items,
  flags: 0,
};

function options(patch: Partial<DrillOptions>): DrillOptions {
  return { ...DEFAULT_OPTIONS, ...patch };
}

describe("drill pool builders (PRD 10.7 / 10.8)", () => {
  it("numbers generates the full offered count", () => {
    expect(buildItems("numbers", "n5", pools, DEFAULT_OPTIONS)).toHaveLength(50);
  });

  it("dates weekdays mode is exactly the 7 weekday items", () => {
    const items = buildItems("dates", "n5", pools, options({ dateMode: "weekdays" }));
    expect(items).toHaveLength(7);
    expect(items.every((i) => i.id.startsWith("dates:weekday:"))).toBe(true);
  });

  it("dates full mode is full dates only, at the offered count", () => {
    const items = buildItems("dates", "n5", pools, options({ dateMode: "full" }));
    expect(items).toHaveLength(50);
    expect(items.every((i) => i.id.startsWith("dates:full:"))).toBe(true);
  });

  it("numbers direction swaps prompt and accepted forms", () => {
    const jp2num = buildItems("numbers", "n5", pools, options({ direction: "jp2num" }));
    const num2jp = buildItems("numbers", "n5", pools, options({ direction: "num2jp" }));
    expect(/^\d+$/.test(jp2num[0].accepted[0])).toBe(true);
    expect(/^[a-z]+$/.test(num2jp[0].accepted[0])).toBe(true);
  });

  it("dates direction swaps japanese and english sides", () => {
    const jp2en = buildItems(
      "dates",
      "n5",
      pools,
      options({ dateMode: "weekdays", direction: "jp2en" }),
    );
    const en2jp = buildItems(
      "dates",
      "n5",
      pools,
      options({ dateMode: "weekdays", direction: "en2jp" }),
    );
    expect(jp2en[0].prompt).toMatch(/[曜日]/);
    expect(en2jp[0].prompt).toMatch(/day/);
  });
});

describe("kana, kanji, vocab builders grade real content (DEVELOPMENT_PROMPT task 11)", () => {
  it("every graded builder emits items with non-empty accepted answers", () => {
    for (const mode of ["kana", "kanji", "vocab"] as const) {
      const items = buildItems(mode, "n5", pools, DEFAULT_OPTIONS);
      expect(items.length, mode).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.accepted.length, item.id).toBeGreaterThan(0);
        expect(
          item.accepted.every((a) => a.trim().length > 0),
          item.id,
        ).toBe(true);
      }
    }
  });

  it("kana prompts are single characters answered by their romaji", () => {
    const items = buildItems("kana", "n5", pools, DEFAULT_OPTIONS);
    expect(items).toHaveLength(92);
    for (const item of items) {
      expect([...item.prompt], item.id).toHaveLength(1);
      expect(item.accepted).toHaveLength(1);
      expect(item.id.startsWith("kana:hiragana:") || item.id.startsWith("kana:katakana:")).toBe(
        true,
      );
    }
  });

  it("kanji answers carry no dictionary markers (Problem D guard)", () => {
    const items = buildItems("kanji", "n5", pools, DEFAULT_OPTIONS);
    expect(items).toHaveLength(80);
    for (const item of items) {
      expect(
        item.accepted.some((a) => /[.-]/.test(a)),
        `${item.id} answers`,
      ).toBe(false);
      expect(item.id).toMatch(/^kanji:n5:.+/);
      expect(item.reveal.scripts).toContain(item.prompt);
    }
  });

  it("vocab accepts genuine Latin romaji and speaks the kana", () => {
    const items = buildItems("vocab", "n5", pools, DEFAULT_OPTIONS);
    expect(items).toHaveLength(641);
    for (const item of items) {
      expect(item.accepted[0], item.id).toMatch(/^[\x20-\x7e]+$/);
      expect(item.accepted[0], item.id).not.toMatch(/[;；/]/);
      expect(item.id).toMatch(/^vocab:n5:.+\|.+/);
      expect(item.reveal.scripts).toContain(item.speakText);
    }
  });
});
