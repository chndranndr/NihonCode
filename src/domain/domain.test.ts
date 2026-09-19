import { describe, expect, it } from "vitest";
import { grade, normalizeAnswer } from "./grading";
import {
  applyStudyDay,
  levelFromXp,
  MAX_LEVEL,
  perfectDrillBonus,
  xpForLevel,
  xpProgress,
} from "./progress";
import {
  deserializeCard,
  isDue,
  newCard,
  ratingFromCorrect,
  reviewCard,
  serializeCard,
} from "./scheduling";

describe("grading", () => {
  it("is case-insensitive and whitespace-tolerant", () => {
    expect(grade({ submitted: "  MiZu ", accepted: ["mizu"] })).toBe(true);
    expect(grade({ submitted: "MIZU", accepted: ["mizu"] })).toBe(true);
  });

  it("accepts alternate readings and rejects wrong answers", () => {
    expect(grade({ submitted: "スイ", accepted: ["みず", "スイ"] })).toBe(true);
    expect(grade({ submitted: "ひ", accepted: ["みず"] })).toBe(false);
  });

  it("does not accept answers differing only by the prolonged sound mark", () => {
    // ー (U+30FC) is a letter, not punctuation: stripping it would accept
    // "シツ" for "シーツ" (PRD 10.8 normalizes non-letter characters only).
    expect(grade({ submitted: "シツ", accepted: ["シーツ"] })).toBe(false);
    expect(grade({ submitted: "シーツ", accepted: ["シーツ"] })).toBe(true);
  });

  it("normalizes punctuation and full-width forms", () => {
    expect(normalizeAnswer("Ｍｉｚｕ．")).toBe("mizu");
    expect(grade({ submitted: "mizu.", accepted: ["mizu"] })).toBe(true);
  });

  it("rejects empty submissions", () => {
    expect(grade({ submitted: "   ", accepted: ["mizu"] })).toBe(false);
  });
});

describe("progress rules", () => {
  it("levels follow the quadratic curve to 50", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(xpForLevel(2))).toBe(2);
    expect(levelFromXp(xpForLevel(50) + 10_000)).toBe(MAX_LEVEL);
    expect(xpProgress(xpForLevel(3) + 50).intoLevel).toBe(50);
  });

  it("streak extends on consecutive days, resets on gaps, no-ops same day", () => {
    const start = applyStudyDay({ streakDays: 0, lastStudyDay: null }, "2026-09-19");
    expect(start).toEqual({ streakDays: 1, lastStudyDay: "2026-09-19" });
    const same = applyStudyDay(start, "2026-09-19");
    expect(same.streakDays).toBe(1);
    const next = applyStudyDay(start, "2026-09-20");
    expect(next.streakDays).toBe(2);
    const gap = applyStudyDay(next, "2026-09-25");
    expect(gap.streakDays).toBe(1);
  });

  it("streak rolls over month boundaries", () => {
    const s = applyStudyDay({ streakDays: 4, lastStudyDay: "2026-09-30" }, "2026-10-01");
    expect(s.streakDays).toBe(5);
  });

  it("perfect drill bonus only on a flawless run", () => {
    expect(perfectDrillBonus(10, 10)).toBe(20);
    expect(perfectDrillBonus(9, 10)).toBe(0);
    expect(perfectDrillBonus(0, 0)).toBe(0);
  });
});

describe("scheduling", () => {
  it("maps correctness to Again/Good", () => {
    expect(ratingFromCorrect(true)).toBe("good");
    expect(ratingFromCorrect(false)).toBe("again");
  });

  it("a reviewed card moves its due date and survives serialization", () => {
    const now = new Date("2026-09-19T12:00:00Z");
    const card = newCard(now);
    expect(isDue(card, now)).toBe(true);
    const { card: reviewed } = reviewCard(card, "good", now);
    expect(reviewed.reps).toBe(1);
    const round = deserializeCard(serializeCard(reviewed));
    expect(round.due.getTime()).toBe(reviewed.due.getTime());
    expect(round.state).toBe(reviewed.state);
  });

  it("Again keeps the card due sooner than Good", () => {
    const now = new Date("2026-09-19T12:00:00Z");
    const again = reviewCard(newCard(now), "again", now).card;
    const good = reviewCard(newCard(now), "good", now).card;
    expect(again.due.getTime()).toBeLessThan(good.due.getTime());
  });
  it("skipLearningSteps moves the card onto a long-term interval", () => {
    const now = new Date("2026-09-19T12:00:00Z");
    const withSteps = reviewCard(newCard(now), "good", now).card;
    const skipped = reviewCard(newCard(now), "good", now, { skipLearningSteps: true }).card;
    // Skipping learning steps leaves the short-term scheduler: the card lands
    // on a long-term interval instead of the minutes-scale learning step.
    expect(skipped.due.getTime() - now.getTime()).toBeGreaterThan(
      withSteps.due.getTime() - now.getTime(),
    );
  });
});
