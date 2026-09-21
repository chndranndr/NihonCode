// @vitest-environment node
import { describe, expect, it } from "vitest";
import { scrubJapanese } from "./scrub.mjs";

describe("scrubJapanese", () => {
  it("strips C1 control bytes scraped into prompts", () => {
    expect(scrubJapanese("これは何\u3000\u0081_______\u3000いう花ですか。")).toBe(
      "これは何\u3000_______\u3000いう花ですか。",
    );
  });

  it("maps fullwidth hyphen-minus to the chōon", () => {
    expect(scrubJapanese("パ－ティー")).toBe("パーティー");
    expect(scrubJapanese("ギタ－")).toBe("ギター");
    expect(scrubJapanese("セ－タ－")).toBe("セーター");
  });

  it("preserves blanks, ideographic space, and real chōon", () => {
    expect(scrubJapanese("_______\u3000ですー")).toBe("_______\u3000ですー");
  });

  it("passes clean text and non-strings through unchanged", () => {
    expect(scrubJapanese("clean text")).toBe("clean text");
    expect(scrubJapanese(null)).toBe(null);
    expect(scrubJapanese(3)).toBe(3);
  });
});
