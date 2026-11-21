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
  const homeLevel = page.getByRole("group", { name: "study level" });
  await expect(homeLevel).toBeVisible();
  await expect(homeLevel.getByRole("button", { name: "N5", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByText(
      "Choose the JLPT level you’re studying; it filters the practice pool and recommendations.",
      { exact: true },
    ),
  ).toBeVisible();
  const xpReadout = page.getByTestId("xp");
  await expect(xpReadout.locator('[aria-hidden="true"]')).toHaveText("XP");
  await expect(xpReadout.locator(".sr-only")).toHaveText("Experience points");
  await expect(page.getByTestId("dashboard").getByRole("status").first()).toContainText("JLPT N5");

  // Drill setup: groups and buttons carry accessible names; the answer
  // input is labeled; the pool matrix is a labeled toggle.
  await page.goto("/learn/drill/kana");
  await expect(page.getByLabel("answer")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "question limit" })).toBeVisible();
  const questionLimit = page.getByRole("group", { name: "question limit" });
  const tenQuestions = questionLimit.getByRole("button", { name: "10", exact: true });
  await tenQuestions.click();
  await expect(tenQuestions).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "START" }).click();
  const answer = page.getByLabel("Answer", { exact: true });
  await expect(answer).toBeVisible();
  await expect(page.locator('label[for="drill-answer"]')).toHaveText("Answer");
  await expect(answer).toHaveAccessibleDescription("romaji reading");
  const answerHeight = await answer.evaluate((el) => el.getBoundingClientRect().height);
  expect(answerHeight).toBeGreaterThanOrEqual(48);
  const promptSize = await page
    .locator(".prompt-text")
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(promptSize).toBeGreaterThanOrEqual(64);
  expect(promptSize).toBeLessThanOrEqual(104);
  await expect(page.locator(".prompt-plate .speaker")).toBeVisible();
  await expect(page.getByRole("progressbar")).toBeVisible();

  await page.goto("/learn/jlpt");
  const categories = page.getByRole("group", { name: "JLPT categories" });
  await expect(categories).toBeVisible();
  const grammarCategory = categories.getByTestId("jlpt-category-grammar");
  await expect(grammarCategory).not.toHaveAttribute("aria-pressed");
  await grammarCategory.click();
  await expect(page).toHaveURL(/\/learn\/jlpt\/grammar$/);

  // JLPT run: each question is a labeled radio group (fieldset + legend).
  await page.goto("/learn/jlpt/vocabulary/1");
  const question = page.getByRole("group", { name: "QUESTION 1", exact: true });
  await expect(question).toBeVisible();
  const choice = question.getByRole("radio").first();
  await question.locator(".option").first().click();
  await expect(choice).toBeChecked();

  // Progress: the kanji map is a navigable grid with a labeled legend.
  await page.goto("/progress");
  await expect(page.getByRole("grid", { name: "kanji mastery map" })).toBeVisible();
  await expect(page.getByTestId("map-legend")).toBeVisible();

  // Config: settings controls carry labels; backup import input is labeled.
  await page.goto("/config");
  await expect(page.getByLabel("DAILY NEW CARDS")).toBeVisible();
  await expect(page.getByLabel("Skip learning steps")).toHaveCSS("cursor", "pointer");
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

