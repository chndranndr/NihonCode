import { describe, expect, it } from "vitest";
import { parseFurigana, stripFurigana } from "./furigana";

describe("parseFurigana", () => {
  it("parses multiple groups", () => {
    expect(parseFurigana("今日(きょう)は学校(がっこう)です")).toEqual([
      { text: "今日", reading: "きょう" },
      { text: "は" },
      { text: "学校", reading: "がっこう" },
      { text: "です" },
    ]);
  });
  it("keeps okurigana outside the ruby", () => {
    expect(parseFurigana("安(やす)い")).toEqual([{ text: "安", reading: "やす" }, { text: "い" }]);
  });
  it("attaches to the trailing kanji run only", () => {
    expect(parseFurigana("お茶(ちゃ)")).toEqual([{ text: "お" }, { text: "茶", reading: "ちゃ" }]);
  });
  it("accepts full-width parens", () => {
    expect(parseFurigana("今日（きょう）")).toEqual([{ text: "今日", reading: "きょう" }]);
  });
  it("leaves non-kana asides and kana-preceded parens as text", () => {
    expect(parseFurigana("今日(today)")).toEqual([{ text: "今日(today)" }]);
    expect(parseFurigana("です(きょう)")).toEqual([{ text: "です(きょう)" }]);
    expect(parseFurigana("今日()")).toEqual([{ text: "今日()" }]);
    expect(parseFurigana("今日(きょう")).toEqual([{ text: "今日(きょう" }]);
  });
  it("round-trips plain text", () => {
    expect(parseFurigana("hello")).toEqual([{ text: "hello" }]);
    expect(parseFurigana("")).toEqual([]);
  });
});

describe("stripFurigana", () => {
  it("removes readings", () => {
    expect(stripFurigana("今日(きょう)は安(やす)い")).toBe("今日は安い");
    expect(stripFurigana("今日(today)")).toBe("今日(today)");
  });
});
