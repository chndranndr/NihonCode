import { describe, expect, it } from "vitest";
import { dayReading, makeFullDate, monthReading, WEEKDAYS, yearReading } from "./dates";
import { makeNumberQuestionInRange, numberReading, numberToJapanese } from "./numbers";

describe("numbers", () => {
  it("reads irregular hundreds and thousands", () => {
    expect(numberToJapanese(300)).toBe("さんびゃく");
    expect(numberToJapanese(600)).toBe("ろっぴゃく");
    expect(numberToJapanese(800)).toBe("はっぴゃく");
    expect(numberToJapanese(3000)).toBe("さんぜん");
    expect(numberToJapanese(8000)).toBe("はっせん");
    expect(numberToJapanese(1000)).toBe("せん");
    expect(numberToJapanese(10000)).toBe("まん");
  });

  it("composes mixed magnitudes", () => {
    expect(numberToJapanese(1234)).toBe("せんにひゃくさんじゅうよん");
    expect(numberToJapanese(999999)).toBe(
      "きゅうじゅうきゅうまんきゅうせんきゅうひゃくきゅうじゅうきゅう",
    );
    expect(numberToJapanese(1)).toBe("いち");
  });

  it("romaji agrees with the japanese form structurally", () => {
    expect(numberReading(300).romaji).toBe("sanbyaku");
    expect(numberReading(1234).romaji).toBe("sennihyakusanjuuyon");
    expect(numberReading(46).romaji).toBe("yonjuuroku");
  });

  it("rejects out-of-range values", () => {
    expect(() => numberToJapanese(0)).toThrow(RangeError);
    expect(() => numberToJapanese(1_000_000)).toThrow(RangeError);
  });

  it("generates questions inside the chosen range", () => {
    const q = makeNumberQuestionInRange(1, 99, () => 0.5);
    expect(q.value).toBe(50);
    expect(q.japanese).toBe(numberToJapanese(q.value));
  });
});

describe("dates", () => {
  it("reads irregular day counters", () => {
    expect(dayReading(1)).toBe("ついたち");
    expect(dayReading(14)).toBe("じゅうよっか");
    expect(dayReading(20)).toBe("はつか");
    expect(dayReading(11)).toBe("じゅういちにち");
  });

  it("reads months and years", () => {
    expect(monthReading(4)).toBe("しがつ");
    expect(yearReading(2026)).toBe("にせんにじゅうろくねん");
  });

  it("builds full dates with weekday in english", () => {
    const d = makeFullDate(2026, 2026, () => 0);
    expect(d.japanese).toBe("にせんにじゅうろくねんいちがつついたち");
    expect(d.english).toContain("Thursday");
  });

  it("has the seven weekday items", () => {
    expect(WEEKDAYS).toHaveLength(7);
  });
});
