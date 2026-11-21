import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { validateJlpt, validateKanji, validateVocab } from "../src/content/gate";
import { conjugateAdjective, conjugateVerb } from "../src/domain/conjugation";

async function stubSpeech(
  page: Page,
  mode: "loading" | "ready" | "missing" | "unsupported" | "error",
) {
  await page.addInitScript((mode) => {
    if (mode === "unsupported") {
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
      return;
    }
    const voice = {
      name: "Japanese",
      lang: "ja-JP",
      voiceURI: "Japanese",
      default: false,
      localService: true,
    };
    const engine = Object.assign(new EventTarget(), {
      getVoices: () => (mode === "ready" || mode === "error" ? [voice] : []),
      cancel: () => {},
      speak: (utterance: {
        text: string;
        lang: string;
        voice: { lang: string };
        onerror: ((event: { error: string }) => void) | null;
      }) => {
        if (mode === "error") {
          utterance.onerror?.({ error: "synthesis-failed" });
          return;
        }
        document.documentElement.dataset.spoken = JSON.stringify({
          text: utterance.text,
          lang: utterance.lang,
          voice: utterance.voice.lang,
        });
      },
    });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: engine });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class {
        constructor(public text: string) {}
      },
    });
  }, mode);
}

async function loadJapaneseVoice(page: Page) {
  await page.evaluate(() => {
    speechSynthesis.getVoices = () => [
      {
        name: "Japanese",
        lang: "ja-JP",
        voiceURI: "Japanese",
        default: false,
        localService: true,
      },
    ];
    speechSynthesis.dispatchEvent(new Event("voiceschanged"));
  });
}

test("Japanese speech loads late and Enter plays kanji without submitting an answer", async ({
  page,
}) => {
  await stubSpeech(page, "loading");
  await page.goto("/learn/review");
  await page.getByRole("button", { name: "START REVIEW" }).click();
  await expect(page.locator(".prompt-text")).toHaveText("一");
  const unavailable = page.getByRole("button", {
    name: "Audio unavailable: prompt",
    exact: true,
  });
  await expect(unavailable).toBeDisabled();
  await expect(unavailable).toContainText("Audio unavailable");
  await loadJapaneseVoice(page);
  const speaker = page.getByRole("button", { name: "Listen: prompt", exact: true });
  await expect(speaker).toBeVisible();
  await expect(speaker).toContainText("Listen");
  await expect(speaker).toBeEnabled();
  const size = await speaker.evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    height: el.getBoundingClientRect().height,
  }));
  expect(size.width).toBeGreaterThanOrEqual(44);
  expect(size.height).toBeGreaterThanOrEqual(44);
  await speaker.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute(
    "data-spoken",
    JSON.stringify({ text: "一", lang: "ja-JP", voice: "ja-JP" }),
  );
  await expect(page.getByTestId("reveal")).toHaveCount(0);
  await page.getByLabel("answer").fill("ichi");
  await page.keyboard.press("Enter");
  await expect(page.locator(".reveal-verdict")).toHaveText("CORRECT");
  await page.keyboard.press("Enter");
  await expect(page.locator(".session-rail")).toContainText("2/20");

  await page.goto("/config");
  await expect(page.getByTestId("tts-status")).toContainText("UNAVAILABLE");
  await loadJapaneseVoice(page);
  await expect(page.getByTestId("tts-status")).toHaveText("JAPANESE VOICE READY");
});

for (const mode of ["unsupported", "missing"] as const) {
  test(`Japanese speech ${mode} explains the cause and leaves review usable`, async ({ page }) => {
    await stubSpeech(page, mode);
    await page.goto("/learn/review");
    await page.getByRole("button", { name: "START REVIEW" }).click();
    const unavailable = page.getByRole("button", {
      name: "Audio unavailable: prompt",
      exact: true,
    });
    await expect(unavailable).toBeDisabled();
    await expect(unavailable).toContainText("Audio unavailable");
    await expect(page.locator(".speaker-status")).toContainText(
      mode === "unsupported" ? "unsupported" : "Add Japanese text-to-speech",
    );
    await expect(page.locator(".speaker")).not.toContainText("N/A");
    await page.getByLabel("answer").fill("ichi");
    await page.keyboard.press("Enter");
    await expect(page.locator(".reveal-verdict")).toHaveText("CORRECT");
  });
}

