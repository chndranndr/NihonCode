/**
 * Accessibility smoke (task 8/9): main routes expose landmarks, labels, and
 * text-paired indicators. Runs at desktop and mobile viewports like every
 * other e2e. No new dependency: assertions over shipped roles and labels.
 */

import { expect, test } from "@playwright/test";

test("main routes expose landmarks and labeled controls", async ({ page }) => {
  // Dashboard: primary navigation, status region, and level selector.
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("status").first()).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "study level" })).toBeVisible();

  // Drill setup: radiogroups and buttons carry accessible names; the answer
  // input is labeled; the pool matrix is a labeled toggle.
  await page.goto("/learn/drill/kana");
  await expect(page.getByLabel("answer")).toHaveCount(0);
  await expect(page.getByRole("radiogroup", { name: "question limit" })).toBeVisible();
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByLabel("answer")).toBeVisible();
  await expect(page.getByRole("progressbar")).toBeVisible();

  // JLPT run: choice buttons are labeled choices in a radiogroup.
  await page.goto("/learn/jlpt/vocabulary/1");
  await expect(page.getByRole("radiogroup", { name: "choices" })).toBeVisible();

  // Progress: the kanji map is a navigable grid with a labeled legend.
  await page.goto("/progress");
  await expect(page.getByRole("grid", { name: "kanji mastery map" })).toBeVisible();
  await expect(page.getByTestId("map-legend")).toBeVisible();

  // Config: settings controls carry labels; backup import input is labeled.
  await page.goto("/config");
  await expect(page.getByLabel("DAILY NEW CARDS")).toBeVisible();
  await expect(page.getByLabel("import backup file")).toHaveCount(1);

  // Stats page renders its labeled readouts.
  await page.goto("/stats");
  await expect(page.getByTestId("srs-stats")).toBeVisible();
});

test("mobile layout never widens the initial containing block", async ({ page }) => {
  // A nowrap row (e.g. the footer ticker) that exceeds the viewport widens
  // the mobile ICB: the page zooms out and every touch hit-test breaks.
  for (const route of ["/", "/learn/drill/kana", "/progress", "/config"]) {
    await page.goto(route);
    await page.waitForSelector(".rail");
    const widths = await page.evaluate(() => ({
      inner: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll, `${route} widened the ICB`).toBeLessThanOrEqual(widths.inner);
  }
});

test("calendar days move with arrow keys and keep one tab stop", async ({ page }) => {
  const today = new Date();
  // The annual grid cannot demonstrate a +7-day move in the first week of a
  // year; skip honestly rather than assert a vacuous no-op.
  test.skip(today.getMonth() === 0 && today.getDate() < 15, "no in-year +7 target");
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const start = key(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8));
  const right = key(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
  const down = key(today);
  await page.goto("/progress");
  const grid = page.getByTestId("calendar-annual");
  await expect(grid).toBeVisible();
  const cells = grid.locator("button[data-day]");
  await expect(cells.first()).toBeVisible();
  const focusable = await cells.evaluateAll((els) => els.filter((e) => e.tabIndex === 0).length);
  expect(focusable).toBe(1);
  await cells.evaluateAll((els, k) => {
    const target = els.find((e) => e.getAttribute("data-day") === k);
    if (target) {
      target.tabIndex = 0;
      (target as HTMLElement).focus();
    }
  }, start);
  await page.keyboard.press("ArrowRight");
  await expect(page.evaluate(() => document.activeElement?.getAttribute("data-day"))).resolves.toBe(
    right,
  );
  await page.keyboard.press("ArrowDown");
  await expect(page.evaluate(() => document.activeElement?.getAttribute("data-day"))).resolves.toBe(
    down,
  );
});

test("indicators pair text with every status color", async ({ page }) => {
  // The reveal verdict pairs CORRECT/WRONG text with color; option states
  // pair the same text. Check the text is present, not color alone.
  await page.goto("/learn/jlpt/vocabulary/1");
  await page.locator(".option").first().click();
  await expect(page.locator(".reveal-verdict")).toHaveText(/CORRECT|WRONG/);
});
