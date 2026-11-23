import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ActivityCalendar } from "./ActivityCalendar";

afterEach(cleanup);

describe("ActivityCalendar date picker", () => {
  it("disables future-only ranges and ignores a selection from the previous range", () => {
    const { rerender } = render(
      <ActivityCalendar
        rows={[]}
        startKey="2027-01-01"
        endKey="2027-12-31"
        todayKey="2026-10-28"
      />,
    );
    const input = screen.getByLabelText("Select a date");
    expect(input instanceof HTMLInputElement).toBe(true);
    if (!(input instanceof HTMLInputElement)) throw new Error("date picker is not an input");
    expect(input.disabled).toBe(true);

    rerender(
      <ActivityCalendar
        rows={[]}
        startKey="2026-01-01"
        endKey="2026-12-31"
        todayKey="2026-10-28"
      />,
    );
    fireEvent.change(input, { target: { value: "2026-10-01" } });
    expect(screen.getByRole("status").textContent).toContain("2026-10-01 · 0 sessions");
    expect(input.value).toBe("2026-10-01");

    rerender(
      <ActivityCalendar
        rows={[]}
        startKey="2025-01-01"
        endKey="2025-12-31"
        todayKey="2026-10-28"
      />,
    );
    expect(input.value).toBe("");
    expect(screen.getByRole("status").textContent).toBe("Select a day to see its activity.");
  });
  it("retains the selected date when the native date input rejects a value", () => {
    render(
      <ActivityCalendar
        rows={[]}
        startKey="2026-01-01"
        endKey="2026-12-31"
        todayKey="2026-10-28"
      />,
    );
    const input = screen.getByLabelText("Select a date");
    if (!(input instanceof HTMLInputElement)) throw new Error("date picker is not an input");
    fireEvent.change(input, { target: { value: "2026-10-01" } });

    Object.defineProperty(input, "validity", { configurable: true, value: { badInput: true } });
    fireEvent.change(input, { target: { value: "" } });

    expect(input.value).toBe("2026-10-01");
    expect(screen.getByRole("status").textContent).toBe(
      "Choose a valid date in the displayed range.",
    );
    expect(screen.getByRole("button", { name: /2026-10-01:/ }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });
});

describe("ActivityCalendar horizontal scroll", () => {
  it("opens an overflowing calendar on today's week instead of January", () => {
    const proto = HTMLElement.prototype;
    const sw = Object.getOwnPropertyDescriptor(proto, "scrollWidth");
    const cw = Object.getOwnPropertyDescriptor(proto, "clientWidth");
    const rect = proto.getBoundingClientRect;
    Object.defineProperty(proto, "scrollWidth", { configurable: true, get: () => 1200 });
    Object.defineProperty(proto, "clientWidth", { configurable: true, get: () => 300 });
    proto.getBoundingClientRect = function (this: HTMLElement) {
      const left = this.dataset.day === "2026-10-28" ? 900 : 0;
      return {
        left,
        right: left,
        top: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: left,
        y: 0,
      } as DOMRect;
    };
    try {
      render(
        <ActivityCalendar
          rows={[]}
          startKey="2026-01-01"
          endKey="2026-12-31"
          todayKey="2026-10-28"
        />,
      );
      const scroller = screen.getByRole("group", { name: "Study activity calendar" });
      expect(scroller.scrollLeft).toBe(750);
    } finally {
      if (sw) Object.defineProperty(proto, "scrollWidth", sw);
      else delete (proto as { scrollWidth?: number }).scrollWidth;
      if (cw) Object.defineProperty(proto, "clientWidth", cw);
      else delete (proto as { clientWidth?: number }).clientWidth;
      proto.getBoundingClientRect = rect;
    }
  });

  it("pluralises the active-day count", () => {
    render(
      <ActivityCalendar
        rows={[{ id: "a", category: "drill", date: "2026-10-01", ts: 0 }]}
        startKey="2026-01-01"
        endKey="2026-12-31"
        todayKey="2026-10-28"
      />,
    );
    expect(screen.getByText("1 active day")).toBeTruthy();
  });
});
