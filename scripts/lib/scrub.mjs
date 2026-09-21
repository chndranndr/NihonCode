// Scraper-artifact detection/cleanup (DEVELOPMENT_PROMPT task 2 precedent).
// Strips stray C1/other control bytes and maps the fullwidth HYPHEN-MINUS
// U+FF0D to the katakana prolonged sound mark (U+30FC). data/clean/ is the
// tracked dataset: these artifacts were corrected once during curation, and
// audit-clean now uses scrubJapanese as the detector — if it would change a
// tracked string, an artifact has been reintroduced by a bad edit.

// Built from code points (not a literal) so the character class is explicit.
const CONTROL = new RegExp(
  "[" +
    String.fromCharCode(0) +
    "-" +
    String.fromCharCode(8) +
    String.fromCharCode(11) +
    String.fromCharCode(12) +
    String.fromCharCode(14) +
    "-" +
    String.fromCharCode(31) +
    String.fromCharCode(127) +
    String.fromCharCode(128) +
    "-" +
    String.fromCharCode(159) +
    "]",
  "g",
);

export function scrubJapanese(s) {
  if (typeof s !== "string") return s;
  return s.replace(CONTROL, "").replace(/\uff0d/g, "\u30fc");
}
