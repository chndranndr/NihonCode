import { describe, expect, it } from "vitest";
import { countOf } from "./format";

describe("countOf", () => {
  it("pluralises zero", () => expect(countOf(0, "session")).toBe("0 sessions"));
  it("keeps one singular", () => expect(countOf(1, "session")).toBe("1 session"));
  it("pluralises many", () => expect(countOf(2, "completed session")).toBe("2 completed sessions"));
  it("accepts a custom plural", () => expect(countOf(2, "person", "people")).toBe("2 people"));
});
