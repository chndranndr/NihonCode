import { parseFurigana } from "../domain/furigana";

/** Renders `漢字(かんじ)` content strings as real <ruby> markup. */
export function Furigana({ text }: { text: string }) {
  return (
    <>
      {parseFurigana(text).map((s, i) =>
        s.reading ? (
          <ruby key={i}>
            {s.text}
            <rp>(</rp>
            <rt>{s.reading}</rt>
            <rp>)</rp>
          </ruby>
        ) : (
          s.text
        ),
      )}
    </>
  );
}