test("secondary controls meet touch target sizes", async ({ page, isMobile }) => {
  // 2026-11-21 audit: text links, back links, and the config checkbox row
  // were under 24px; calendar days sat on a 20px pitch (WCAG 2.5.8).
  const minHeight = async (selector: string) =>
    page
      .locator(selector)
      .evaluateAll((els) => Math.min(...els.map((el) => el.getBoundingClientRect().height)));
  await page.goto("/");
  await page.waitForSelector(".text-link");
  expect(await minHeight(".text-link"), "home text links").toBeGreaterThanOrEqual(44);
  await page.goto("/learn/drill/kana");
  await page.waitForSelector(".back");
  expect(await minHeight(".back"), "drill back link").toBeGreaterThanOrEqual(44);
  await page.goto("/config");
  await page.waitForSelector(".checks");
  expect(await minHeight(".checks"), "config checkbox row").toBeGreaterThanOrEqual(44);

  if (!isMobile) return;
  await page.goto("/progress");
  const grid = page.getByTestId("calendar-annual");
  await expect(grid).toBeVisible();
  const touch = await grid.evaluate((el) => {
    const cells = Array.from(el.querySelectorAll<HTMLElement>("[data-day]")).slice(0, 2);
    const [a, b] = cells.map((c) => c.getBoundingClientRect());
    const hit = getComputedStyle(cells[0], "::before");
    const scroller = el.closest<HTMLElement>(".heat-scroll");
    return {
      pitch: b.top - a.top,
      hitHeight: parseFloat(hit.height),
      overflowing: !!scroller && scroller.scrollWidth > scroller.clientWidth,
      scrollLeft: scroller?.scrollLeft ?? 0,
    };
  });
  expect(touch.pitch, "calendar day pitch on touch").toBeGreaterThanOrEqual(24);
  expect(touch.hitHeight, "calendar day hit area on touch").toBeGreaterThanOrEqual(24);
  if (touch.overflowing) {
    expect(touch.scrollLeft, "annual calendar opens on today, not January").toBeGreaterThan(0);
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

test("mobile calendar date picker is bounded and selects the inspected day", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "native date selection is mobile-specific");
  const localToday = new Date();
  const key = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const today = key(localToday);
  const tomorrow = key(
    new Date(localToday.getFullYear(), localToday.getMonth(), localToday.getDate() + 1),
  );
  await page.goto("/progress");

  const picker = page.getByLabel("Select a date");
  await expect(picker).toBeVisible();
  await expect(picker).toHaveAttribute("min", `${localToday.getFullYear()}-01-01`);
  await expect(picker).toHaveAttribute("max", today);
  await picker.fill(today);

  await expect(page.locator(".day-detail")).toContainText(`${today} ·`);
  await expect(page.locator(`[data-day="${today}"]`)).toHaveAttribute("aria-pressed", "true");

  await picker.fill(tomorrow);
  await expect(page.locator(".day-detail")).toHaveText(
    "Choose a valid date in the displayed range.",
  );
  await expect(picker).toHaveValue(today);
  await expect(page.locator(`[data-day="${today}"]`)).toHaveAttribute("aria-pressed", "true");
  await picker.fill("");
  await expect(page.locator(".day-detail")).toHaveText("Select a day to see its activity.");
  await expect(page.locator(`[data-day="${today}"]`)).toHaveAttribute("aria-pressed", "false");
});

test("global navigation requires exact Alt+1 through Alt+4 shortcuts", async ({ page }) => {
  const routes = ["/", "/progress", "/learn", "/config"] as const;
  await page.goto("/config");
  const legend = page.locator(".key-legend");
  expect(await legend.getAttribute("aria-hidden")).toBeNull();
  if (test.info().project.name === "desktop") await expect(legend).toContainText("Alt+1");

  const configUrl = new URL("/config", page.url()).href;
  for (let key = 1; key <= 4; key += 1) {
    await page.keyboard.press(String(key));
    await expect(page).toHaveURL(configUrl);
  }
  for (const [index, route] of routes.entries()) {
    await page.goto("/config");
    await page.keyboard.press(`Alt+${index + 1}`);
    await expect(page).toHaveURL(new URL(route, page.url()).href);
  }

  await page.goto("/config");
  await page.keyboard.press("Control+Alt+2");
  await expect(page).toHaveURL(configUrl);
  await page.keyboard.press("Alt+Shift+3");
  await expect(page).toHaveURL(configUrl);

  await page.goto("/learn/drill/kana");
  await page.getByRole("button", { name: "START" }).click();
  const answer = page.getByLabel("answer");
  await answer.focus();
  const drillUrl = page.url();
  await page.keyboard.press("Alt+2");
  await expect(page).toHaveURL(drillUrl);
  await expect(answer).toBeFocused();
});

test("keyboard focus receives a visible focus outline", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.locator(".skip");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toHaveCSS("outline-style", "solid");
  await expect(skipLink).toHaveCSS("outline-width", "2px");
});

