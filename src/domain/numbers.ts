/**
 * Algorithmic number readings (PRD 10.7): Japanese <-> number, 1..999999,
 * with irregular hundreds/thousands readings. Pure domain, zero dataset
 * dependency. Japanese and romaji forms are generated from one decomposition
 * so they can never disagree.
 */

interface Reading {
  jp: string;
  romaji: string;
}

const ONES: Reading[] = [
  { jp: "", romaji: "" },
  { jp: "いち", romaji: "ichi" },
  { jp: "に", romaji: "ni" },
  { jp: "さん", romaji: "san" },
  { jp: "よん", romaji: "yon" },
  { jp: "ご", romaji: "go" },
  { jp: "ろく", romaji: "roku" },
  { jp: "なな", romaji: "nana" },
  { jp: "はち", romaji: "hachi" },
  { jp: "きゅう", romaji: "kyuu" },
];

const TENS: Reading = { jp: "じゅう", romaji: "juu" };

const HUNDREDS: Reading[] = [
  { jp: "", romaji: "" },
  { jp: "ひゃく", romaji: "hyaku" },
  { jp: "にひゃく", romaji: "nihyaku" },
  { jp: "さんびゃく", romaji: "sanbyaku" },
  { jp: "よんひゃく", romaji: "yonhyaku" },
  { jp: "ごひゃく", romaji: "gohyaku" },
  { jp: "ろっぴゃく", romaji: "roppyaku" },
  { jp: "ななひゃく", romaji: "nanahyaku" },
  { jp: "はっぴゃく", romaji: "happyaku" },
  { jp: "きゅうひゃく", romaji: "kyuuhyaku" },
];

const THOUSANDS: Reading[] = [
  { jp: "", romaji: "" },
  { jp: "せん", romaji: "sen" },
  { jp: "にせん", romaji: "nisen" },
  { jp: "さんぜん", romaji: "sanzen" },
  { jp: "よんせん", romaji: "yonsen" },
  { jp: "ごせん", romaji: "gosen" },
  { jp: "ろくせん", romaji: "rokusen" },
  { jp: "ななせん", romaji: "nanasen" },
  { jp: "はっせん", romaji: "hassen" },
  { jp: "きゅうせん", romaji: "kyuusen" },
];

const TEN_THOUSAND: Reading = { jp: "まん", romaji: "man" };

function combine(parts: Reading[]): Reading {
  return parts.reduce((acc, p) => ({ jp: acc.jp + p.jp, romaji: acc.romaji + p.romaji }), {
    jp: "",
    romaji: "",
  });
}

function belowHundred(n: number): Reading {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const parts: Reading[] = [];
  if (tens > 0) parts.push(tens === 1 ? TENS : combine([ONES[tens], TENS]));
  if (ones > 0) parts.push(ONES[ones]);
  return combine(parts);
}

function belowThousand(n: number): Reading {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: Reading[] = [];
  if (hundreds > 0) parts.push(HUNDREDS[hundreds]);
  if (rest > 0) parts.push(belowHundred(rest));
  return combine(parts);
}

export function numberReading(n: number): Reading {
  if (!Number.isInteger(n) || n < 1 || n > 999_999) {
    throw new RangeError(`number out of supported range: ${n}`);
  }
  const man = Math.floor(n / 10_000);
  const rest = n % 10_000;
  const sen = Math.floor(rest / 1000);
  const below = rest % 1000;
  const parts: Reading[] = [];
  if (man > 0) parts.push(man === 1 ? TEN_THOUSAND : combine([belowThousand(man), TEN_THOUSAND]));
  if (sen > 0) parts.push(THOUSANDS[sen]);
  if (below > 0) parts.push(belowThousand(below));
  return combine(parts);
}

export function numberToJapanese(n: number): string {
  return numberReading(n).jp;
}

export function numberToRomaji(n: number): string {
  return numberReading(n).romaji;
}

export interface NumberQuestion {
  value: number;
  japanese: string;
  romaji: string;
}

export function makeNumberQuestion(rand: () => number = Math.random): NumberQuestion {
  const value = Math.floor(rand() * 999_999) + 1;
  const reading = numberReading(value);
  return { value, japanese: reading.jp, romaji: reading.romaji };
}

/** Question within an inclusive custom range (PRD 10.7 preset/custom ranges). */
export function makeNumberQuestionInRange(
  min: number,
  max: number,
  rand: () => number = Math.random,
): NumberQuestion {
  const lo = Math.max(1, Math.min(min, max));
  const hi = Math.min(999_999, Math.max(min, max));
  const value = lo + Math.floor(rand() * (hi - lo + 1));
  const reading = numberReading(value);
  return { value, japanese: reading.jp, romaji: reading.romaji };
}
