/**
 * Pure helpers for the monthly Claude spend cap of the SEO tasks. Prices are list prices in USD per million tokens,
 * from platform.claude.com/docs/en/about-claude/pricing (read 2026-11-23). Add a model here before a host uses it.
 */

type Price = { input: number; output: number };

/** Keyed by model id without a date suffix ("claude-sonnet-4-5-20250929" reads as "claude-sonnet-4-5"). */
const PRICES: Record<string, Price> = {
  "claude-fable-5-2": { input: 8, output: 40 },
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-fable-5": { input: 10, output: 50 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-opus-4-5": { input: 5, output: 25 },
  "claude-opus-4-1": { input: 15, output: 75 },
  "claude-opus-4-0": { input: 15, output: 75 },
  "claude-opus-4": { input: 15, output: 75 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-sonnet-4-0": { input: 3, output: 15 },
  "claude-sonnet-4": { input: 3, output: 15 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/** Haiku 5.5 bills the whole request at a higher price when its prompt (input plus cache writes and reads) is over 100,000 tokens. */
const LONG_PROMPT: Record<string, { over: number } & Price> = {
  "claude-haiku-5-5": { over: 100_000, input: 0.5, output: 2.5 },
};

/** A model not in the table is costed at the dearest price in it, so the cap errs on the safe side. */
const FALLBACK: Price = Object.values(PRICES).reduce((a, b) => (b.input + b.output > a.input + a.output ? b : a));

/**
 * Cache tokens as a share of the input price. A cache write costs 1.25x (5 minutes) or 2x (1 hour) and a read 0.1x or less,
 * depending on the model; the dearer share is used because the usage totals do not say which applied.
 */
const CACHE_WRITE = 2;
const CACHE_READ = 0.1;

/** Cache counts appear only when the response has them. */
export type ClaudeUsage = { inputTokens: number; outputTokens: number; cacheWriteTokens?: number; cacheReadTokens?: number };

/** Reads `usage` from a Messages API response; zeros when it is missing. */
export function usageOf(response: unknown): ClaudeUsage {
  const usage = (response as { usage?: Record<string, unknown> } | null)?.usage;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : 0);
  const out: ClaudeUsage = { inputTokens: n(usage?.input_tokens), outputTokens: n(usage?.output_tokens) };
  const write = n(usage?.cache_creation_input_tokens);
  const read = n(usage?.cache_read_input_tokens);
  if (write) out.cacheWriteTokens = write;
  if (read) out.cacheReadTokens = read;
  return out;
}

export function claudeCostUsd(model: string, usage: ClaudeUsage): number {
  const id = model.trim().toLowerCase().replace(/-\d{8}$/, "");
  const write = usage.cacheWriteTokens ?? 0;
  const read = usage.cacheReadTokens ?? 0;
  const long = LONG_PROMPT[id];
  const price = long && usage.inputTokens + write + read > long.over ? long : (PRICES[id] ?? FALLBACK);
  const input = usage.inputTokens + write * CACHE_WRITE + read * CACHE_READ;
  return (input * price.input + usage.outputTokens * price.output) / 1_000_000;
}

/** Empty, zero, negative or not a number means no cap. */
export function parseUsdCap(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Message when no further Claude call may run this month, otherwise null. The cost of a call is only known afterwards, so the check is "already at or over". */
export function claudeCapMessage(monthSpentUsd: number, capUsd: number | null): string | null {
  if (capUsd === null || monthSpentUsd < capUsd) return null;
  return `Đã chạm giới hạn Claude tháng này: đã dùng $${monthSpentUsd.toFixed(2)} trên hạn mức $${capUsd.toFixed(2)}. Tăng hạn mức ở AI Content Agent › Cấu hình nếu muốn tiếp tục.`;
}