test("Japanese speech playback errors are visible without blocking review", async ({ page }) => {
  await stubSpeech(page, "error");
  await page.goto("/learn/review");
  await page.getByRole("button", { name: "START REVIEW" }).click();
  const speaker = page.getByRole("button", { name: "Listen: prompt", exact: true });
  await speaker.click();
  await expect(page.locator(".speaker-status")).toContainText("could not play");
  await expect(speaker).toBeEnabled();
  await expect(page.getByTestId("reveal")).toHaveCount(0);
  await page.getByLabel("answer").fill("ichi");
  await page.keyboard.press("Enter");
  await expect(page.locator(".reveal-verdict")).toHaveText("CORRECT");
});

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
  // The queue resolves once the active level's pools load (async loaders);
  // wait for the count line, then read it.
  const review = page.getByTestId("review");
  await expect(review).toContainText(/DUE \d+ · NEW \d+/);
  const text = await review.innerText();
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
  await expect(page.getByTestId("xp-value")).toHaveText("70");
  await page.reload();
  await expect(page.getByTestId("xp-value")).toHaveText("70");

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
  const studied = page.locator(".kanji-cell.learning, .kanji-cell.struggling").first();
  const band = (await studied.getAttribute("class"))!.replace("kanji-cell ", "");
  await studied.click();
  await expect(page.getByTestId("inspector")).toContainText(/ATTEMPTS [1-9]/);
  // Color and inspector text share one banding rule (masteryState).
  await expect(page.getByTestId("inspector")).toContainText(`STATUS ${band.toUpperCase()}`);
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
  await stubSpeech(page, "ready");
  await page.goto("/learn");
  const firstLesson = page.locator(".lesson-list a").first();
  await firstLesson.click();
  await expect(page.getByTestId("quiz")).toBeVisible();
  await expect(page.getByTestId("quiz")).toContainText("QUIZ 1/3");

  const listen = page.getByRole("button", { name: "Listen: example 1", exact: true });
  await expect(listen).toBeVisible();
  await expect(listen).toContainText("Listen");
  const reading = await page.locator(".reading").evaluate((el) => ({
    size: parseFloat(getComputedStyle(el).fontSize),
    lineHeight: parseFloat(getComputedStyle(el).lineHeight),
  }));
  expect(reading.size).toBeGreaterThanOrEqual(17);
  expect(reading.lineHeight / reading.size).toBeGreaterThanOrEqual(1.65);
  const exampleSize = await page
    .locator(".example .jp")
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(exampleSize).toBeGreaterThanOrEqual(24);

  const viewport = page.viewportSize();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const speakerBox = await listen.boundingBox();
  expect(speakerBox?.width).toBeGreaterThanOrEqual(44);
  expect(speakerBox?.height).toBeGreaterThanOrEqual(44);
  if (viewport) await page.setViewportSize(viewport);

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
  const xpBefore = await page.getByTestId("xp-value").innerText();
  await page.goto("/learn/drill/kana");
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByTestId("session")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "RESUME", exact: true }).click();
  await expect(page.getByLabel("Answer", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "ABORT" }).click();
  await page.goto("/");
  await expect(page.getByTestId("xp-value")).toHaveText(xpBefore);
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

