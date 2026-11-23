/** Pure helpers for the SEO keyword watchlist. */

export const MAX_KEYWORD_LENGTH = 200;
export const MAX_PATH_LENGTH = 300;

export type RankStatus = "none" | "top3" | "top10" | "top20" | "beyond";

/** Trim, lower-case and collapse whitespace so it matches Search Console's lower-cased queries. */
export function normalizeKeyword(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Reduce a URL or path to a site path without query, hash or trailing slash; null when empty. */
export function normalizeTargetPath(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  let path = text;
  if (/^https?:\/\//i.test(text)) {
    try {
      path = new URL(text).pathname;
    } catch {
      return null;
    }
  }
  path = path.split(/[?#]/)[0] ?? "";
  if (!path.startsWith("/")) return null;
  path = path.replace(/\/+$/, "") || "/";
  return path.length <= MAX_PATH_LENGTH ? path : null;
}

/** Path of a full page URL, same normalisation as `normalizeTargetPath`. */
export function pathOf(url: string): string {
  return normalizeTargetPath(url) ?? url;
}

export function rankStatus(position: number | null): RankStatus {
  if (position === null) return "none";
  if (position <= 3) return "top3";
  if (position <= 10) return "top10";
  if (position <= 20) return "top20";
  return "beyond";
}

/** Locale-prefixed paths (/ko/guides/x) count as the same page as the English target. */
export function samePage(a: string, b: string): boolean {
  const strip = (p: string) => p.replace(/^\/(ko|zh|zh-TW|hi|ar|de|es|fr|id|ms|ru|th|tr|en-GH|en-LK|en-PH)(?=\/|$)/, "") || "/";
  return strip(a) === strip(b);
}