test("indicators pair text with every status color", async ({ page }) => {
  // The per-question verdict pairs CORRECT/WRONG/NOT ANSWERED text with
  // color. Check the text is present, not color alone.
  await page.goto("/learn/jlpt/vocabulary/1");
  await page.locator(".option").first().click();
  await page.getByRole("button", { name: "CHECK ANSWERS" }).click();
  await page.getByRole("button", { name: "CHECK ANYWAY" }).click();
  await expect(page.locator(".reveal-verdict").first()).toHaveText(/CORRECT|WRONG|NOT ANSWERED/);
});

test("document title follows each route on direct load and client navigation", async ({ page }) => {
  const routes = [
    ["/", "Home · NihonCode"],
    ["/progress", "Progress · NihonCode"],
    ["/learn", "Learn · NihonCode"],
    ["/learn/drill/kana", "Drill · NihonCode"],
    ["/learn/grammar/1", "Grammar lesson · NihonCode"],
    ["/learn/jlpt", "JLPT practice · NihonCode"],
    ["/learn/jlpt/vocabulary", "JLPT practice · NihonCode"],
    ["/learn/jlpt/vocabulary/1", "JLPT practice · NihonCode"],
    ["/stats", "SRS statistics · NihonCode"],
    ["/learn/review", "Review · NihonCode"],
    ["/config", "Config · NihonCode"],
    ["/missing-route", "Home · NihonCode"],
  ] as const;

  for (const [path, title] of routes) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
  }

  await page.goto("/");
  await page.getByRole("link", { name: "Progress" }).click();
  await expect(page).toHaveTitle("Progress · NihonCode");
  await page.getByRole("link", { name: "Learn" }).click();
  await expect(page).toHaveTitle("Learn · NihonCode");
});

