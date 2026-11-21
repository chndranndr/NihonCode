import { describe, expect, it } from "vitest";
import { loadLevelData } from "../content/loaders";
import { scriptSplit } from "../domain/kanjiReadings";
import { poolsFromLevelData } from "./pools";

describe("scriptSplit", () => {
  it("keeps multi-reading on'yomi (spaces) out of kun'yomi", () => {
    expect(scriptSplit("にし / セイ サイ")).toEqual({ on: "セイ サイ", kun: "にし" });
  });
  it("handles katakana-only, kun-only and empty readings", () => {
    expect(scriptSplit("ニチ")).toEqual({ on: "ニチ", kun: "" });
    expect(scriptSplit("ひ / ほん")).toEqual({ on: "", kun: "ひ、ほん" });
    expect(scriptSplit("")).toEqual({ on: "", kun: "" });
  });
  it("never leaves a katakana-only segment in kun for any N5 kanji", async () => {
    const pools = poolsFromLevelData(await loadLevelData("n5"));
    expect(pools.kanji.length).toBeGreaterThan(0);
    for (const k of pools.kanji) {
      const { kun } = scriptSplit(k.reading);
      expect(/[゠-ヿ]/.test(kun), `${k.id} ${k.reading}`).toBe(false);
    }
  });
});
