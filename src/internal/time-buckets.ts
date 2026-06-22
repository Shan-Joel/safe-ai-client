/** UTC calendar day for a timestamp, e.g. "2026-06-22". */
export function dayBucket(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** UTC calendar month for a timestamp, e.g. "2026-06". */
export function monthBucket(ts: number): string {
  return new Date(ts).toISOString().slice(0, 7);
}