// Conjugation drill (PRD 10.9): expected answers come from the same pure
// conjugator the app uses, applied to the gate-validated clean pool.
const CONJ_VOCAB = validateVocab(
  JSON.parse(readFileSync("data/clean/vocabulary_n5.json", "utf8")),
  "n5",
).items.filter((v) => v.pos !== undefined);
const CONJ_BY_KANJI: Record<string, string> = {};
for (const v of CONJ_VOCAB) {
  const conj =
    v.pos === "verb"
      ? conjugateVerb(
          v.kana,
          v.kanji,
          v.conjugationClass as "godan" | "ichidan" | "irregular",
          "masu",
        )
      : conjugateAdjective(v.kana, v.kanji, v.conjugationClass as "i" | "na", "negative");
  if (conj !== null) CONJ_BY_KANJI[v.kanji] = conj.romaji;
}

test("conjugation drill grades verb and adjective forms from curated metadata", async ({
  page,
}) => {
  await page.goto("/learn/drill/conjugation");
  await expect(page.getByTestId("pool-matrix")).toContainText("117");
  await page.getByRole("button", { name: "ICHIDAN" }).click();
  await page.getByRole("button", { name: "IRREGULAR" }).click();
  await expect(page.getByTestId("pool-matrix")).toContainText("80");
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByTestId("session")).toBeVisible();
  for (let i = 0; i < 10; i++) {
    const prompt = (await page.locator(".prompt-text").innerText()).trim();
    const answer = CONJ_BY_KANJI[prompt];
    expect(answer, `conjugation covers ${prompt}`).toBeDefined();
    await page.getByLabel("answer").fill(answer);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("reveal")).toBeVisible();
    await expect(page.locator(".reveal-verdict")).toHaveText("CORRECT");
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("summary-score")).toHaveText("100%");

  await page.goto("/learn/drill/conjugation");
  await page.getByRole("button", { name: "ADJECTIVES" }).click();
  // Default selection is both classes; drop I to grade na-adjectives alone.
  await page.getByRole("button", { name: "I", exact: true }).click();
  await expect(page.getByTestId("pool-matrix")).toContainText("19");
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByTestId("session")).toBeVisible();
  for (let i = 0; i < 10; i++) {
    const prompt = (await page.locator(".prompt-text").innerText()).trim();
    const answer = CONJ_BY_KANJI[prompt];
    expect(answer, `conjugation covers ${prompt}`).toBeDefined();
    await page.getByLabel("answer").fill(answer);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("reveal")).toBeVisible();
    await expect(page.locator(".reveal-verdict")).toHaveText("CORRECT");
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("summary-score")).toHaveText("100%");
});

