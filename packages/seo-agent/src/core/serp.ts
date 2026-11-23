/**
 * Pure helpers for Google rank checks (DataForSEO SERP, organic). Google now returns redirect URLs
 * (google.com/goto?url=...), so a result is attributed to a site by the host in its breadcrumb, with domain and url as fallbacks.
 */
import { SERP_FRESH_DAYS, isFresh } from "./spend";

export const SERP_DEPTH = 30;
/** Standard-queue organic SERP, USD per page of 10 results (Live is $0.002; dataforseo.com/pricing/google-serp/google-organic-serp-api, read 2026-11-11). */
export const SERP_USD_PER_PAGE = 0.0006;
/** Tasks DataForSEO accepts in one task_post request. */
export const MAX_TASKS_PER_POST = 100;
/** A queued task still pending after this long is given up on (the target turnaround is 45 minutes). */
export const SERP_PENDING_HOURS = 72;
/** Most keywords one check sends. */
export const MAX_SERP_KEYWORDS = 200;

/** Tracked keywords that need a check: no check in the last SERP_FRESH_DAYS and no task already waiting. */
export function pickDueKeywords(tracked: string[], lastChecked: Map<string, Date>, pending: Set<string>, now: Date = new Date()): string[] {
  return tracked.filter((k) => !pending.has(k) && !isFresh(lastChecked.get(k), SERP_FRESH_DAYS, now));
}

export type TaskState = "pending" | "ready" | "failed";

/** DataForSEO task status: 40601 handed and 40602 in queue are still running, 20000 is ready, anything else failed. */
export function taskState(statusCode: unknown): TaskState {
  if (statusCode === 20000) return "ready";
  if (statusCode === 40601 || statusCode === 40602) return "pending";
  return "failed";
}

export function estimateSerpUsd(keywordCount: number, depth = SERP_DEPTH): number {
  return keywordCount <= 0 ? 0 : keywordCount * Math.ceil(depth / 10) * SERP_USD_PER_PAGE;
}

/** Lower-case host without www, or null. Accepts a URL or a breadcrumb start like "https://www.example.com". */
export function hostOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.trim().match(/^(?:https?:\/\/)?([^/\s›?#]+)/i);
  return m ? m[1].toLowerCase().replace(/^www\./, "") : null;
}

const sameSite = (host: string | null, site: string) => host !== null && (host === site || host.endsWith(`.${site}`));

/** Page path rebuilt from a breadcrumb such as "https://dailyrebatefx.com › guides › forex-rebate"; approximate (Google may shorten it). */
export function pathFromBreadcrumb(breadcrumb: string): string {
  const parts = breadcrumb.split("›").map((p) => p.trim()).filter(Boolean);
  return "/" + parts.slice(1).join("/").replace(/\s+/g, "-");
}

export type OurRank = { position: number | null; url: string | null; results: number };

/** First organic result that belongs to `siteHost`; position null when none of the returned results do. */
export function findOurRank(items: unknown, siteHost: string): OurRank {
  const site = siteHost.toLowerCase().replace(/^www\./, "");
  const list = Array.isArray(items) ? items : [];
  const results = list.filter((i) => i && typeof i === "object" && (i as { type?: unknown }).type === "organic").length;
  let seen = 0;
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    if (it.type !== "organic") continue;
    seen += 1;
    const crumb = typeof it.breadcrumb === "string" ? it.breadcrumb : "";
    const hosts = [hostOf(crumb), hostOf(it.domain), typeof it.url === "string" && !/google\.[a-z.]+\/goto/i.test(it.url) ? hostOf(it.url) : null];
    if (!hosts.some((h) => sameSite(h, site))) continue;
    const position = typeof it.rank_group === "number" && it.rank_group >= 1 ? Math.round(it.rank_group) : seen;
    const direct = typeof it.url === "string" && !/google\.[a-z.]+\/goto/i.test(it.url) ? it.url : null;
    return { position, url: (direct ?? (crumb ? `${site}${pathFromBreadcrumb(crumb)}` : null))?.slice(0, 500) ?? null, results };
  }
  return { position: null, url: null, results };
}