test("accent text meets WCAG AA in both themes and every accent", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "contrast matrix runs once on desktop");
  await page.addInitScript(() => {
    localStorage.setItem("NihonCode-theme", "dark");
    localStorage.setItem("NihonCode-theme-accent", "amber");
  });
  await page.goto("/config");

  for (const theme of ["dark", "light"] as const) {
    if (theme === "light") await page.getByRole("button", { name: "LIGHT", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(new RegExp(`theme-${theme}`));

    for (const accent of ["amber", "green", "blue", "orange", "red"] as const) {
      const accentGroup = page.getByRole("group", { name: "accent color" });
      await accentGroup.getByRole("button", { name: accent.toUpperCase(), exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("data-accent", accent);
      await page.locator('.rail nav a[href="/"]').click();

      await expect(page.locator(".rail nav a.active")).toContainText("Home");
      await page.locator('.rail nav a[href="/progress"]').hover();
      const skipLink = page.locator(".skip");
      await skipLink.focus();
      await skipLink.hover();
      const ratios = await page.evaluate(() => {
        function luminance(color: string): number {
          const channels = color.match(/\d+/g);
          if (!channels || channels.length < 3) throw new Error(`Unexpected color: ${color}`);
          const linear = (channel: string | undefined): number => {
            if (channel === undefined) throw new Error(`Unexpected color: ${color}`);
            const value = Number(channel) / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          };
          return (
            0.2126 * linear(channels[0]) +
            0.7152 * linear(channels[1]) +
            0.0722 * linear(channels[2])
          );
        }
        function ratio(element: Element | null): number {
          if (!element) throw new Error("Expected contrast target");
          const foreground = getComputedStyle(element).color;
          let background: string | null = null;
          for (
            let ancestor: Element | null = element;
            ancestor;
            ancestor = ancestor.parentElement
          ) {
            const color = getComputedStyle(ancestor).backgroundColor;
            if (color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
              background = color;
              break;
            }
          }
          if (!background) throw new Error("Expected painted background");
          const [first, second] = [luminance(foreground), luminance(background)].sort(
            (a, b) => b - a,
          );
          return (first + 0.05) / (second + 0.05);
        }
        return {
          activeNav: ratio(document.querySelector(".rail nav a.active")),
          hoveredNav: ratio(document.querySelector('.rail nav a[href="/progress"]')),
          selectedControl: ratio(
            document.querySelector('[aria-label="study level"] button[aria-pressed="true"]'),
          ),
          skipLink: ratio(document.querySelector(".skip")),
        };
      });
      expect(ratios.activeNav, `${theme}/${accent} active nav`).toBeGreaterThanOrEqual(4.5);
      expect(ratios.hoveredNav, `${theme}/${accent} hovered nav`).toBeGreaterThanOrEqual(4.5);
      expect(ratios.selectedControl, `${theme}/${accent} selected control`).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        ratios.skipLink,
        `${theme}/${accent} focused/hovered skip link`,
      ).toBeGreaterThanOrEqual(4.5);
      await page.getByRole("link", { name: "Config" }).click();
    }
  }
});

test("quiet instrument foundation uses approved tokens and readable type", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("routine-cta")).toBeVisible();
  const foundation = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const title = getComputedStyle(document.querySelector("h1")!);
    const cta = getComputedStyle(document.querySelector('[data-testid="routine-cta"]')!);
    return {
      ground: root.getPropertyValue("--ground").trim(),
      panel: root.getPropertyValue("--panel").trim(),
      panelSoft: root.getPropertyValue("--panel-soft").trim(),
      onAccent: root.getPropertyValue("--on-accent").trim(),
      bodySize: body.fontSize,
      bodyFamily: body.fontFamily,
      titleSize: title.fontSize,
      expectedTitleSize: `${Math.min(40, Math.max(30, window.innerWidth * 0.03))}px`,
      ctaHeight: cta.height,
      ctaColor: cta.color,
    };
  });
  expect(foundation.ground).toBe("#141615");
  expect(foundation.panel).toBe("#1d201e");
  expect(foundation.panelSoft).toBe("#181b19");
  expect(foundation.onAccent).toBe("#1b1c19");
  expect(foundation.bodySize).toBe("15px");
  expect(foundation.bodyFamily).toContain("Avenir Next");
  expect(foundation.titleSize).toBe(foundation.expectedTitleSize);
  expect(parseFloat(foundation.ctaHeight)).toBeGreaterThanOrEqual(48);
  expect(foundation.ctaColor).toBe("rgb(27, 28, 25)");

  await page.goto("/config");
  await page.getByRole("button", { name: "LIGHT", exact: true }).click();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f5f2ea");
  const light = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      ground: root.getPropertyValue("--ground").trim(),
      panel: root.getPropertyValue("--panel").trim(),
      onAccent: root.getPropertyValue("--on-accent").trim(),
    };
  });
  expect(light).toEqual({ ground: "#f5f2ea", panel: "#fffdf7", onAccent: "#fffdf7" });
});

test("quiet instrument route failure keeps the shell and reloads for recovery", async ({
  page,
}) => {
  await page.route(/\/assets\/ConfigPage-.*\.js$/, (route) => route.abort());
  await page.goto("/config");
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("This view could not be loaded");
  await page.unroute(/\/assets\/ConfigPage-.*\.js$/);
  await page.getByRole("button", { name: "RELOAD VIEW" }).click();
  await expect(page.getByTestId("config")).toBeVisible();
});

