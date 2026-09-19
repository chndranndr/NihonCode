/**
 * Grading rules (pure domain). Case-insensitive; whitespace/punctuation
 * normalized per PRD 10.6/10.8; alternate readings accepted when supplied.
 */

export interface GradeInput {
  submitted: string;
  accepted: readonly string[];
}

export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, "")
    .replace(/[.,!?'"’“”-]/g, "");
}

export function grade({ submitted, accepted }: GradeInput): boolean {
  const got = normalizeAnswer(submitted);
  if (got.length === 0) return false;
  return accepted.some((a) => normalizeAnswer(a) === got);
}
