import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";
import { LevelProvider } from "../../components/level";
import { ThemeProvider } from "../../components/theme";
import { loadLevelData, type LevelData } from "../../content/loaders";
import type { JlptLevel } from "../../content/ids";
import type { GrammarLesson, KanjiItem } from "../../content/models";
import type { GrammarStateRow, NihonDb } from "../../storage/db";
import type { ItemMastery } from "../../storage/progressRepo";
import type { DueQueue, SrsStats } from "../../storage/srsRepo";
import { activityRows, masteryByItems } from "../../storage/progressRepo";
import { dashboardSrsData } from "../../storage/srsRepo";
import { db } from "../../storage/db";

vi.mock("../../storage/srsRepo", () => ({ dashboardSrsData: vi.fn() }));
vi.mock("../../storage/progressRepo", () => ({ masteryByItems: vi.fn(), activityRows: vi.fn() }));
vi.mock("../../storage/db", () => ({ db: vi.fn() }));
vi.mock("../../content/loaders", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, loadLevelData: vi.fn() };
});

const KANJI_COUNT = 130;

const bulkGet = vi.fn<(ids: string[]) => Promise<(GrammarStateRow | undefined)[]>>();

function kanjiItems(level: JlptLevel): KanjiItem[] {
  return Array.from({ length: KANJI_COUNT }, (_, i) => ({
    id: `kanji:${level}:${String(i).padStart(5, "0")}`,
    level,
    char: String.fromCodePoint(0x4e00 + i),
    reading: "かん",
    meaning: "kanji",
    answers: ["かん"],
  }));
}

function grammarItems(level: JlptLevel): GrammarLesson[] {
  return [1, 2].map((n) => ({
    id: `grammar:${level}:lesson-${n}`,
    level,
    lessonId: `lesson-${n}`,
    title: `${level.toUpperCase()} GRAMMAR ${n}`,
    category: "basics",
    pattern: "〜",
    explanation: "",
    examples: [],
    quiz: [],
  }));
}

function levelData(level: JlptLevel): LevelData {
  return {
    level,
    kana: { items: [], flags: [] },
    kanji: { items: kanjiItems(level), flags: [] },
    vocab: { items: [], flags: [] },
    grammar: { items: grammarItems(level), flags: [] },
  };
}

function emptyStats(): SrsStats {
  return {
    total: 0,
    due: 0,
    learned: 0,
    lapses: 0,
    mastered: 0,
    learning: 0,
    fresh: 0,
    byKind: { kanji: { total: 0, learned: 0 }, vocab: { total: 0, learned: 0 } },
    byLevel: {
      n5: { total: 0, learned: 0 },
      n4: { total: 0, learned: 0 },
      n3: { total: 0, learned: 0 },
      n2: { total: 0, learned: 0 },
      n1: { total: 0, learned: 0 },
    },
  };
}

function srsData(
  due: string[] = [],
  newCandidates: string[] = [],
): { queue: DueQueue; stats: SrsStats } {
  return { queue: { due, newCandidates }, stats: emptyStats() };
}

function masteryFor(ids: string[], mastered = 0, learning = 0): Map<string, ItemMastery> {
  const result = new Map<string, ItemMastery>();
  ids.forEach((id, i) => {
    const accuracy = i < mastered ? 1 : i < mastered + learning ? 0.5 : 0;
    const attempts = accuracy === 0 ? 0 : 4;
    result.set(id, {
      attempts,
      correct: Math.round(accuracy * attempts),
      accuracy,
      lastSeen: attempts === 0 ? null : 1,
    });
  });
  return result;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <LevelProvider>
          <DashboardPage />
        </LevelProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(loadLevelData)
    .mockReset()
    .mockImplementation(async (level) => levelData(level));
  vi.mocked(dashboardSrsData).mockReset().mockResolvedValue(srsData());
  vi.mocked(masteryByItems)
    .mockReset()
    .mockImplementation(async (ids) => masteryFor(ids));
  vi.mocked(activityRows).mockReset().mockResolvedValue([]);
  bulkGet.mockReset().mockImplementation(async (ids) => ids.map(() => undefined));
  vi.mocked(db)
    .mockReset()
    .mockReturnValue({ grammarState: { bulkGet } } as unknown as NihonDb);
});

