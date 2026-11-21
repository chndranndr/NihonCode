/** Pluralised count for user-visible copy: "1 session", "3 sessions". */
export function countOf(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
