import { describe, expect, it } from "vitest";
import { orderKanjiForMap } from "./kanjiOrder";

const chars = (list: string[]) =>
  orderKanjiForMap(list.map((char) => ({ char }))).map((x) => x.char);

describe("orderKanjiForMap", () => {
  it("puts numerals first by value, then 円, then codepoint order", () => {
    expect(chars(["水", "円", "万", "三", "火", "一", "十", "山"])).toEqual([
      "一",
      "三",
      "十",
      "万",
      "円",
      "山",
      "水",
      "火",
    ]);
  });

  it("handles levels with no numerals and does not mutate the input", () => {
    const input = [{ char: "語" }, { char: "学" }];
    expect(orderKanjiForMap(input).map((x) => x.char)).toEqual(["学", "語"]);
    expect(input.map((x) => x.char)).toEqual(["語", "学"]);
  });
});
