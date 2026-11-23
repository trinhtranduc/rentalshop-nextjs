/** Pure helpers for the monthly Claude spend cap of the SEO tasks. Prices are list prices in USD per million tokens. */

const PRICES: { prefix: string; input: number; output: number }[] = [
  { prefix: "claude-haiku-", input: 0.1, output: 0.5 },
  { prefix: "claude-sonnet-", input: 2, output: 10 },
];
/** A model not in the table is costed at the dearest listed price, so the cap errs on the safe side. */
const FALLBACK = PRICES[PRICES.length - 1];

export type ClaudeUsage = { inputTokens: number; outputTokens: number };

/** Reads `usage` from a Messages API response; zeros when it is missing. */
export function usageOf(response: unknown): ClaudeUsage {
  const usage = (response as { usage?: { input_tokens?: unknown; output_tokens?: unknown } } | null)?.usage;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : 0);
  return { inputTokens: n(usage?.input_tokens), outputTokens: n(usage?.output_tokens) };
}

export function claudeCostUsd(model: string, usage: ClaudeUsage): number {
  const price = PRICES.find((p) => model.startsWith(p.prefix)) ?? FALLBACK;
  return (usage.inputTokens * price.input + usage.outputTokens * price.output) / 1_000_000;
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
