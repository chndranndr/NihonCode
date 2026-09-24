/**
 * Legacy completion derivation shared by the Dexie v6 upgrade and backup
 * import: pre-activity `sessions` rows become activity contributions with a
 * category mapped from the recorded kind and a local date frozen from the
 * completion timestamp. One function keeps both paths identical, so a
 * restored v1 backup carries the same calendar history as an in-place v6
 * migration (docs/decisions.md 2026-09-22).
 */

import { categoryOfKind, type ActivityRow } from "../domain/activity";
import { dayKey } from "../domain/progress";

export interface LegacySessionRow {
  id?: number;
  kind: string;
  ts: number;
}

export function legacyActivityRows(rows: LegacySessionRow[]): ActivityRow[] {
  return rows.map((s, i) => ({
    id: `legacy-session:${s.id ?? `${s.ts}-${i}`}`,
    category: categoryOfKind(s.kind),
    date: dayKey(new Date(s.ts)),
    ts: s.ts,
  }));
}
