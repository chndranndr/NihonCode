/**
 * Split a recorded kanji reading ("にし / セイ サイ") into on'yomi and kun'yomi
 * by script: a segment written only in katakana (spaces allowed between
 * readings) is on'yomi, anything else is kun'yomi.
 */
export function scriptSplit(reading: string): { on: string; kun: string } {
  const on: string[] = [];
  const kun: string[] = [];
  for (const segment of reading.split("/")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    if (/^[゠-ヿ・][゠-ヿ・\s]*$/.test(trimmed)) on.push(trimmed);
    else kun.push(trimmed);
  }
  return { on: on.join("、"), kun: kun.join("、") };
}
