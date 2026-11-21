import { beforeAll, describe, expect, it } from "vitest";
import { loadLevelData } from "../../content/loaders";
import { poolsFromLevelData, type Pools } from "../../components/pools";
import type { SessionItem } from "../../components/DrillSession";
import { DEFAULT_OPTIONS, buildItems, type DrillOptions } from "./DrillPage";

// The answer cue is the only in-session statement of what to type, and the
// grader does not transliterate. So every cue must describe exactly the
// scripts its accepted answers are written in (2026-11-21 critique P1).
const LATIN = /^[a-z0-9 ,'-]+$/i;
const KANA = /^[぀-ヿー]+$/u;
const HIRAGANA = /^[぀-ゟー]+$/u;
const KANJI = /[一-龯]/u;

function assertCueMatches(item: SessionItem): void {
  const { ask, accepted } = item;
  expect(ask.trim().length, `${item.id} has no answer cue`).toBeGreaterThan(0);
  const where = `${item.id} "${ask}" vs [${accepted.join(" / ")}]`;
  if (ask === "number in digits") {
    expect(
      accepted.every((a) => /^\d+$/.test(a)),
      where,
    ).toBe(true);
  } else if (ask === "reading in hiragana") {
    expect(
      accepted.every((a) => HIRAGANA.test(a)),
      where,
    ).toBe(true);
  } else if (ask === "reading in kana or romaji") {
    expect(
      accepted.every((a) => KANA.test(a) || LATIN.test(a)),
      where,
    ).toBe(true);
    expect(
      accepted.some((a) => KANA.test(a)),
      where,
    ).toBe(true);
    expect(
      accepted.some((a) => LATIN.test(a)),
      where,
    ).toBe(true);
  } else if (ask === "day name in kanji or romaji") {
    expect(
      accepted.some((a) => KANJI.test(a)),
      where,
    ).toBe(true);
    expect(
      accepted.some((a) => LATIN.test(a)),
      where,
    ).toBe(true);
  } else if (/romaji|English/.test(ask)) {
    expect(
      accepted.every((a) => LATIN.test(a)),
      where,
    ).toBe(true);
  } else {
    throw new Error(`no truth rule for cue "${ask}"; add one here`);
  }
}

let pools: Pools;
beforeAll(async () => {
  pools = poolsFromLevelData(await loadLevelData("n5"));
});

const cases: Array<[string, string, Partial<DrillOptions>]> = [
  ["kana", "kana", {}],
  ["kanji", "kanji", {}],
  ["vocab", "vocab", {}],
  ["numbers jp→num", "numbers", { direction: "jp2num" }],
  ["numbers num→jp", "numbers", { direction: "num2jp" }],
  ["weekdays jp→en", "dates", { direction: "jp2en", dateMode: "weekdays" }],
  ["weekdays en→jp", "dates", { direction: "en2jp", dateMode: "weekdays" }],
  ["full dates jp→en", "dates", { direction: "jp2en", dateMode: "full" }],
  ["full dates en→jp", "dates", { direction: "en2jp", dateMode: "full" }],
  ["conjugation verbs", "conjugation", { conjWordType: "verb" }],
  ["conjugation adjectives", "conjugation", { conjWordType: "adjective" }],
];

describe("drill answer cues describe what the grader accepts", () => {
  it.each(cases)("%s", (_label, mode, overrides) => {
    const items = buildItems(mode, pools, { ...DEFAULT_OPTIONS, ...overrides });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) assertCueMatches(item);
  });

  it("gives full English dates a format example that itself grades", () => {
    const [item] = buildItems("dates", pools, {
      ...DEFAULT_OPTIONS,
      direction: "jp2en",
      dateMode: "full",
    });
    expect(item.example).toMatch(LATIN);
    expect(item.example?.split(",")[0]).toMatch(/day$/);
  });
});

// The vocab prompt is the kanji alone, so homographs (N4 挨拶: aisatsu "a
// greeting" and aisatsusuru "to greet") show the learner the same card. Every
// item behind one prompt must accept the same readings, or a correct answer
// grades WRONG for whichever entry was drawn (flaky e2e, 2026-11-21).
describe("vocab items that share a prompt accept the same readings", () => {
  it.each(["n5", "n4", "n3", "n2", "n1"] as const)("%s", async (level) => {
    const levelPools = poolsFromLevelData(await loadLevelData(level));
    const items = buildItems("vocab", levelPools, DEFAULT_OPTIONS);
    const byPrompt = new Map<string, string>();
    for (const item of items) {
      const accepted = [...item.accepted].sort().join(" / ");
      const seen = byPrompt.get(item.prompt);
      if (seen === undefined) byPrompt.set(item.prompt, accepted);
      else expect(accepted, `${level} ${item.prompt}`).toBe(seen);
    }
  });
});
