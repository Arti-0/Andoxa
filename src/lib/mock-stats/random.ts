/** Inclusive random integer in [min, max]. Never returns 0 when min >= 1. */
export function randInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

export function randPct(min = 18, max = 72): number {
  return randInt(min, max);
}

export function randTrend(min = -12, max = 28): number {
  return randInt(min, max);
}

export function randSpark(len: number, base: number, spread = 12): number[] {
  return Array.from({ length: len }, () =>
    randInt(Math.max(1, base - spread), base + spread),
  );
}

/** Strictly descending funnel counts (each step smaller than the previous). */
export function funnelCounts(steps: number, topMin: number, topMax: number): number[] {
  const top = randInt(topMin, topMax);
  const out: number[] = [top];
  for (let i = 1; i < steps; i++) {
    const prev = out[i - 1]!;
    const ratio = randInt(42, 78) / 100;
    out.push(Math.max(randInt(4, 12), Math.round(prev * ratio)));
  }
  return out;
}

export function mockUuid(n: number): string {
  const hex = n.toString(16).padStart(8, "0");
  return `${hex.slice(0, 8)}-mock-4aaa-8aaa-${hex.padStart(12, "0").slice(0, 12)}`;
}
