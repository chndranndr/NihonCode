import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { ACCENTS } from "../storage/prefs";
import {
  ACCENT_KEY,
  THEME_KEY,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  ThemeProvider,
  useTheme,
} from "./theme";

const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const bootstrap = /<script>([\s\S]*?)<\/script>/.exec(indexHtml)?.[1] ?? "";

/** Run index.html's inline pre-paint script against the current document. */
function runBootstrap(): void {
  new Function(bootstrap)();
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  const root = document.documentElement;
  root.className = "";
  delete root.dataset.accent;
});

describe("index.html pre-paint theme bootstrap", () => {
  it("names the same storage keys, accents and theme colours as theme.tsx", () => {
    expect(bootstrap).toContain(`"${THEME_KEY}"`);
    expect(bootstrap).toContain(`"${ACCENT_KEY}"`);
    expect(bootstrap).toContain(JSON.stringify(ACCENTS).replace(/,/g, ", "));
    expect(bootstrap).toContain(`"${THEME_COLOR_LIGHT}"`);
    expect(bootstrap).toContain(`"${THEME_COLOR_DARK}"`);
  });

  it("applies a stored light theme and accent before React mounts", () => {
    localStorage.setItem(THEME_KEY, "light");
    localStorage.setItem(ACCENT_KEY, "blue");
    runBootstrap();
    const root = document.documentElement;
    expect(root.classList.contains("theme-light")).toBe(true);
    expect(root.dataset.accent).toBe("blue");
    expect(root.classList.contains("theme-switching")).toBe(true);
  });

  it("falls back to dark and amber for missing or unknown values", () => {
    localStorage.setItem(ACCENT_KEY, "purple");
    runBootstrap();
    const root = document.documentElement;
    expect(root.classList.contains("theme-dark")).toBe(true);
    expect(root.dataset.accent).toBe("amber");
  });
});

describe("ThemeProvider transition hold", () => {
  function Toggle() {
    const { setTheme } = useTheme();
    return (
      <button type="button" onClick={() => setTheme("light")}>
        light
      </button>
    );
  }

  it("holds control transitions during a theme switch, then releases them", async () => {
    const { getByRole } = render(
      <ThemeProvider>
        <Toggle />
      </ThemeProvider>,
    );
    const root = document.documentElement;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(root.classList.contains("theme-switching")).toBe(false);

    act(() => getByRole("button").click());
    expect(root.classList.contains("theme-light")).toBe(true);
    expect(root.classList.contains("theme-switching")).toBe(true);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(root.classList.contains("theme-switching")).toBe(false);
  });

  it("releases the hold even when animation frames never run", async () => {
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = () => 0;
    try {
      render(
        <ThemeProvider>
          <Toggle />
        </ThemeProvider>,
      );
      const root = document.documentElement;
      expect(root.classList.contains("theme-switching")).toBe(true);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 150));
      });
      expect(root.classList.contains("theme-switching")).toBe(false);
    } finally {
      window.requestAnimationFrame = raf;
    }
  });
});
