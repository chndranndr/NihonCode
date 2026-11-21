import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DrillSession, type SessionItem } from "./DrillSession";

afterEach(cleanup);

const item: SessionItem = {
  id: "kana:hiragana:ふ",
  prompt: "ふ",
  accepted: ["fu", "hu"],
  ask: "romaji reading",
  reveal: { scripts: ["ふ"], meaning: "fu", group: "hiragana" },
  speakText: "ふ",
};

function answer(text: string) {
  render(<DrillSession title="Kana" items={[item]} onFinish={() => {}} onAbort={() => {}} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Answer" }), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "SUBMIT" }));
  return screen.getByTestId("reveal");
}

describe("DrillSession reveal", () => {
  it("marks a miss in red and echoes what the learner typed", () => {
    const reveal = answer("zz");
    expect(reveal.classList.contains("miss")).toBe(true);
    expect(reveal.classList.contains("ok")).toBe(false);
    expect(screen.getByTestId("reveal-typed").textContent).toBe("you typed: zz");
    expect(reveal.textContent).toContain("accepted: fu / hu");
  });

  it("says so when the learner submitted nothing", () => {
    answer("   ");
    expect(screen.getByTestId("reveal-typed").textContent).toBe("no answer typed");
  });

  it("marks a correct answer green with no echo", () => {
    const reveal = answer("fu");
    expect(reveal.classList.contains("ok")).toBe(true);
    expect(screen.queryByTestId("reveal-typed")).toBeNull();
  });

  it("names what to type in the answer label for the whole item", () => {
    render(<DrillSession title="Kana" items={[item]} onFinish={() => {}} onAbort={() => {}} />);
    const field = screen.getByRole("textbox", { name: "Answer" });
    expect(field.getAttribute("aria-describedby")).toBe("drill-answer-ask");
    expect(screen.getByTestId("answer-ask").textContent).toBe("romaji reading");
  });

  it("uses an item's format example as the placeholder", () => {
    render(
      <DrillSession
        title="Dates"
        items={[{ ...item, ask: "English date with weekday", example: "Monday, March 3, 2025" }]}
        onFinish={() => {}}
        onAbort={() => {}}
      />,
    );
    const field = screen.getByRole("textbox", { name: "Answer" });
    expect(screen.getByTestId("answer-ask").textContent).toBe("English date with weekday");
    expect(field.getAttribute("placeholder")).toBe("e.g. Monday, March 3, 2025");
  });
});