test("quiet instrument shell keeps destinations, focus, and motion usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".ticker")).toHaveCount(0);
  await expect(page.locator(".topbar")).toContainText("JLPT N5");
  await expect(page).toHaveTitle("Home · NihonCode");
  await page.locator(".skip").focus();
  await page.keyboard.press("Enter");
  const focus = await page.locator("#main").evaluate((el) => ({
    focused: document.activeElement === el,
    outline: getComputedStyle(el).outlineStyle,
  }));
  expect(focus.focused).toBe(true);
  expect(focus.outline).not.toBe("none");

  await page.emulateMedia({ reducedMotion: "reduce" });
  const duration = await page
    .locator('[data-testid="routine-cta"]')
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(duration.split(",").every((value) => parseFloat(value) === 0)).toBe(true);
});

test("quiet instrument mobile rail does not cover study content", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/learn/drill/kana");
  await page.getByRole("button", { name: "START", exact: true }).click();
  const layout = await page.evaluate(() => {
    const rail = document.querySelector(".rail")!.getBoundingClientRect();
    const workspace = getComputedStyle(document.querySelector(".workspace")!);
    return {
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      railBottom: rail.bottom,
      railHeight: rail.height,
      workspacePadding: parseFloat(workspace.paddingBottom),
      bodySize: getComputedStyle(document.body).fontSize,
    };
  });
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport);
  expect(layout.workspacePadding).toBeGreaterThanOrEqual(layout.railHeight);
  expect(layout.bodySize).toBe("15px");
  for (const link of await page.locator(".rail nav a").all()) {
    const box = await link.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test("quiet instrument home and learn keep real choices without decorative navigation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".fuji")).toHaveCount(0);
  await expect(page.locator(".arrow")).toHaveCount(0);
  await expect(page.locator(".jlpt-strip")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "study level" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View full activity", exact: true })).toBeVisible();
  await expect(page.locator(".practice-list a")).toHaveCount(6);

  await page.goto("/learn");
  await expect(page.locator(".practice-list a")).toHaveCount(6);
  await expect(page.getByRole("link", { name: "OPEN REVIEW QUEUE" })).not.toHaveClass(/primary/);
  await expect(page.getByRole("link", { name: "BROWSE JLPT SETS" })).not.toHaveClass(/primary/);
});

test("quiet instrument config keeps real settings and honest About views", async ({ page }) => {
  await page.goto("/config");
  const views = page.getByRole("group", { name: "config views" });
  await expect(views.getByRole("button", { name: "SETTINGS" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await views.getByRole("button", { name: "ABOUT" }).click();
  await expect(page.getByTestId("sources")).toBeVisible();
  await expect(page.locator(".about-readout")).not.toContainText("—");
  await expect(page.locator(".about-readout .panel")).toHaveCount(0);
  await views.getByRole("button", { name: "SETTINGS" }).click();
  await expect(page.getByLabel("DAILY NEW CARDS")).toBeVisible();
  await expect(page.getByRole("button", { name: "EXPORT PROGRESS" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "IMPORT PROGRESS" })).toBeEnabled();
});

test("quiet instrument progress and statistics keep real readable readouts", async ({ page }) => {
  await page.goto("/progress");
  await expect(page.getByTestId("calendar-annual")).toBeVisible();
  await expect(page.getByTestId("map-legend")).toBeVisible();
  await expect(page.getByTestId("coverage")).toContainText("0%");
  const smallText = await page
    .locator(".micro-label, .label, .map-legend")
    .evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
  for (const size of smallText) expect(size).toBeGreaterThanOrEqual(12);

  await page.goto("/stats");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("SRS statistics.");
  await expect(page.getByTestId("stat-mastery")).toContainText("0%");
  await expect(page.getByTestId("stat-kind")).toContainText("0 / 80");
});

test("quiet instrument JLPT load failure retries the actual content", async ({ page }) => {
  const readingRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/assets\/reading-[^/]+\.js$/.test(request.url())) readingRequests.push(request.url());
  });
  await page.route(/\/assets\/reading-[^/]+\.js$/, (route) => route.abort());
  await page.goto("/learn/jlpt");
  await expect(page.getByRole("alert")).toContainText("JLPT practice could not be loaded");
  await page.unroute(/\/assets\/reading-[^/]+\.js$/);
  await page.getByRole("button", { name: "RETRY", exact: true }).click();
  await expect.poll(() => readingRequests.length).toBe(2);
  await expect(page.getByTestId("jlpt")).toBeVisible();
});

test("quiet instrument setup preserves pool controls and actual start counts", async ({ page }) => {
  await page.goto("/learn/drill/kana");
  await expect(page.getByRole("group", { name: "question limit" })).toBeVisible();
  await expect(page.locator(".start-dock .primary")).toBeInViewport();
  await expect(page.locator(".pool-matrix")).toBeVisible();
  await page.getByRole("button", { name: "20", exact: true }).click();
  await expect(page.locator(".start-dock .primary")).toContainText("START");
  await expect(page.locator(".start-dock")).toContainText("20 questions");
  const controls = await page.locator("button, input, select").evaluateAll((elements) =>
    elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && !element.hasAttribute("disabled");
      })
      .map((element) => ({
        name: element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName,
        height: element.getBoundingClientRect().height,
      })),
  );
  for (const control of controls) {
    expect(control.height, control.name).toBeGreaterThanOrEqual(44);
  }
});

