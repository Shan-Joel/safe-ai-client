/** If adding `addUSD` to `spentUSD` exceeds `limitUSD`, return the projected total; else null. */
export function projectedExceeds(
  spentUSD: number,
  addUSD: number,
  limitUSD: number | undefined,
): number | null {
  if (limitUSD == null) return null;
  const projected = spentUSD + addUSD;
  return projected > limitUSD ? projected : null;
}

/** Warning ratios newly crossed moving from prevUSD to newUSD (spend only increases). */
export function crossedThresholds(
  prevUSD: number,
  newUSD: number,
  limitUSD: number | undefined,
  ratios: number[],
): number[] {
  if (limitUSD == null) return [];
  return ratios
    .filter((ratio) => {
      const threshold = ratio * limitUSD;
      return prevUSD < threshold && newUSD >= threshold;
    })
    .sort((a, b) => a - b);
}

/** Remaining budget (clamped at 0), or null when no limit is configured. */
export function remaining(spentUSD: number, limitUSD: number | undefined): number | null {
  if (limitUSD == null) return null;
  return Math.max(0, limitUSD - spentUSD);
}
