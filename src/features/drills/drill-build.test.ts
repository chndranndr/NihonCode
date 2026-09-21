import { beforeAll, describe, expect, it } from "vitest";
import { buildItems, DEFAULT_OPTIONS, type DrillOptions } from "./DrillPage";
import { loadLevelData } from "../../content/loaders";
import { poolsFromLevelData, type Pools } from "../../components/pools";

let pools!: Pools;
beforeAll(async () => {
  pools = poolsFromLevelData(await loadLevelData("n5"));
});

function options(patch: Partial<DrillOptions>): DrillOptions {
  return { ...DEFAULT_OPTIONS, ...patch };
}

describe("drill pool builders (PRD 10.7 / 10.8)", () => {
  it("numbers generates the full offered count", () => {
    expect(buildItems("numbers", pools, DEFAULT_OPTIONS)).toHaveLength(50);
  });

  it("dates weekdays mode is exactly the 7 weekday items", () => {
    const items = buildItems("dates", pools, options({ dateMode: "weekdays" }));
    expect(items).toHaveLength(7);
    expect(items.every((i) => i.id.startsWith("dates:weekday:"))).toBe(true);
  });

  it("dates full mode is full dates only, at the offered count", () => {
    const items = buildItems("dates", pools, options({ dateMode: "full" }));
    expect(items).toHaveLength(50);
    expect(items.every((i) => i.id.startsWith("dates:full:"))).toBe(true);
  });

  it("numbers direction swaps prompt and accepted forms", () => {
    const jp2num = buildItems("numbers", pools, options({ direction: "jp2num" }));
    const num2jp = buildItems("numbers", pools, options({ direction: "num2jp" }));
    expect(/^\d+$/.test(jp2num[0].accepted[0])).toBe(true);
    expect(/^[a-z]+$/.test(num2jp[0].accepted[0])).toBe(true);
  });

  it("dates direction swaps japanese and english sides", () => {
    const jp2en = buildItems("dates", pools, options({ dateMode: "weekdays", direction: "jp2en" }));
    const en2jp = buildItems("dates", pools, options({ dateMode: "weekdays", direction: "en2jp" }));
    expect(jp2en[0].prompt).toMatch(/[曜日]/);
    expect(en2jp[0].prompt).toMatch(/day/);
  });
});

describe("kana, kanji, vocab builders grade real content (DEVELOPMENT_PROMPT task 11)", () => {
  it("every graded builder emits items with non-empty accepted answers", () => {
    for (const mode of ["kana", "kanji", "vocab"] as const) {
      const items = buildItems(mode, pools, DEFAULT_OPTIONS);
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
    const items = buildItems("kana", pools, DEFAULT_OPTIONS);
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
    const items = buildItems("kanji", pools, DEFAULT_OPTIONS);
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

  it("kanji drill accepts romaji readings alongside kana answers", () => {
    const items = buildItems("kanji", pools, DEFAULT_OPTIONS);
    const mizu = items.find((i) => i.prompt === "水");
    expect(mizu, "水 in pool").toBeDefined();
    expect(mizu!.accepted).toContain("mizu");
    // Multi-reading kanji: answers are atomic, so every reading gets romaji —
    // 九's display reading "ここのつ / キュウ ク" must not starve its on-reads.
    const kyuu = items.find((i) => i.prompt === "九");
    expect(kyuu, "九 in pool").toBeDefined();
    expect(kyuu!.accepted).toContain("kokonotsu");
    expect(kyuu!.accepted).toContain("kyuu");
    expect(kyuu!.accepted).toContain("ku");
    for (const item of items) {
      for (const a of item.accepted) {
        expect(a, `${item.id} accepted "${a}"`).not.toBe("");
      }
    }
  });

  it("weekdays en→jp accept the reading and its romaji", () => {
    const items = buildItems("dates", pools, {
      ...DEFAULT_OPTIONS,
      direction: "en2jp",
      dateMode: "weekdays",
    });
    expect(items).toHaveLength(7);
    const monday = items.find((i) => i.prompt === "Monday");
    expect(monday!.accepted).toContain("月曜日");
    expect(monday!.accepted).toContain("getsuyoubi");
  });

  it("vocab accepts genuine Latin romaji and speaks the kana", () => {
    const items = buildItems("vocab", pools, DEFAULT_OPTIONS);
    expect(items).toHaveLength(738);
    for (const item of items) {
      expect(item.accepted[0], item.id).toMatch(/^[\x20-\x7e]+$/);
      expect(item.accepted[0], item.id).not.toMatch(/[;；/]/);
      expect(item.id).toMatch(/^vocab:n5:.+\|.+/);
      expect(item.reveal.scripts).toContain(item.speakText);
    }
  });
});

describe("conjugation builder (PRD 10.9)", () => {
  it("draws every conjugable verb, one item per word per form", () => {
    const items = buildItems("conjugation", pools, DEFAULT_OPTIONS);
    // 117 curated verbs (docs/data-quality.md) × 1 form (masu).
    expect(items).toHaveLength(117);
    for (const item of items) {
      expect(item.accepted[0], item.id).toMatch(/^[\x20-\x7e]+$/);
      expect(item.reveal.scripts).toHaveLength(2);
    }
  });

  it("draws every conjugable adjective when word type is adjective", () => {
    const items = buildItems("conjugation", pools, {
      ...DEFAULT_OPTIONS,
      conjWordType: "adjective",
    });
    // 84 curated adjectives × 1 form (negative).
    expect(items).toHaveLength(84);
  });

  it("class selection narrows the pool to that class", () => {
    const items = buildItems("conjugation", pools, {
      ...DEFAULT_OPTIONS,
      conjVerbClasses: ["godan"],
    });
    expect(items).toHaveLength(80);
  });

  it("multiple selected forms multiply the question pool", () => {
    const items = buildItems("conjugation", pools, {
      ...DEFAULT_OPTIONS,
      conjVerbForms: ["masu", "te"],
    });
    expect(items).toHaveLength(234);
  });

  it("te-form answers carry the godan sound changes", () => {
    const items = buildItems("conjugation", pools, {
      ...DEFAULT_OPTIONS,
      conjVerbForms: ["te"],
      conjVerbClasses: ["godan"],
    });
    const iku = items.find((i) => i.prompt === "行く");
    expect(iku!.accepted).toEqual(["itte"]);
    const aruku = items.find((i) => i.prompt === "歩く");
    expect(aruku!.accepted).toEqual(["aruite"]);
  });

  it("いい negative grades the よ stem, not the い", () => {
    const items = buildItems("conjugation", pools, {
      ...DEFAULT_OPTIONS,
      conjWordType: "adjective",
      conjAdjForms: ["negative"],
    });
    const ii = items.find((i) => i.prompt === "いい");
    expect(ii!.accepted).toEqual(["yokunai"]);
    expect(ii!.reveal.scripts).toEqual(["よくない", "よくない"]);
  });
});