const N4_VOCAB_ROMAJI: Record<string, string[]> = {};
for (const v of validateVocab(
  JSON.parse(readFileSync("data/clean/vocabulary_n4.json", "utf8")),
  "n4",
).items) {
  (N4_VOCAB_ROMAJI[v.kanji] ??= []).push(v.romaji);
}
test("level switch persists across reload and lazy-loads only the active level", async ({
  page,
}) => {
  const chunks: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/assets/") && url.endsWith(".js")) chunks.push(url.split("/").pop() ?? url);
  });

  await page.goto("/");
  await expect(page.getByTestId("dashboard").getByRole("status").first()).toContainText("JLPT N5");
  await expect(page.getByTestId("routine-cta")).toBeVisible();

  // Initial load: n5 chunks only (kana is shared, no level suffix).
  const loaded = chunks.join(" ");
  expect(loaded).toContain("kanji_n5");
  expect(loaded).toContain("vocabulary_n5");
  expect(loaded).toContain("grammar_n5");
  for (const lvl of ["n4", "n3", "n2", "n1"]) {
    expect(loaded).not.toContain(`kanji_${lvl}`);
    expect(loaded).not.toContain(`vocabulary_${lvl}`);
    expect(loaded).not.toContain(`grammar_${lvl}`);
  }

  // Switch to N4 from the dashboard selector.
  await page.getByRole("button", { name: "N4" }).click();
  await expect(page.getByTestId("dashboard").getByRole("status").first()).toContainText("JLPT N4");
  await page.goto("/learn");
  await expect(page.getByText("KANJI N4")).toBeVisible();
  await expect(page.getByText("GRAMMAR N4")).toBeVisible();
  expect(chunks.join(" ")).toContain("kanji_n4");

  // N4 vocab drill grades real N4 content.
  await page.goto("/learn/drill/vocab");
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByTestId("session")).toBeVisible();
  for (let i = 0; i < 10; i++) {
    const prompt = (await page.locator(".prompt-text").innerText()).trim();
    const romaji = N4_VOCAB_ROMAJI[prompt];
    expect(romaji, `n4 vocab table covers ${prompt}`).toBeDefined();
    await page.getByLabel("answer").fill(romaji[0]);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("reveal")).toBeVisible();
    await expect(page.locator(".reveal-verdict")).toHaveText("CORRECT");
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("summary-score")).toHaveText("100%");

  // Conjugation stays scoped to N5 vocab even at N4 (PRD 10.9), and START
  // must draw from the same N5 pool the preview shows.
  await page.goto("/learn/drill/conjugation");
  await expect(page.getByTestId("pool-matrix")).toContainText("117");
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByTestId("session")).toBeVisible();
  const conjPrompt = (await page.locator(".prompt-text").innerText()).trim();
  await page.getByLabel("answer").fill(CONJ_BY_KANJI[conjPrompt]);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("reveal")).toBeVisible();
  await expect(page.locator(".reveal-verdict")).toHaveText("CORRECT");

  // Back to the dashboard: the choice persists and no n5 level chunk is fetched.
  chunks.length = 0;
  await page.goto("/");
  await expect(page.getByTestId("dashboard").getByRole("status").first()).toContainText("JLPT N4");
  await page.goto("/learn");
  await expect(page.getByText("KANJI N4")).toBeVisible();
  const reloaded = chunks.join(" ");
  expect(reloaded).toContain("kanji_n4");
  expect(reloaded).not.toContain("kanji_n5");
  expect(reloaded).not.toContain("vocabulary_n5");
  expect(reloaded).not.toContain("grammar_n5");
});

// JLPT practice (PRD 10.17): expected answers come from the same gate the
// app uses, over fs-read clean files.
const JLPT_N5_VOCAB = validateJlpt(
  JSON.parse(readFileSync("data/clean/jlpt/n5/vocabulary.json", "utf8")),
  "n5",
  "vocabulary",
).items;

test("JLPT sentences stay readable without shrinking single-kanji prompts", async ({ page }) => {
  await page.goto("/learn/jlpt/grammar");
  await page.getByTestId("set-link").first().click();
  const prompt = page.locator('.prompt-plate p[lang="ja"]');
  await expect(prompt).toContainText("まいにちしんぶん");
  const typography = await prompt.evaluate((el) => {
    const style = getComputedStyle(el);
    return { size: parseFloat(style.fontSize), leading: parseFloat(style.lineHeight) };
  });
  expect(typography.size).toBeGreaterThanOrEqual(20);
  expect(typography.size).toBeLessThanOrEqual(36);
  expect(typography.leading / typography.size).toBeGreaterThanOrEqual(1.6);
  await expect(page.locator(".option").last()).toBeInViewport();

  await page.goto("/learn/review");
  await page.getByRole("button", { name: "START REVIEW" }).click();
  await expect(page.locator(".prompt-text")).toHaveText("一");
  const glyphSize = await page
    .locator(".prompt-text")
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(glyphSize).toBeGreaterThanOrEqual(60);
});

