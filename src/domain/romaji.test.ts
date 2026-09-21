import { describe, expect, it } from "vitest";
import { kanaToRomaji } from "./romaji";

describe("kanaToRomaji", () => {
  it("transliterates the gojuon and dakuten/handakuten", () => {
    expect(kanaToRomaji("みず")).toBe("mizu");
    expect(kanaToRomaji("しお")).toBe("shio");
    expect(kanaToRomaji("がっこう")).toBe("gakkou");
    expect(kanaToRomaji("ふね")).toBe("fune");
    expect(kanaToRomaji("ぱん")).toBe("pan");
  });

  it("handles yōon and the chōon mark", () => {
    expect(kanaToRomaji("きょう")).toBe("kyou");
    expect(kanaToRomaji("せんせい")).toBe("sensei");
    expect(kanaToRomaji("おにいさん")).toBe("oniisan");
  });

  it("j/sh/ch-row yōon is Hepburn, matching pool romaji style", () => {
    expect(kanaToRomaji("じゅう")).toBe("juu");
    expect(kanaToRomaji("じょうず")).toBe("jouzu");
    expect(kanaToRomaji("しずかじゃない")).toBe("shizukajanai");
    expect(kanaToRomaji("しゃしん")).toBe("shashin");
    expect(kanaToRomaji("ちょう")).toBe("chou");
    expect(kanaToRomaji("きょう")).toBe("kyou");
  });

  it("doubles the consonant for sokuon, t- before ch-", () => {
    expect(kanaToRomaji("きっと")).toBe("kitto");
    expect(kanaToRomaji("こっち")).toBe("kotchi");
  });

  it("returns null on unsupported input instead of guessing", () => {
    expect(kanaToRomaji("水")).toBeNull();
    expect(kanaToRomaji("")).toBeNull();
    expect(kanaToRomaji("みず!")).toBeNull();
  });
});