afterEach(cleanup);

describe("DashboardPage repository state", () => {
  it("claims no counts or completion while repository reads are pending", async () => {
    const pending = deferred<never>().promise;
    vi.mocked(dashboardSrsData).mockReturnValue(pending);
    vi.mocked(masteryByItems).mockReturnValue(pending);
    vi.mocked(activityRows).mockReturnValue(pending);
    bulkGet.mockReturnValue(pending);

    renderDashboard();
    await screen.findByTestId("dashboard-content-loading");

    expect(screen.queryByTestId("routine-cta")).toBeNull();
    expect(screen.queryByTestId("kanji-map-compact")).toBeNull();
    expect(screen.queryByTestId("grammar-position")).toBeNull();
    expect(screen.queryByText(/Nothing is due/)).toBeNull();
    expect(screen.queryByText(/MASTERED \d/)).toBeNull();
    expect(screen.queryByText(/COMPLETE/)).toBeNull();
  });

  it("shows an accessible error and recovers when Retry is pressed", async () => {
    vi.mocked(dashboardSrsData)
      .mockRejectedValueOnce(new Error("indexeddb unavailable"))
      .mockResolvedValue(srsData(["kanji:n5:00000"]));

    renderDashboard();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("could not be read");
    expect(screen.queryByTestId("routine-cta")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText(/START REVIEW \(1 due/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("kanji-map-compact").textContent).toBe(
      `MASTERED 0/${KANJI_COUNT} · LEARNING 0`,
    );
  });

  it("never renders a stale read that resolves after the level switch", async () => {
    const n5 = deferred<{ queue: DueQueue; stats: SrsStats }>();
    const n4 = deferred<{ queue: DueQueue; stats: SrsStats }>();
    vi.mocked(dashboardSrsData).mockImplementation((poolIds) => {
      const isN4 = poolIds.some((id) => id.startsWith("kanji:n4:"));
      return isN4 ? n4.promise : n5.promise;
    });

    renderDashboard();
    await screen.findByTestId("dashboard-content-loading");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "N4" }));
    });

    await act(async () => {
      n4.resolve(srsData([], ["kanji:n4:00000"]));
    });
    expect(await screen.findByText("N4 GRAMMAR 1")).toBeTruthy();
    expect(screen.getByText(/START NEW CARDS \(1\)/)).toBeTruthy();

    await act(async () => {
      n5.resolve(srsData(["kanji:n5:00000"], ["kanji:n5:00001"]));
    });

    expect(screen.getByText("N4 GRAMMAR 1")).toBeTruthy();
    expect(screen.queryByText("N5 GRAMMAR 1")).toBeNull();
    expect(screen.queryByText(/START REVIEW \(1 due/)).toBeNull();
  });

  it("previews the first 80 kanji while summarizing the whole pool", async () => {
    vi.mocked(masteryByItems).mockImplementation(async (ids) => {
      const result = new Map<string, ItemMastery>();
      ids.forEach((id, i) => {
        const mastered = i < 4 || (i >= 100 && i < 105);
        const learning = i >= 105 && i < 108;
        const attempts = mastered || learning ? 4 : 0;
        result.set(id, {
          attempts,
          correct: mastered ? 4 : learning ? 2 : 0,
          accuracy: mastered ? 1 : learning ? 0.5 : 0,
          lastSeen: attempts === 0 ? null : 1,
        });
      });
      return result;
    });

    const { container } = renderDashboard();
    const summary = await screen.findByTestId("kanji-map-compact");

    expect(summary.textContent).toBe(`MASTERED 9/${KANJI_COUNT} · LEARNING 3`);
    expect(screen.getByRole("link", { name: "Full map and inspector" })).toBeTruthy();

    const cells = container.querySelectorAll(".kanji-cell");
    expect(cells).toHaveLength(80);
    expect(cells[0].textContent).toBe(String.fromCodePoint(0x4e00));
    expect(cells[79].textContent).toBe(String.fromCodePoint(0x4e00 + 79));
    // Bands still render inside the preview; totals above cover items past it.
    expect(container.querySelectorAll(".kanji-cell.mastered")).toHaveLength(4);
  });
});