test("JLPT sentences reflow at 320px with enlarged text and remain answerable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/learn/jlpt/grammar");
  await page.getByTestId("set-link").first().click();
  const prompt = page.locator('.prompt-plate p[lang="ja"]');
  await expect(prompt).toContainText("まいにちしんぶん");
  const initialSize = await prompt.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const enlarged = await prompt.evaluate((el) => ({
    size: parseFloat(getComputedStyle(el).fontSize),
    width: el.clientWidth,
    scrollWidth: el.scrollWidth,
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(enlarged.size).toBeGreaterThanOrEqual(initialSize * 1.8);
  expect(enlarged.scrollWidth).toBeLessThanOrEqual(enlarged.width);
  expect(enlarged.documentWidth).toBeLessThanOrEqual(enlarged.viewport);
  await page.locator(".option").nth(1).click();
  await expect(page.locator(".reveal-verdict")).toHaveText("CORRECT");
});

test("JLPT practice grades a keyed set and persists per-set progress", async ({ page }) => {
  await page.goto("/learn/jlpt");
  await expect(page.getByTestId("jlpt")).toBeVisible();
  // All five categories ship (data-recon 2026-09-23): tiles, not locked panels.
  for (const c of ["grammar", "kanji", "vocabulary", "reading", "listening"]) {
    await expect(page.getByTestId(`jlpt-category-${c}`)).toBeVisible();
  }

  // Acceptance: zero remote image references anywhere in a JLPT run. Capture
  // every request the feature makes; only the app's own origin may appear.
  const remote = new Set<string>();
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.origin !== new URL(page.url()).origin) remote.add(req.url());
  });
  const assertNoRemote = () => expect([...remote]).toEqual([]);

  await page.goto("/learn/jlpt/vocabulary");
  await expect(page.getByTestId("jlpt-sets")).toBeVisible();
  await page.getByTestId("set-link").first().click();
  await expect(page.getByTestId("session")).toBeVisible();

  const set = JLPT_N5_VOCAB[0];
  for (const q of set.questions) {
    await expect(page.locator(".jlpt-question")).toContainText(q.prompt);
    await page.locator(".option").nth(q.answerIndex).click();
    await expect(page.locator(".reveal-verdict")).toHaveText("CORRECT");
    await page.getByRole("button", { name: /NEXT|FINISH/ }).click();
  }
  // setFinished renders only after the committed progress write, so this
  // assertion is also the persistence gate before the reload-style goto.
  await expect(page.getByTestId("summary-score")).toHaveText("100%");

  // Per-set progress persists: the set list shows the recorded best score.
  await page.goto("/learn/jlpt/vocabulary");
  await expect(page.getByTestId("set-link").first()).toContainText(
    `BEST ${set.questions.length}/${set.questions.length}`,
  );

  // No request in the whole run may leave the app origin.
  assertNoRemote();

  // Reading/listening are live categories now (data-recon 2026-09-23); their
  // chunks load with the level pool like the other three. The surviving
  // invariant is that no request leaves the app origin (asserted above).
});

// The 10 sets whose source-URL count differs from their question count ship
// set-level audio only (no per-question span evidence). The audio element is
// keyed "set-audio" for those, so advancing must NOT remount it and restart
// playback (data-recon 2026-09-23).
test("fallback listening audio survives question advance without remount", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("dashboard")).toBeVisible();
  await page.getByRole("button", { name: "N2" }).click();
  await expect(page.getByTestId("dashboard").getByRole("status").first()).toContainText("JLPT N2");

  await page.goto("/learn/jlpt/listening");
  await expect(page.getByTestId("jlpt-sets")).toBeVisible();
  await page.getByTestId("set-link").filter({ hasText: "Exercise 11" }).click();
  await expect(page.getByTestId("session")).toBeVisible();

  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="jlpt-audio"]') as HTMLElement & {
      __probe?: number;
    };
    if (el) el.__probe = 1;
  });
  await page.locator(".option").first().click();
  await expect(page.getByTestId("reveal")).toBeVisible();
  await page.getByRole("button", { name: /NEXT/ }).click();
  await expect(page.locator(".option").first()).toBeVisible();

  const sameElement = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="jlpt-audio"]') as
      (HTMLElement & { __probe?: number }) | null;
    return el?.__probe === 1;
  });
  expect(sameElement).toBe(true);
});

