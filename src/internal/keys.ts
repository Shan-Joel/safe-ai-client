import { SafeAiError } from "../errors";

const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);

/** Build a namespaced storage key, rejecting prototype-polluting segments. */
export function buildKey(...segments: (string | number)[]): string {
  return segments
    .map((segment) => {
      const str = String(segment);
      if (FORBIDDEN.has(str)) {
        throw new SafeAiError(`Unsafe storage key segment: "${str}"`);
      }
      return str;
    })
    .join(":");
}
