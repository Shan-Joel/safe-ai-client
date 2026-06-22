import type { TokenUsage } from "../types";

/**
 * Best-effort extraction of token usage from a response body. Recognizes the two most
 * common `usage` field shapes returned by AI APIs:
 *   - `{ prompt_tokens, completion_tokens }`
 *   - `{ input_tokens, output_tokens }`
 * If neither is present, returns null so the caller can fall back to an estimate.
 */
export function defaultExtractUsage(data: unknown): TokenUsage | null {
  if (!data || typeof data !== "object") return null;
  const usage = (data as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") return null;
  const u = usage as Record<string, unknown>;

  if (typeof u.prompt_tokens === "number" && typeof u.completion_tokens === "number") {
    return { inputTokens: u.prompt_tokens, outputTokens: u.completion_tokens };
  }
  if (typeof u.input_tokens === "number" && typeof u.output_tokens === "number") {
    return { inputTokens: u.input_tokens, outputTokens: u.output_tokens };
  }
  return null;
}
