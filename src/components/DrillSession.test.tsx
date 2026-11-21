import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DrillSession, type SessionItem } from "./DrillSession";

afterEach(cleanup);

const item: SessionItem = {
  id: "kana:hiragana:ふ",
  prompt: "ふ",
  accepted: ["fu", "hu"],
  reveal: { scripts: ["ふ"], meaning: "fu", group: "hiragana" },
  speakText: "ふ",
};

function answer(text: string) {
  render(<DrillSession title="Kana" items={[item]} onFinish={() => {}} onAbort={() => {}} />);
  fireEvent.change(screen.getByLabelText("Answer"), { target: { value: text } });
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
});
