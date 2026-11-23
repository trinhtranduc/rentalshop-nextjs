/**
 * Pure helpers that keep DataForSEO spend under control: what counts as fresh (so it is not bought twice), the month
 * window of the ledger, and the budget check run before a paid call.
 */

/** Google Ads search volume is updated monthly, so a row younger than this is not fetched again. */
export const FRESH_DAYS = 30;
/** A Google rank younger than this is not checked again. */
export const SERP_FRESH_DAYS = 7;

export type UsageKind = "volume" | "discover" | "equivalents" | "serp";

export function isFresh(at: Date | null | undefined, days: number, now: Date = new Date()): boolean {
  return Boolean(at) && now.getTime() - (at as Date).getTime() < days * 86_400_000;
}

/** First instant of the UTC month, the start of the window the monthly cap counts. */
export function monthStartUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Parses DATAFORSEO_MONTHLY_CAP_USD; empty, zero, negative or not a number means no cap. */
export function parseCap(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

const usd = (n: number) => `$${n.toFixed(n < 1 ? 3 : 2)}`;

/**
 * Message when the next paid call must not run, otherwise null. `balanceUsd` is null when the balance could not be read;
 * the cap still applies then.
 */
export function checkBudget(input: { estimateUsd: number; balanceUsd: number | null; monthSpentUsd: number; capUsd: number | null }): string | null {
  const { estimateUsd, balanceUsd, monthSpentUsd, capUsd } = input;
  if (estimateUsd <= 0) return null;
  if (balanceUsd !== null && estimateUsd > balanceUsd) {
    return `Số dư DataForSEO ${usd(balanceUsd)} không đủ cho lần này (khoảng ${usd(estimateUsd)}). Nạp thêm hoặc giảm số từ khoá.`;
  }
  if (capUsd !== null && monthSpentUsd + estimateUsd > capUsd) {
    return `Vượt hạn mức tháng ${usd(capUsd)}: đã dùng ${usd(monthSpentUsd)}, lần này khoảng ${usd(estimateUsd)}. Tăng hạn mức ở AI Content Agent › Cấu hình nếu muốn tiếp tục.`;
  }
  return null;
}
