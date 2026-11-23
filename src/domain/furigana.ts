/**
 * Furigana parsing (pure). Content encodes readings as `漢字(かんじ)`; a
 * parenthesised group is ruby only when its content is all kana AND it is
 * directly preceded by kanji. The reading attaches to the trailing run of
 * kanji before the paren; anything else (English/romaji asides) stays text.
 */

export interface FuriganaSegment {
  text: string;
  reading?: string;
}

const KANJI = /[\p{Script=Han}々〆ヶ]/u;
const KANA_ONLY = /^[\p{Script=Hiragana}\p{Script=Katakana}ー・]+$/u;
const OPEN: Record<string, string> = { "(": ")", "（": "）" };

export function parseFurigana(input: string): FuriganaSegment[] {
  const chars = [...input];
  const out: FuriganaSegment[] = [];
  let buf = "";

  const flush = (): void => {
    if (buf) out.push({ text: buf });
    buf = "";
  };

  for (let i = 0; i < chars.length; i++) {
    const close = OPEN[chars[i]];
    if (close && buf && KANJI.test([...buf].at(-1)!)) {
      const end = chars.indexOf(close, i + 1);
      const reading = end > i + 1 ? chars.slice(i + 1, end).join("") : "";
      if (reading && KANA_ONLY.test(reading)) {
        const b = [...buf];
        let k = b.length;
        while (k > 0 && KANJI.test(b[k - 1])) k--;
        buf = b.slice(0, k).join("");
        flush();
        out.push({ text: b.slice(k).join(""), reading });
        i = end;
        continue;
      }
    }
    buf += chars[i];
  }
  flush();
  return out;
}

/** The string with readings removed, for speech and plain-text use. */
export function stripFurigana(input: string): string {
  return parseFurigana(input)
    .map((s) => s.text)
    .join("");
}
