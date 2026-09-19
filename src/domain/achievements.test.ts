import { describe, expect, it } from "vitest";
import { achievements, coverageEstimate, type AchievementInput } from "./achievements";

const empty: AchievementInput = {
  xp: 0,
  streakDays: 0,
  totalSessions: 0,
  drillSessions: 0,
  perfectSessions: 0,
  reviewsCompleted: 0,
  grammarCompleted: 0,
  weeklyXp: {},
};

describe("achievements", () => {
  it("starts fully locked with teaching requirements", () => {
    const list = achievements(empty);
    expect(list.every((a) => !a.unlocked)).toBe(true);
    expect(list.every((a) => a.requirement.length > 0)).toBe(true);
  });

  it("unlocks from stored state only", () => {
    const list = achievements({
      ...empty,
      totalSessions: 1,
      drillSessions: 1,
      xp: 120,
      streakDays: 3,
    });
    const byId = new Map(list.map((a) => [a.id, a.unlocked]));
    expect(byId.get("first-session")).toBe(true);
    expect(byId.get("xp-100")).toBe(true);
    expect(byId.get("streak-3")).toBe(true);
    expect(byId.get("streak-7")).toBe(false);
    expect(byId.get("first-perfect")).toBe(false);
  });

  it("counts today's study from the weekly bucket", () => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const list = achievements({ ...empty, weeklyXp: { [key]: 5 } }, today);
    expect(list.find((a) => a.id === "daily")?.unlocked).toBe(true);
  });
});

describe("coverage estimate", () => {
  it("is zero with nothing studied", () => {
    expect(coverageEstimate(0, 723, 0, 72)).toBe(0);
  });

  it("mixes cards and lessons over the pool", () => {
    expect(coverageEstimate(80, 723, 72, 72)).toBeCloseTo((80 + 72) / (723 + 72), 6);
  });

  it("caps at full coverage", () => {
    expect(coverageEstimate(9999, 723, 999, 72)).toBe(1);
  });

  it("is zero when pools are empty", () => {
    expect(coverageEstimate(0, 0, 0, 0)).toBe(0);
  });
});