test("quiet instrument JLPT reserves media and distinguishes missing sets", async ({ page }) => {
  await page.route(/\.(png|jpe?g|webp|gif)(\?.*)?$/, (route) => route.abort());
  await page.goto("/learn/jlpt/reading/2");
  const media = page.locator(".jlpt-media").first();
  await expect(media).toBeVisible();
  const box = await media.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThan(100);
  expect(await media.evaluate((el) => getComputedStyle(el).aspectRatio)).not.toBe("auto");

  const altTexts = await page
    .locator(".jlpt-media")
    .evaluateAll((els) => els.map((el) => el.getAttribute("alt")));
  expect(altTexts.every((alt) => alt && alt.trim().length > 0)).toBe(true);

  await page.goto("/learn/jlpt/vocabulary/99999");
  await expect(page.getByRole("status")).toContainText("not available");
  await expect(page.getByRole("button", { name: "ALL SETS" })).toBeVisible();

  await page.goto("/learn/jlpt/listening/1");
  const audio = page.getByTestId("jlpt-audio");
  await expect(audio).toBeVisible();
  expect((await audio.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test("SRS statistics page shows level-scoped stats and links practice_core", async ({ page }) => {
  await page.goto("/stats");
  await expect(page.getByTestId("srs-stats")).toBeVisible();
  await expect(page.getByTestId("stat-streak")).toContainText("STREAK");
  await expect(page.getByTestId("stat-due")).toContainText("DUE TODAY");
  await expect(page.getByTestId("stat-learned")).toContainText("LEARNED 0 / TOTAL 818");
  await expect(page.getByTestId("stat-mastery")).toContainText("MASTERY 0%");
  await expect(page.getByTestId("stat-split")).toContainText("NOT STARTED 818");
  await expect(page.getByTestId("stat-kind")).toContainText("KANJI 0/80");

  // practice_core wiring: the kanji map inspector shows linked JLPT questions.
  await page.goto("/progress");
  await expect(page.locator(".kanji-cell").first()).toBeVisible();
  await page.locator(".kanji-cell").first().click();
  await expect(page.getByTestId("inspector")).toBeVisible();
  await expect(page.getByTestId("practice-links")).toBeVisible();
});

test("achievement toast fires once when a drill unlocks FIRST SESSION", async ({ page }) => {
  await page.goto("/learn/drill/kana");
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.getByRole("button", { name: "START" }).click();
  for (let i = 0; i < 10; i++) {
    const prompt = (await page.locator(".prompt-text").innerText()).trim();
    await page.getByLabel("answer").fill(GOJUON[prompt]);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("reveal")).toBeVisible();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("summary")).toBeVisible();

  // The toast host polls every 1.5s; wait out one interval plus margin.
  await expect(page.getByTestId("toasts")).toContainText("ACHIEVEMENT UNLOCKED", {
    timeout: 10_000,
  });
  await expect(page.getByTestId("toasts")).toContainText("FIRST SESSION");

  // Once-only: the unlock is remembered in prefs and never re-fires.
  const seen = await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem("NihonCode-prefs") ?? "{}");
    return prefs.progress?.seenAchievements ?? [];
  });
  expect(seen).toContain("first-session");
  await page.goto("/");
  await page.waitForTimeout(2500);
  await expect(page.getByTestId("toasts")).not.toBeVisible();
});

test("a weak drill summary leads with retrying the misses", async ({ page }) => {
  // 2026-11-21 critique P1: a 30% run read as a celebration, hid the XP, and
  // put RETRY below the answer table.
  await page.goto("/learn/drill/kana");
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.getByRole("button", { name: "START" }).click();
  for (let i = 0; i < 10; i++) {
    const prompt = (await page.locator(".prompt-text").innerText()).trim();
    await page.getByLabel("answer").fill(i < 3 ? GOJUON[prompt] : "zz");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("reveal")).toBeVisible();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("summary-score")).toHaveText("30%");
  await expect(page.locator(".result-score")).not.toHaveClass(/strong/);
  await expect(page.getByTestId("summary-xp")).toHaveText("+15");

  const retry = page.getByRole("button", { name: "RETRY MISSES (7)" });
  await expect(retry).toBeInViewport();
  const verdicts = page.locator("td.row-verdict");
  await expect(verdicts.first()).toHaveText("Missed");
  await expect(verdicts.last()).toHaveText("Correct");

  // The FIRST SESSION toast must not cover the result stats.
  await expect(page.getByTestId("toasts")).toBeVisible({ timeout: 10_000 });
  const [toast, stats] = await Promise.all([
    page.getByTestId("toasts").boundingBox(),
    page.locator(".result-head").boundingBox(),
  ]);
  if (!toast || !stats) throw new Error("toast or stats not laid out");
  const overlaps =
    toast.x < stats.x + stats.width &&
    stats.x < toast.x + toast.width &&
    toast.y < stats.y + stats.height &&
    stats.y < toast.y + toast.height;
  expect(overlaps, "toast covers the result stats").toBe(false);

  await retry.click();
  await expect(page.getByTestId("session")).toContainText("1/7");
});

