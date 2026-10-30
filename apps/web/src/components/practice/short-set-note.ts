const NOTE = /^Started with (\d+) of (\d+) requested questions$/;

/**
 * Controller ruling R18: the `?note=` query value is never rendered. It is accepted only in the exact
 * shape the builder produces, and the sentence is rebuilt from the two parsed integers.
 */
export function shortSetSentence(note: string | undefined): string | null {
  const m = note ? NOTE.exec(note) : null;
  if (!m) return null;
  const requested = Math.min(50, Math.max(1, Number(m[2])));
  const got = Math.min(requested, Math.max(1, Number(m[1])));
  return `Started with ${got} of ${requested} requested questions. Not enough matching questions were available.`;
}
