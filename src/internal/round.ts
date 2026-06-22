/** Round a USD amount to 6 decimal places to avoid floating-point noise in reports. */
export function roundUSD(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
