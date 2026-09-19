/**
 * Daily routine CTA state machine (pure domain, PRD 10.1): the dashboard's
 * focal action is due SRS review first, then new cards, then a drill, then a
 * progress check. Every readout the card shows is derived here so the UI can
 * never invent a state.
 */

export type DrillMode = "kana" | "kanji" | "vocab" | "numbers" | "dates";

export interface RoutineInput {
  dueCount: number;
  newCardCount: number;
  poolSize: number;
}

export type RoutineAction =
  | { kind: "review"; dueCount: number; estimateMinutes: number }
  | { kind: "new-cards"; count: number }
  | { kind: "drill"; mode: DrillMode }
  | { kind: "progress" };

const MINUTES_PER_CARD = 0.2;

export function estimateReviewMinutes(dueCount: number): number {
  return dueCount === 0 ? 0 : Math.max(1, Math.round(dueCount * MINUTES_PER_CARD));
}

export function routineAction(input: RoutineInput): RoutineAction {
  if (input.dueCount > 0) {
    return {
      kind: "review",
      dueCount: input.dueCount,
      estimateMinutes: estimateReviewMinutes(input.dueCount),
    };
  }
  if (input.newCardCount > 0) return { kind: "new-cards", count: input.newCardCount };
  if (input.poolSize > 0) return { kind: "drill", mode: "kana" };
  return { kind: "progress" };
}

export function routineLabel(action: RoutineAction): string {
  switch (action.kind) {
    case "review":
      return `START REVIEW (${action.dueCount} due, ~${action.estimateMinutes} min)`;
    case "new-cards":
      return `START NEW CARDS (${action.count})`;
    case "drill":
      return "START DRILL";
    case "progress":
      return "VIEW PROGRESS";
  }
}
