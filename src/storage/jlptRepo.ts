/**
 * Per-set JLPT progress (PRD 10.17): best score and completion per
 * `jlpt:<level>:<category>:<setNumber>`. Pure persistence; grading lives in
 * the feature, scheduling nowhere (JLPT sets are not SRS content).
 */

import { db, type JlptProgressRow } from "./db";

export function jlptProgressId(level: string, category: string, setNumber: number): string {
  return `jlpt:${level}:${category}:${setNumber}`;
}

/** Keep the learner's best score; reruns never erase progress. */
export async function recordJlptResult(
  level: string,
  category: string,
  setNumber: number,
  correct: number,
  total: number,
): Promise<void> {
  const id = jlptProgressId(level, category, setNumber);
  // An explicit transaction resolves only after commit: a bare put() promise
  // can resolve before the transaction commits, and an immediate unload
  // (closing the tab after FINISH) would silently lose the score.
  await db().transaction("rw", db().jlptProgress, async () => {
    const existing = await db().jlptProgress.get(id);
    if (existing && existing.bestCorrect / existing.total >= correct / total) return;
    const row: JlptProgressRow = { id, bestCorrect: correct, total, completedAt: Date.now() };
    await db().jlptProgress.put(row);
  });
}

export async function jlptProgressMap(): Promise<Map<string, JlptProgressRow>> {
  const rows = await db().jlptProgress.toArray();
  return new Map(rows.map((r) => [r.id, r]));
}
