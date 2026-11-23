/**
 * Pure parts of competitor analysis. The input is the organic result list of a Google check the site already pays
 * for (DataForSEO SERP); nothing here calls a network or guesses a number.
 */
import { hostOf } from "./serp";

/** How many organic results of each check are kept. */
export const COMPETITOR_TOP = 10;

export type OrganicRow = { position: number; domain: string; url: string | null; title: string | null };

const isGoogleRedirect = (url: string) => /google\.[a-z.]+\/goto/i.test(url);

/** The first `limit` organic results as position, host, url and title. A result with no readable host is dropped. */
export function parseOrganic(items: unknown, limit = COMPETITOR_TOP): OrganicRow[] {
  const out: OrganicRow[] = [];
  let seen = 0;
  for (const raw of Array.isArray(items) ? items : []) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    if (it.type !== "organic") continue;
    seen += 1;
    const direct = typeof it.url === "string" && !isGoogleRedirect(it.url) ? it.url : null;
    const domain = hostOf(it.breadcrumb) ?? (direct ? hostOf(direct) : null) ?? (hostOf(it.domain) === "google.com" ? null : hostOf(it.domain));
    if (!domain) continue;
    const position = typeof it.rank_group === "number" && it.rank_group >= 1 ? Math.round(it.rank_group) : seen;
    if (position > limit) continue;
    out.push({ position, domain, url: direct ? direct.slice(0, 500) : null, title: typeof it.title === "string" ? it.title.trim().slice(0, 300) || null : null });
  }
  return out.sort((a, b) => a.position - b.position);
}

export const isOwn = (domain: string, siteHost: string) => domain === siteHost || domain.endsWith(`.${siteHost}`);

export type KeywordResults = { keyword: string; rows: OrganicRow[] };

export type Competitor = {
  domain: string;
  /** Checked keywords where the domain is in the kept results. */
  keywords: number;
  /** Share of all checked keywords, 0 to 1. */
  share: number;
  avgPosition: number;
  best: number;
  /** Keywords where it ranks above the site, or the site is not in the kept results. */
  ahead: number;
  /** Its best keywords, for reading: position ascending. */
  examples: { keyword: string; position: number }[];
};

export type KeywordGap = { keyword: string; ourPosition: number | null; leaders: { position: number; domain: string }[] };

export type CompetitorReport = {
  checkedKeywords: number;
  /** Keywords where the site is in the kept results. */
  ourKeywords: number;
  competitors: Competitor[];
  /** Keywords where the site is outside the kept results, with who holds the top three. */
  gaps: KeywordGap[];
};

/** Counts, per domain, how often it shows up across the checked keywords and how often it stands above the site. */
export function buildCompetitorReport(input: KeywordResults[], siteHost: string, limit = 20): CompetitorReport {
  const site = siteHost.toLowerCase().replace(/^www\./, "");
  const checked = input.filter((k) => k.rows.length > 0);
  const byDomain = new Map<string, { positions: { keyword: string; position: number }[]; ahead: number }>();
  const gaps: KeywordGap[] = [];
  let ourKeywords = 0;
  for (const k of checked) {
    const ours = k.rows.find((r) => isOwn(r.domain, site))?.position ?? null;
    if (ours !== null) ourKeywords += 1;
    else gaps.push({ keyword: k.keyword, ourPosition: null, leaders: k.rows.filter((r) => !isOwn(r.domain, site)).slice(0, 3).map((r) => ({ position: r.position, domain: r.domain })) });
    const counted = new Set<string>();
    for (const r of k.rows) {
      if (isOwn(r.domain, site) || counted.has(r.domain)) continue;
      counted.add(r.domain);
      const entry = byDomain.get(r.domain) ?? { positions: [], ahead: 0 };
      entry.positions.push({ keyword: k.keyword, position: r.position });
      if (ours === null || r.position < ours) entry.ahead += 1;
      byDomain.set(r.domain, entry);
    }
  }
  const competitors = [...byDomain.entries()]
    .map(([domain, e]): Competitor => {
      const sorted = [...e.positions].sort((a, b) => a.position - b.position || a.keyword.localeCompare(b.keyword));
      return {
        domain,
        keywords: sorted.length,
        share: checked.length ? sorted.length / checked.length : 0,
        avgPosition: sorted.reduce((s, p) => s + p.position, 0) / sorted.length,
        best: sorted[0].position,
        ahead: e.ahead,
        examples: sorted.slice(0, 3),
      };
    })
    .sort((a, b) => b.keywords - a.keywords || a.avgPosition - b.avgPosition || a.domain.localeCompare(b.domain))
    .slice(0, limit);
  return { checkedKeywords: checked.length, ourKeywords, competitors, gaps: gaps.sort((a, b) => a.keyword.localeCompare(b.keyword)) };
}
