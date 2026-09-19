/**
 * Romaji -> katakana conversion so romaji-only input has a readable Japanese
 * form for TTS. Handles yōon combos (kya, sho, ryo...), digraphs (shi, chi,
 * tsu, ja...), sokuon (kk -> ッk), and standalone n -> ン. Unknown characters
 * are skipped rather than guessed.
 */

const YOON: ReadonlyArray<readonly [string, string]> = [
  ["kya", "キャ"],
  ["kyu", "キュ"],
  ["kyo", "キョ"],
  ["gya", "ギャ"],
  ["gyu", "ギュ"],
  ["gyo", "ギョ"],
  ["sha", "シャ"],
  ["shu", "シュ"],
  ["sho", "ショ"],
  ["ja", "ジャ"],
  ["ju", "ジュ"],
  ["jo", "ジョ"],
  ["cha", "チャ"],
  ["chu", "チュ"],
  ["cho", "チョ"],
  ["nya", "ニャ"],
  ["nyu", "ニュ"],
  ["nyo", "ニョ"],
  ["hya", "ヒャ"],
  ["hyu", "ヒュ"],
  ["hyo", "ヒョ"],
  ["bya", "ビャ"],
  ["byu", "ビュ"],
  ["byo", "ビョ"],
  ["pya", "ピャ"],
  ["pyu", "ピュ"],
  ["pyo", "ピョ"],
  ["mya", "ミャ"],
  ["myu", "ミュ"],
  ["myo", "ミョ"],
  ["rya", "リャ"],
  ["ryu", "リュ"],
  ["ryo", "リョ"],
];

const DIGRAPHS: ReadonlyArray<readonly [string, string]> = [
  ["shi", "シ"],
  ["chi", "チ"],
  ["tsu", "ツ"],
  ["ji", "ジ"],
  ["fu", "フ"],
];

const BASE: ReadonlyArray<readonly [string, string]> = [
  ["ka", "カ"],
  ["ki", "キ"],
  ["ku", "ク"],
  ["ke", "ケ"],
  ["ko", "コ"],
  ["sa", "サ"],
  ["si", "シ"],
  ["su", "ス"],
  ["se", "セ"],
  ["so", "ソ"],
  ["ta", "タ"],
  ["ti", "チ"],
  ["tu", "ツ"],
  ["te", "テ"],
  ["to", "ト"],
  ["na", "ナ"],
  ["ni", "ニ"],
  ["nu", "ヌ"],
  ["ne", "ネ"],
  ["no", "ノ"],
  ["ha", "ハ"],
  ["hi", "ヒ"],
  ["hu", "フ"],
  ["he", "ヘ"],
  ["ho", "ホ"],
  ["ma", "マ"],
  ["mi", "ミ"],
  ["mu", "ム"],
  ["me", "メ"],
  ["mo", "モ"],
  ["ya", "ヤ"],
  ["yu", "ユ"],
  ["yo", "ヨ"],
  ["ra", "ラ"],
  ["ri", "リ"],
  ["ru", "ル"],
  ["re", "レ"],
  ["ro", "ロ"],
  ["wa", "ワ"],
  ["wo", "ヲ"],
  ["ga", "ガ"],
  ["gi", "ギ"],
  ["gu", "グ"],
  ["ge", "ゲ"],
  ["go", "ゴ"],
  ["za", "ザ"],
  ["zi", "ジ"],
  ["zu", "ズ"],
  ["ze", "ゼ"],
  ["zo", "ゾ"],
  ["da", "ダ"],
  ["di", "ヂ"],
  ["du", "ヅ"],
  ["de", "デ"],
  ["do", "ド"],
  ["ba", "バ"],
  ["bi", "ビ"],
  ["bu", "ブ"],
  ["be", "ベ"],
  ["bo", "ボ"],
  ["pa", "パ"],
  ["pi", "ピ"],
  ["pu", "プ"],
  ["pe", "ペ"],
  ["po", "ポ"],
  ["fa", "ファ"],
  ["fi", "フィ"],
  ["fe", "フェ"],
  ["fo", "フォ"],
  ["a", "ア"],
  ["i", "イ"],
  ["u", "ウ"],
  ["e", "エ"],
  ["o", "オ"],
];

export function romajiToKana(romaji: string): string {
  let src = romaji.toLowerCase().replace(/[^a-z\s-]/g, "");
  let out = "";
  while (src.length > 0) {
    if (src.startsWith("nn")) {
      out += "ン";
      src = src.slice(2);
      continue;
    }
    if (/^([bcdfghjklmpqrstvwz])\1/.test(src)) {
      out += "ッ";
      src = src.slice(1);
      continue;
    }
    const yoon = YOON.find(([r]) => src.startsWith(r));
    if (yoon) {
      out += yoon[1];
      src = src.slice(yoon[0].length);
      continue;
    }
    const digraph = DIGRAPHS.find(([r]) => src.startsWith(r));
    if (digraph) {
      out += digraph[1];
      src = src.slice(digraph[0].length);
      continue;
    }
    const base = BASE.find(([r]) => src.startsWith(r));
    if (base) {
      out += base[1];
      src = src.slice(base[0].length);
      continue;
    }
    if (src[0] === "n") {
      out += "ン";
      src = src.slice(1);
      continue;
    }
    src = src.slice(1); // unknown char: skip
  }
  return out;
}
