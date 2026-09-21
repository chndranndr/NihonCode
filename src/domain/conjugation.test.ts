/**
 * Conjugator correctness across every class and form (DEVELOPMENT_PROMPT task
 * 2: "sampled godan/ichidan/irregular and i-/na-adjective grading correct").
 * The い-stem いい is asserted from the よ stem on purpose — it is the
 * single highest-stakes case (the drill would otherwise teach いくない).
 */

import { describe, expect, it } from "vitest";
import { conjugateAdjective, conjugateVerb, type VerbForm, type AdjForm } from "./conjugation";

describe("conjugateVerb: godan", () => {
  const cases: Array<[VerbForm, string, string, string]> = [
    ["masu", "あるきます", "歩きます", "arukimasu"],
    ["masen", "あるきません", "歩きません", "arukimasen"],
    ["mashita", "あるきました", "歩きました", "arukimashita"],
    ["te", "あるいて", "歩いて", "aruite"],
    ["nai", "あるかない", "歩かない", "arukanai"],
    ["ta", "あるいた", "歩いた", "aruita"],
  ];
  for (const [form, kana, kanji, romaji] of cases) {
    it(`歩く -> ${form}`, () => {
      expect(conjugateVerb("あるく", "歩く", "godan", form)).toEqual({ kana, kanji, romaji });
    });
  }

  it("行く is the godan te/ta exception (行って, not 行いて)", () => {
    expect(conjugateVerb("いく", "行く", "godan", "te")?.kana).toBe("いって");
    expect(conjugateVerb("いく", "行く", "godan", "ta")?.kana).toBe("いった");
    expect(conjugateVerb("いく", "行く", "godan", "masu")?.kana).toBe("いきます");
  });

  it("ある takes the suppletive negative ない", () => {
    expect(conjugateVerb("ある", "ある", "godan", "nai")?.kana).toBe("ない");
  });

  it("kana-written verbs display the kana form", () => {
    expect(conjugateVerb("わかる", "わかる", "godan", "masu")).toEqual({
      kana: "わかります",
      kanji: "わかります",
      romaji: "wakarimasu",
    });
  });
});

describe("conjugateVerb: ichidan", () => {
  const cases: Array<[VerbForm, string, string, string]> = [
    ["masu", "たべます", "食べます", "tabemasu"],
    ["masen", "たべません", "食べません", "tabemasen"],
    ["mashita", "たべました", "食べました", "tabemashita"],
    ["te", "たべて", "食べて", "tabete"],
    ["nai", "たべない", "食べない", "tabenai"],
    ["ta", "たべた", "食べた", "tabeta"],
  ];
  for (const [form, kana, kanji, romaji] of cases) {
    it(`食べる -> ${form}`, () => {
      expect(conjugateVerb("たべる", "食べる", "ichidan", form)).toEqual({ kana, kanji, romaji });
    });
  }
});

describe("conjugateVerb: irregular", () => {
  it("来る conjugates as the ku-irregular", () => {
    expect(conjugateVerb("くる", "来る", "irregular", "masu")).toEqual({
      kana: "きます",
      kanji: "来ます",
      romaji: "kimasu",
    });
    expect(conjugateVerb("くる", "来る", "irregular", "nai")?.kana).toBe("こない");
    expect(conjugateVerb("くる", "来る", "irregular", "ta")?.kana).toBe("きた");
  });

  it("する conjugates as the su-irregular", () => {
    expect(conjugateVerb("する", "する", "irregular", "masu")?.kana).toBe("します");
    expect(conjugateVerb("する", "する", "irregular", "te")?.kana).toBe("して");
  });

  it("suru stems conjugate on the stored noun stem", () => {
    expect(conjugateVerb("べんきょう", "勉強", "irregular", "masu")).toEqual({
      kana: "べんきょうします",
      kanji: "勉強します",
      romaji: "benkyoushimasu",
    });
    expect(conjugateVerb("コピーする", "コピーする", "irregular", "te")?.kana).toBe("コピーして");
  });
});

describe("conjugateAdjective: i-adjective", () => {
  const cases: Array<[AdjForm, string, string, string]> = [
    ["negative", "たのしくない", "楽しくない", "tanoshikunai"],
    ["past", "たのしかった", "楽しかった", "tanoshikatta"],
    ["adverb", "たのしく", "楽しく", "tanoshiku"],
  ];
  for (const [form, kana, kanji, romaji] of cases) {
    it(`楽しい -> ${form}`, () => {
      expect(conjugateAdjective("たのしい", "楽しい", "i", form)).toEqual({ kana, kanji, romaji });
    });
  }

  it("いい conjugates from the よ stem, never the い", () => {
    expect(conjugateAdjective("いい", "いい", "i", "negative")).toEqual({
      kana: "よくない",
      kanji: "よくない",
      romaji: "yokunai",
    });
    expect(conjugateAdjective("いい", "いい", "i", "past")?.kana).toBe("よかった");
    expect(conjugateAdjective("いい", "いい", "i", "adverb")?.kana).toBe("よく");
  });
});

describe("conjugateAdjective: na-adjective", () => {
  it("静か attaches na-adjective endings", () => {
    expect(conjugateAdjective("しずか", "静か", "na", "negative")).toEqual({
      kana: "しずかじゃない",
      kanji: "静かじゃない",
      romaji: "shizukajanai",
    });
    expect(conjugateAdjective("しずか", "静か", "na", "past")?.kana).toBe("しずかだった");
    expect(conjugateAdjective("しずか", "静か", "na", "adverb")?.kana).toBe("しずかに");
  });
});
