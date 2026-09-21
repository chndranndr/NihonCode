/**
 * Kana→romaji transliteration (pure domain). Powers romaji as an accepted
 * answer in the kanji drill: readings are kana, learners type romaji.
 * Hepburn-ish gojuon + dakuten/handakuten + yōon + sokuon; the chōon mark (ー)
 * doubles the preceding vowel, matching the pool's romaji style (おおきい →
 * ookii). Returns null on any unsupported character (kanji, punctuation) so
 * callers skip romaji acceptance rather than guess.
 */

const MORA: Record<string, string> = {
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
  が: "ga",
  ぎ: "gi",
  ぐ: "gu",
  げ: "ge",
  ご: "go",
  ざ: "za",
  じ: "ji",
  ず: "zu",
  ぜ: "ze",
  ぞ: "zo",
  だ: "da",
  ぢ: "ji",
  づ: "zu",
  で: "de",
  ど: "do",
  ば: "ba",
  び: "bi",
  ぶ: "bu",
  べ: "be",
  ぼ: "bo",
  ぱ: "pa",
  ぴ: "pi",
  ぷ: "pu",
  ぺ: "pe",
  ぽ: "po",
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
  ガ: "ga",
  ギ: "gi",
  グ: "gu",
  ゲ: "ge",
  ゴ: "go",
  ザ: "za",
  ジ: "ji",
  ズ: "zu",
  ゼ: "ze",
  ゾ: "zo",
  ダ: "da",
  ヂ: "ji",
  ヅ: "zu",
  デ: "de",
  ド: "do",
  バ: "ba",
  ビ: "bi",
  ブ: "bu",
  ベ: "be",
  ボ: "bo",
  パ: "pa",
  ピ: "pi",
  プ: "pu",
  ペ: "pe",
  ポ: "po",
};

const YOON: Record<string, string> = { ゃ: "ya", ゅ: "yu", ょ: "yo", ャ: "ya", ュ: "yu", ョ: "yo" };
const VOWELS = new Set(["a", "i", "u", "e", "o"]);

function mora(chars: string[], i: number): { rom: string; consumed: number } | null {
  const base = MORA[chars[i]];
  if (base === undefined) return null;
  const small = chars[i + 1];
  if (base.endsWith("i") && small !== undefined && YOON[small]) {
    // Hepburn: j/sh/ch-row yōon drops the y (じゅ→ju, しゃ→sha, ちょ→cho),
    // matching the pool's curated romaji (じゅう→juu, しゃしん→shashin).
    const dropY = base === "ji" || base === "shi" || base === "chi";
    const tail = dropY ? YOON[small].slice(1) : YOON[small];
    return { rom: base.slice(0, -1) + tail, consumed: 2 };
  }
  return { rom: base, consumed: 1 };
}

export function kanaToRomaji(kana: string): string | null {
  const chars = [...kana];
  if (chars.length === 0) return null;
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === "っ" || c === "ッ") {
      const next = mora(chars, i + 1);
      if (next === null) return null;
      out += next.rom.startsWith("ch") ? `t${next.rom}` : next.rom[0] + next.rom;
      i += next.consumed;
      continue;
    }
    if (c === "ー") {
      const last = [...out].reverse().find((ch) => VOWELS.has(ch));
      if (last === undefined) return null;
      out += last;
      continue;
    }
    const m = mora(chars, i);
    if (m === null) return null;
    out += m.rom;
    i += m.consumed - 1;
  }
  return out;
}
