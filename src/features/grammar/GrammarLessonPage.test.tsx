import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GrammarLessonPage } from "./GrammarLessonPage";
import type { GrammarLesson } from "../../content/models";
import { awardXp, recordSession } from "../../storage/progressRepo";
import { XP } from "../../domain/progress";

const lessons: GrammarLesson[] = [1, 2].map((n) => ({
  id: `grammar:n5:lesson-${n}`,
  level: "n5",
  lessonId: `lesson-${n}`,
  title: `Lesson ${n}`,
  category: "basics",
  pattern: "〜です",
  explanation: "",
  examples: [{ jp: "今日(きょう)は雨(あめ)です", romaji: "kyou", en: "Rain today" }],
  quiz: [
    {
      id: `q${n}`,
      prompt: "今日(きょう)は？",
      choices: ["はい(yes)", "いいえ"],
      answer: "はい(yes)",
    },
  ],
}));

vi.mock("../../components/level", () => ({
  useLevel: () => ({ pools: { grammar: lessons }, level: "n5" }),
}));
vi.mock("../../storage/db", () => ({
  db: () => ({ grammarState: { get: async () => undefined, put: async () => undefined } }),
}));
vi.mock("../../storage/progressRepo", () => ({
  recordSession: vi.fn(async () => true),
  awardXp: vi.fn(),
  newSessionId: () => "grammar-test",
}));
vi.mock("../../components/SpeakerButton", () => ({
  SpeakerButton: ({ text }: { text: string }) => <span data-testid="speak">{text}</span>,
}));

afterEach(cleanup);

describe("GrammarLessonPage", () => {
  it("renders ruby, speaks stripped text, and shows a completion summary", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/learn/grammar/lesson-1"]}>
        <Routes>
          <Route path="/learn/grammar/:lessonId" element={<GrammarLessonPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.querySelectorAll(".example ruby rt").length).toBe(2);
    expect(container.querySelectorAll(".quiz-prompt ruby rt").length).toBe(1);
    expect(screen.getByTestId("speak").textContent).toBe("今日は雨です");

    fireEvent.click(screen.getByRole("button", { name: /はい/ }));
    fireEvent.click(screen.getByRole("button", { name: "FINISH" }));

    await waitFor(() => expect(screen.getByTestId("summary")).toBeTruthy());
    expect(screen.getByTestId("summary-xp").textContent).toBe(`+${XP.grammarQuiz}`);
    expect(screen.getByText("1 / 1")).toBeTruthy();
    expect(screen.getByRole("button", { name: "NEXT LESSON" })).toBeTruthy();
    expect(recordSession).toHaveBeenCalledTimes(1);
    expect(awardXp).toHaveBeenCalledWith(XP.grammarQuiz);
  });
});
