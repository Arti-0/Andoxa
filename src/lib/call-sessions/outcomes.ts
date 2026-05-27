/** Meeting booked during a call session (UI id + legacy DB value). */
export function isRdvOutcome(outcome: string | null | undefined): boolean {
  return outcome === "rdv" || outcome === "booked";
}

/** No answer / unreachable (UI id + legacy DB value). */
export function isNoAnswerOutcome(outcome: string | null | undefined): boolean {
  return outcome === "noanswer" || outcome === "no_answer";
}
