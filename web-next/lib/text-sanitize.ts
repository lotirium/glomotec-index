/**
 * Brand v1.0 forbids em-dashes in body copy. The qualifier, verdict
 * synthesiser, and SCORER prompts all instruct the model to avoid them, but
 * Claude occasionally slips one through. This sanitiser is the persistence
 * boundary: every Claude-generated string gets piped through here on write,
 * so cached / replayed payloads stay clean.
 *
 * Applied on write (not on read): once cached, replays are byte-clean.
 *
 * Replacement rule: "—" → ", ". Then collapse any double-spaces produced by
 * the swap (e.g. "X — Y" becomes "X ,  Y" before collapse, "X, Y" after).
 * Trim once at the end so a leading/trailing dash doesn't leave whitespace.
 */
export function stripEmDash(s: string): string {
  return s.replace(/—/g, ", ").replace(/  +/g, " ").trim();
}

/** Map stripEmDash across an array, preserving order and shape. */
export function stripEmDashArray(items: string[]): string[] {
  return items.map(stripEmDash);
}
