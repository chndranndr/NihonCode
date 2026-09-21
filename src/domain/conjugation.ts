/**
 * Pure conjugator for the conjugation drill (PRD §10.9). Classes come from
 * curated per-entry metadata (gate `pos`/`conjugationClass`), never inferred
 * from category buckets (PRD §18). Every result carries kana, kanji display,
 * and romaji; romaji is derived by the shared transliterator so grading and
 * display agree.
 */

import { kanaToRomaji } from "./romaji";

export type VerbClass = "godan" | "ichidan" | "irregular";
export type AdjClass = "i" | "na";

export const VERB_FORMS = ["masu", "masen", "mashita", "te", "nai", "ta"] as const;
export const ADJ_FORMS = ["negative", "past", "adverb"] as const;
export type VerbForm = (typeof VERB_FORMS)[number];
export type AdjForm = (typeof ADJ_FORMS)[number];

export const VERB_FORM_LABELS: Record<VerbForm, string> = {
  masu: "polite present (〜ます)",
  masen: "polite negative (〜ません)",
  mashita: "polite past (〜ました)",
  te: "te form (〜て)",
  nai: "plain negative (〜ない)",
  ta: "plain past (〜た)",
};

export const ADJ_FORM_LABELS: Record<AdjForm, string> = {
  negative: "negative (〜くない / 〜じゃない)",
  past: "past (〜かった / 〜だった)",
  adverb: "adverb (〜く / 〜に)",
};

export interface Conjugated {
  kana: string;
  /** Kanji display: the entry's display stem plus the inflected ending. */
  kanji: string;
  romaji: string;
}

// godan u-row -> a-row / i-row tail swaps.
const GODAN_A: Record<string, string> = {
  う: "わ",
  く: "か",
  ぐ: "が",
  す: "さ",
  つ: "た",
  ぬ: "な",
  ぶ: "ば",
  む: "ま",
  る: "ら",
};
const GODAN_I: Record<string, string> = {
  う: "い",
  く: "き",
  ぐ: "ぎ",
  す: "し",
  つ: "ち",
  ぬ: "に",
  ぶ: "び",
  む: "み",
  る: "り",
};
// te/ta sound changes keyed by the final kana.
const GODAN_TE: Record<string, string> = {
  う: "って",
  つ: "って",
  る: "って",
  く: "いて",
  ぐ: "いで",
  す: "して",
  ぬ: "んで",
  ぶ: "んで",
  む: "んで",
};
const GODAN_TA: Record<string, string> = {
  う: "った",
  つ: "った",
  る: "った",
  く: "いた",
  ぐ: "いだ",
  す: "した",
  ぬ: "んだ",
  ぶ: "んだ",
  む: "んだ",
};

// Suffix appended to the display stem for the polite forms, shared by ichidan
// and 来る (okurigana after the kanji stem inflects identically).
const POLITE_SUFFIX: Record<"masu" | "masen" | "mashita" | "te" | "nai" | "ta", string> = {
  masu: "ます",
  masen: "ません",
  mashita: "ました",
  te: "て",
  nai: "ない",
  ta: "た",
};

// Full kana forms of the two true irregulars.
const SURU: Record<VerbForm, string> = {
  masu: "します",
  masen: "しません",
  mashita: "しました",
  te: "して",
  nai: "しない",
  ta: "した",
};
const KURU: Record<VerbForm, string> = {
  masu: "きます",
  masen: "きません",
  mashita: "きました",
  te: "きて",
  nai: "こない",
  ta: "きた",
};

function finish(kana: string, kanji: string): Conjugated | null {
  const romaji = kanaToRomaji(kana);
  if (romaji === null) return null;
  return { kana, kanji, romaji };
}

/**
 * Display stem: the entry's kanji (or kana, when the entry is kana-written)
 * with the consumed kana tail stripped. Pool entries keep okurigana aligned
 * (食べる, 歩く, 来る), so the strip is exact.
 */
function displayStem(kanji: string, consumed: string): string {
  if (kanji.endsWith(consumed)) return kanji.slice(0, -consumed.length);
  return kanji;
}

export function conjugateVerb(
  kana: string,
  kanji: string,
  cls: VerbClass,
  form: VerbForm,
): Conjugated | null {
  if (cls === "irregular") {
    if (kana === "くる") {
      return finish(KURU[form], displayStem(kanji, "る") + POLITE_SUFFIX[form]);
    }
    // suru stems may be stored without する in the pool (勉強, 掃除).
    const kanaStem = kana.endsWith("する") ? kana.slice(0, -2) : kana;
    return finish(kanaStem + SURU[form], displayStem(kanji, "する") + SURU[form]);
  }

  if (cls === "ichidan") {
    if (!kana.endsWith("る")) return null;
    const stem = kana.slice(0, -1);
    const stemDisplay = displayStem(kanji, "る");
    return finish(stem + POLITE_SUFFIX[form], stemDisplay + POLITE_SUFFIX[form]);
  }

  // godan
  if (!kana) return null;
  const tail = kana.slice(-1);
  const body = kana.slice(0, -1);
  const stemDisplay = displayStem(kanji, tail);

  if (form === "masu" || form === "masen" || form === "mashita") {
    const i = GODAN_I[tail];
    if (i === undefined) return null;
    const suffix = POLITE_SUFFIX[form];
    return finish(body + i + suffix, stemDisplay + i + suffix);
  }
  if (form === "te" || form === "ta") {
    // 行く is the one godan te/ta exception (行って, not 行いて).
    if (kana === "いく") {
      const suffix = form === "te" ? "って" : "った";
      return finish(body + suffix, stemDisplay + suffix);
    }
    const suffix = (form === "te" ? GODAN_TE : GODAN_TA)[tail];
    if (suffix === undefined) return null;
    return finish(body + suffix, stemDisplay + suffix);
  }

  // plain negative: ある→ない suppletes; everything else takes the a-row.
  if (kana === "ある") return finish("ない", "ない");
  const a = GODAN_A[tail];
  if (a === undefined) return null;
  return finish(body + a + "ない", stemDisplay + a + "ない");
}

export function conjugateAdjective(
  kana: string,
  kanji: string,
  cls: AdjClass,
  form: AdjForm,
): Conjugated | null {
  if (cls === "i") {
    if (!kana.endsWith("い")) return null;
    const suffix = form === "negative" ? "くない" : form === "past" ? "かった" : "く";
    // いい conjugates from the よ stem (良い), never from its い.
    if (kana === "いい") {
      const formed = `よ${suffix}`;
      return finish(formed, formed);
    }
    return finish(kana.slice(0, -1) + suffix, displayStem(kanji, "い") + suffix);
  }
  // na-adjective: the stem never inflects; endings attach.
  const suffix = form === "negative" ? "じゃない" : form === "past" ? "だった" : "に";
  return finish(kana + suffix, kanji + suffix);
}
