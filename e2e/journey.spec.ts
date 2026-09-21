import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { validateKanji, validateVocab } from "../src/content/gate";

/**
 * Phase 1 acceptance journey (DEVELOPMENT_PROMPT.md section 6): drill -> grade
 * -> persist -> reload -> review, in one flow over the production bundle.
 * The kana answers come from the fixed basic gojuon table (stable content),
 * so the drill leg grades 100% deterministically; the review leg intentionally
 * misses to prove scheduling persistence without needing kanji readings.
 */

const GOJUON: Record<string, string> = {
  あ: "a",
  い: "i",
  う: "u",
  え: "e",
  お: "o",
  か: "ka",
  き: "ki",
  く: "ku",
  け: "ke",
  こ: "ko",
  さ: "sa",
  し: "shi",
  す: "su",
  せ: "se",
  そ: "so",
  た: "ta",
  ち: "chi",
  つ: "tsu",
  て: "te",
  と: "to",
  な: "na",
  に: "ni",
  ぬ: "nu",
  ね: "ne",
  の: "no",
  は: "ha",
  ひ: "hi",
  ふ: "fu",
  へ: "he",
  ほ: "ho",
  ま: "ma",
  み: "mi",
  む: "mu",
  め: "me",
  も: "mo",
  や: "ya",
  ゆ: "yu",
  よ: "yo",
  ら: "ra",
  り: "ri",
  る: "ru",
  れ: "re",
  ろ: "ro",
  わ: "wa",
  を: "wo",
  ん: "n",
  ア: "a",
  イ: "i",
  ウ: "u",
  エ: "e",
  オ: "o",
  カ: "ka",
  キ: "ki",
  ク: "ku",
  ケ: "ke",
  コ: "ko",
  サ: "sa",
  シ: "shi",
  ス: "su",
  セ: "se",
  ソ: "so",
  タ: "ta",
  チ: "chi",
  ツ: "tsu",
  テ: "te",
  ト: "to",
  ナ: "na",
  ニ: "ni",
  ヌ: "nu",
  ネ: "ne",
  ノ: "no",
  ハ: "ha",
  ヒ: "hi",
  フ: "fu",
  ヘ: "he",
  ホ: "ho",
  マ: "ma",
  ミ: "mi",
  ム: "mu",
  メ: "me",
  モ: "mo",
  ヤ: "ya",
  ユ: "yu",
  ヨ: "yo",
  ラ: "ra",
  リ: "ri",
  ル: "ru",
  レ: "re",
  ロ: "ro",
  ワ: "wa",
  ヲ: "wo",
  ン: "n",
};

async function readQueue(page: Page): Promise<{ due: number; fresh: number }> {
  const text = await page.getByTestId("review").innerText();
  const due = Number(/DUE (\d+)/.exec(text)?.[1] ?? 0);
  const fresh = Number(/NEW (\d+)/.exec(text)?.[1] ?? 0);
  return { due, fresh };
}

// The spec runs the gate's pure validators over fs-read clean files; loaders.ts
// (bundler-side JSON imports) does not load under Node. Same grading logic.
const KANJI_ANSWERS: Record<string, string[]> = Object.fromEntries(
  validateKanji(JSON.parse(readFileSync("data/clean/kanji_n5.json", "utf8")), "n5").items.map(
    (k) => [k.char, k.answers],
  ),
);
const VOCAB_ROMAJI: Record<string, string> = Object.fromEntries(
  validateVocab(JSON.parse(readFileSync("data/clean/vocabulary_n5.json", "utf8")), "n5").items.map(
    (v) => [v.kanji, v.romaji],
  ),
);

test("drill grades, XP persists across reload, and reviewed cards leave the new pool", async ({
  page,
}) => {
  // --- drill leg: 10 kana questions answered from the gojuon table ---
  await page.goto("/learn/drill/kana");
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByTestId("session")).toBeVisible();

  for (let i = 0; i < 10; i++) {
    const prompt = (await page.locator(".prompt-text").innerText()).trim();
    const answer = GOJUON[prompt];
    expect(answer, `gojuon table covers ${prompt}`).toBeDefined();
    await page.getByLabel("answer").fill(answer);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("reveal")).toBeVisible();
    await expect(page.locator(".reveal-verdict")).toHaveText("CORRECT");
    await page.keyboard.press("Enter");
  }

  await expect(page.getByTestId("summary")).toBeVisible();
  await expect(page.getByTestId("summary-score")).toHaveText("100%");

  // --- persist leg: XP awarded and survives a reload ---
  await page.goto("/");
  await expect(page.getByTestId("xp")).toHaveText("XP 70");
  await page.reload();
  await expect(page.getByTestId("xp")).toHaveText("XP 70");

  // --- review leg: new cards enter, then leave the new pool after review ---
  await page.goto("/learn/review");
  const before = await readQueue(page);
  expect(before.fresh).toBe(20);
  await page.getByRole("button", { name: "START REVIEW" }).click();
  await expect(page.getByTestId("session")).toBeVisible();

  for (let i = 0; i < before.fresh; i++) {
    await page.getByLabel("answer").fill("zzz");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("reveal")).toBeVisible();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("summary")).toBeVisible();

  await page.reload();
  await page.goto("/learn/review");
  const after = await readQueue(page);
  // The 20 reviewed cards are scheduled now: they must not reappear as new,
  // and the daily cap leaves no fresh candidates for today.
  expect(after.fresh).toBe(0);
  expect(after.due).toBeLessThanOrEqual(before.fresh);

  // --- progress leg: the review attempts above feed the kanji map ---
  await page.goto("/progress");
  await expect(page.getByTestId("progress")).toBeVisible();
  await expect(page.locator(".kanji-cell")).toHaveCount(80);
  const studied = page.locator(".kanji-cell.learning").first();
  await studied.click();
  await expect(page.getByTestId("inspector")).toContainText(/ATTEMPTS [1-9]/);
  expect(page.url()).toContain("/progress");
  const charBefore = await page.locator(".inspector-char").innerText();
  await page.locator(".kanji-map").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".inspector-char")).not.toHaveText(charBefore);
});
test("filled CTA keeps readable text on hover", async ({ page }) => {
  await page.goto("/");
  const cta = page.getByTestId("routine-cta");
  await expect(cta).toBeVisible();
  await cta.hover();
  const colors = await cta.evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, background: s.backgroundColor };
  });
  // Accent-on-accent made the label invisible; the text must stay the ground
  // color while the fill stays the accent.
  expect(colors.color).not.toBe(colors.background);
  const rgb = (c: string) => (c.match(/\d+/g) ?? []).map(Number);
  const [cr, cg, cb] = rgb(colors.color);
  const [br, bg, bb] = rgb(colors.background);
  const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  expect(
    Math.abs(luminance(cr, cg, cb) - luminance(br, bg, bb)),
    `hover contrast ${colors.color} on ${colors.background}`,
  ).toBeGreaterThan(60);
});