test("export/import round-trips progress without loss", async ({ page }) => {
  // Seed real progress with a perfect 10-item kana drill (50 XP + bonus 20).
  await page.goto("/learn/drill/kana");
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.getByRole("button", { name: "START" }).click();
  for (let i = 0; i < 10; i++) {
    const prompt = (await page.locator(".prompt-text").innerText()).trim();
    await page.getByLabel("answer").fill(GOJUON[prompt]);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("reveal")).toBeVisible();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("summary-score")).toHaveText("100%");
  await page.goto("/");
  await expect(page.getByTestId("xp-value")).toHaveText("70");

  // Export the backup file.
  await page.goto("/config");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "EXPORT PROGRESS" }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  const backupJson = readFileSync(backupPath!, "utf8");
  expect(JSON.parse(backupJson).app).toBe("nihoncode");

  // Wipe this browser's state. deleteDatabase is blocked by the app's live
  // Dexie connection, so clear every object store through IndexedDB itself
  // and wipe localStorage.
  await page.goto("/config");
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        localStorage.clear();
        const rq = indexedDB.open("nihoncode");
        rq.onerror = () => reject(new Error("open failed"));
        rq.onsuccess = (e) => {
          const idb = (e.target as IDBOpenDBRequest).result;
          const stores = [
            "srsCards",
            "reviewLogs",
            "drillAttempts",
            "grammarState",
            "sessions",
            "jlptProgress",
          ];
          const tx = idb.transaction(stores, "readwrite");
          for (const s of stores) tx.objectStore(s).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(new Error("clear failed"));
        };
      }),
  );
  await page.goto("/");
  await expect(page.getByTestId("xp-value")).toHaveText("0");

  // Import the backup; the handler reloads once the restore commits. Wait
  // for that reload, then read fresh state from the dashboard.
  await page.goto("/config");
  const reload = page.waitForEvent("load");
  await page.locator('input[type="file"]').setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backupJson),
  });
  await reload;
  await page.goto("/");
  await expect(page.getByTestId("xp-value")).toHaveText("70");
});

test("rapid drill submission causes no layout shift", async ({ page }) => {
  await page.goto("/learn/drill/kana");
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByTestId("session")).toBeVisible();

  // The acceptance line (DEVELOPMENT_PROMPT task 8) made measurable: the
  // input-dock <-> reveal swap on rapid submits must not shift the layout.
  await page.evaluate(() => {
    document.documentElement.dataset.cls = "0";
    new PerformanceObserver((list) => {
      let total = Number(document.documentElement.dataset.cls);
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!shift.hadRecentInput && typeof shift.value === "number") {
          total += shift.value;
        }
      }
      document.documentElement.dataset.cls = String(total);
    }).observe({ type: "layout-shift", buffered: true });
  });

  for (let i = 0; i < 10; i++) {
    const prompt = (await page.locator(".prompt-text").innerText()).trim();
    await page.getByLabel("answer").fill(GOJUON[prompt]);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("reveal")).toBeVisible();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("summary")).toBeVisible();

  const cls = await page.evaluate(() => Number(document.documentElement.dataset.cls ?? "0"));
  expect(cls).toBeLessThan(0.05);
});
