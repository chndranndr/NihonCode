/**
 * Date and weekday readings (PRD 10.8): days of week always the 7 items;
 * full dates combine year/month/day readings with irregular day counters.
 * Pure domain, zero dataset dependency.
 */

import { numberToJapanese } from "./numbers";

export const WEEKDAYS = [
  { jp: "月曜日", en: "Monday", romaji: "getsuyoubi" },
  { jp: "火曜日", en: "Tuesday", romaji: "kayoubi" },
  { jp: "水曜日", en: "Wednesday", romaji: "suiyoubi" },
  { jp: "木曜日", en: "Thursday", romaji: "mokuyoubi" },
  { jp: "金曜日", en: "Friday", romaji: "kinyoubi" },
  { jp: "土曜日", en: "Saturday", romaji: "doyoubi" },
  { jp: "日曜日", en: "Sunday", romaji: "nichiyoubi" },
] as const;

const DAY_READINGS: Record<number, string> = {
  1: "ついたち",
  2: "ふつか",
  3: "みっか",
  4: "よっか",
  5: "いつか",
  6: "むいか",
  7: "なのか",
  8: "ようか",
  9: "ここのか",
  10: "とおか",
  14: "じゅうよっか",
  20: "はつか",
  24: "にじゅうよっか",
};

export function dayReading(day: number): string {
  const irregular = DAY_READINGS[day];
  if (irregular) return irregular;
  return `${numberToJapanese(day)}にち`;
}

const MONTH_READINGS = [
  "いちがつ",
  "にがつ",
  "さんがつ",
  "しがつ",
  "ごがつ",
  "ろくがつ",
  "しちがつ",
  "はちがつ",
  "くがつ",
  "じゅうがつ",
  "じゅういちがつ",
  "じゅうにがつ",
];

export function monthReading(month: number): string {
  return MONTH_READINGS[month - 1];
}

export function yearReading(year: number): string {
  return `${numberToJapanese(year)}ねん`;
}

export interface FullDate {
  year: number;
  month: number;
  day: number;
  japanese: string;
  english: string;
}

export function makeFullDate(
  yearMin: number,
  yearMax: number,
  rand: () => number = Math.random,
): FullDate {
  const year = yearMin + Math.floor(rand() * (yearMax - yearMin + 1));
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  const date = new Date(year, month - 1, day);
  return {
    year,
    month,
    day,
    japanese: `${yearReading(year)}${monthReading(month)}${dayReading(day)}`,
    english: date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}
