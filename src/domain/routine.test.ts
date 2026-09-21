import { describe, expect, it } from "vitest";
import { routineAction, routineLabel } from "./routine";

describe("routine CTA state machine", () => {
  it("prefers due review with count and estimate", () => {
    const action = routineAction({ dueCount: 12, newCardCount: 20, poolSize: 92 });
    expect(action).toEqual({ kind: "review", dueCount: 12, estimateMinutes: 2 });
    expect(routineLabel(action)).toContain("12 due");
  });

  it("falls back to new cards when nothing is due", () => {
    const action = routineAction({ dueCount: 0, newCardCount: 20, poolSize: 92 });
    expect(action).toEqual({ kind: "new-cards", count: 20 });
  });

  it("falls back to a drill when the queue is empty but a pool exists", () => {
    expect(routineAction({ dueCount: 0, newCardCount: 0, poolSize: 92 })).toEqual({
      kind: "drill",
      mode: "kana",
    });
  });

  it("falls back to progress when there is nothing to study", () => {
    expect(routineAction({ dueCount: 0, newCardCount: 0, poolSize: 0 })).toEqual({
      kind: "progress",
    });
  });

  it("estimates at least one minute for any due card", () => {
    const one = routineAction({ dueCount: 1, newCardCount: 0, poolSize: 1 });
    expect(one.kind).toBe("review");
    expect(routineLabel(one)).toContain("~1 min");
    expect(routineLabel(routineAction({ dueCount: 25, newCardCount: 0, poolSize: 1 }))).toContain(
      "~5 min",
    );
  });
});