test("grammar lesson resume survives reload", async ({ page }) => {
  await page.goto("/learn");
  const firstLesson = page.locator(".lesson-list a").first();
  await firstLesson.click();
  await expect(page.getByTestId("quiz")).toBeVisible();
  await expect(page.getByTestId("quiz")).toContainText("QUIZ 1/3");

  // Answer the first question so the lesson becomes in-progress at index 1.
  await page.locator(".quiz-choices button").first().click();
  await page.getByRole("button", { name: "NEXT" }).click();
  await expect(page.getByTestId("quiz")).toContainText("QUIZ 2/3");
  await page.reload();
  await expect(page.getByTestId("quiz")).toContainText("QUIZ 2/3");
});

test("numbers drill honors a user-chosen count of 50", async ({ page }) => {
  await page.goto("/learn/drill/numbers");
  await page.getByRole("button", { name: "50", exact: true }).click();
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByTestId("session")).toBeVisible();
  await expect(page.locator(".session-rail")).toContainText("1/50");
});

test("theme choice persists across reload", async ({ page }) => {
  await page.goto("/config");
  await page.getByRole("button", { name: "DARK" }).click();
  await expect(page.locator("html")).toHaveClass(/theme-light/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/theme-light/);
  // restore dark default for other tests in the same context
  await page.goto("/config");
  await page.getByRole("button", { name: "LIGHT" }).click();
});

test("Esc abort confirms and awards nothing", async ({ page }) => {
  await page.goto("/");
  const xpBefore = await page.getByTestId("xp").innerText();
  await page.goto("/learn/drill/kana");
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByTestId("session")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "ABORT" }).click();
  await page.goto("/");
  await expect(page.getByTestId("xp")).toHaveText(xpBefore);
});

test("kanji and vocab drills grade real content correctly", async ({ page }) => {
  await page.goto("/learn/drill/kanji");
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByTestId("session")).toBeVisible();
  for (let i = 0; i < 10; i++) {
    const prompt = (await page.locator(".prompt-text").innerText()).trim();
    const answers = KANJI_ANSWERS[prompt];
    expect(answers, `kanji table covers ${prompt}`).toBeDefined();
    await page.getByLabel("answer").fill(answers[0]);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("reveal")).toBeVisible();
    await expect(page.locator(".reveal-verdict")).toHaveText("CORRECT");
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("summary-score")).toHaveText("100%");

  await page.goto("/learn/drill/vocab");
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByTestId("session")).toBeVisible();
  for (let i = 0; i < 10; i++) {
    const prompt = (await page.locator(".prompt-text").innerText()).trim();
    const romaji = VOCAB_ROMAJI[prompt];
    expect(romaji, `vocab table covers ${prompt}`).toBeDefined();
    await page.getByLabel("answer").fill(romaji);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("reveal")).toBeVisible();
    await expect(page.locator(".reveal-verdict")).toHaveText("CORRECT");
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("summary-score")).toHaveText("100%");
});

test("dates weekday drill grades all seven items correctly", async ({ page }) => {
  const weekdayEn: Record<string, string> = {
    月曜日: "Monday",
    火曜日: "Tuesday",
    水曜日: "Wednesday",
    木曜日: "Thursday",
    金曜日: "Friday",
    土曜日: "Saturday",
    日曜日: "Sunday",
  };
  await page.goto("/learn/drill/dates");
  await page.getByRole("button", { name: "DAYS OF WEEK" }).click();
  await page.getByRole("button", { name: "JAPANESE → ENGLISH" }).click();
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByTestId("session")).toBeVisible();
  for (let i = 0; i < 7; i++) {
    const prompt = (await page.locator(".prompt-text").innerText()).trim();
    const en = weekdayEn[prompt];
    expect(en, `weekday table covers ${prompt}`).toBeDefined();
    await page.getByLabel("answer").fill(en);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("reveal")).toBeVisible();
    await expect(page.locator(".reveal-verdict")).toHaveText("CORRECT");
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("summary-score")).toHaveText("100%");
});
