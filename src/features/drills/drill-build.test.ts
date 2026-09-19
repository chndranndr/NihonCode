import { describe, expect, it } from "vitest";
import { buildItems, DEFAULT_OPTIONS, type DrillOptions } from "./DrillPage";
import { loadGrammar, loadKana, loadKanji, loadVocab } from "../../content/gate";

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