test("page headings carry no eyebrow above them", async ({ page }) => {
  const routes = [
    "/",
    "/progress",
    "/learn",
    "/learn/drill/kana",
    "/learn/jlpt",
    "/learn/jlpt/grammar",
    "/learn/review",
    "/stats",
    "/config",
    "/learn/grammar/1",
  ];
  await page.goto("/");
  await expect(page.getByTestId("topbar-level")).toHaveText("JLPT N5");
  for (const route of routes) {
    await page.goto(route);
    const h1 = page.locator("main h1").first();
    await expect(h1).toBeVisible();
    const eyebrow = await h1.evaluate(
      (el) => el.previousElementSibling?.matches("p.label") ?? false,
    );
    expect(eyebrow, `${route} has an eyebrow above its h1`).toBe(false);
  }
});

test("control edges meet 3:1 in both themes", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "contrast matrix runs once on desktop");
  await page.addInitScript(() => {
    localStorage.setItem("NihonCode-theme", "dark");
  });

  const measure = (selector: string) =>
    page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) throw new Error(`Missing ${sel}`);
      const channels = (color: string): number[] => {
        const parts = color.match(/[\d.]+/g);
        if (!parts || parts.length < 3) throw new Error(`Unexpected color: ${color}`);
        return parts.slice(0, 3).map(Number);
      };
      const luminance = (color: string): number => {
        const [r, g, b] = channels(color).map((channel) => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
      };
      let background: string | null = null;
      for (
        let ancestor: Element | null = element.parentElement;
        ancestor;
        ancestor = ancestor.parentElement
      ) {
        const color = getComputedStyle(ancestor).backgroundColor;
        if (color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
          background = color;
          break;
        }
      }
      if (!background) throw new Error("Expected painted background");
      const [first, second] = [
        luminance(getComputedStyle(element).borderTopColor),
        luminance(background),
      ].sort((a, b) => b - a);
      return ((first ?? 0) + 0.05) / ((second ?? 0) + 0.05);
    }, selector);

  for (const theme of ["dark", "light"] as const) {
    await page.goto("/config");
    if (theme === "light") await page.getByRole("button", { name: "LIGHT", exact: true }).click();
    else await page.getByRole("button", { name: "DARK", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(new RegExp(`theme-${theme}`));

    await page.goto("/learn/drill/kana");
    await page.waitForTimeout(300);
    expect(await measure('input[type="search"]'), `${theme} pool search`).toBeGreaterThanOrEqual(3);

    await page.goto("/");
    await page.locator(".heat-cell").first().waitFor();
    await page.waitForTimeout(300);
    expect(
      await measure(".heat-cell:not(.padding):not(.future)"),
      `${theme} heat cell`,
    ).toBeGreaterThanOrEqual(3);
  }
});
