/** Pure grouping of Search Console rows (query × page) into one line per query. */

export type RankingRow = {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  position: number;
};

export type QueryRanking = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  /** Impression-weighted average position, as Search Console reports it. Lower is better. */
  position: number;
  /** Page with the best (lowest) position for this query. */
  bestPage: string;
  pageCount: number;
};

export type QueryRankingWithChange = QueryRanking & {
  previousPosition: number | null;
  /** position − previousPosition: negative = moved up. Null when the query is new. */
  change: number | null;
};

export function groupByQuery(rows: RankingRow[]): QueryRanking[] {
  const map = new Map<string, { rows: RankingRow[] }>();
  for (const row of rows) {
    const entry = map.get(row.query);
    if (entry) entry.rows.push(row);
    else map.set(row.query, { rows: [row] });
  }
  return [...map.entries()].map(([query, { rows: group }]) => {
    const clicks = group.reduce((sum, r) => sum + r.clicks, 0);
    const impressions = group.reduce((sum, r) => sum + r.impressions, 0);
    const weighted = group.reduce((sum, r) => sum + r.position * r.impressions, 0);
    const best = group.reduce((a, b) => (b.position < a.position ? b : a));
    return {
      query,
      clicks,
      impressions,
      ctr: impressions > 0 ? clicks / impressions : 0,
      position: impressions > 0 ? weighted / impressions : best.position,
      bestPage: best.page,
      pageCount: group.length,
    };
  });
}

export function withChange(current: QueryRanking[], previous: QueryRanking[]): QueryRankingWithChange[] {
  const before = new Map(previous.map((r) => [r.query, r.position]));
  return current.map((row) => {
    const previousPosition = before.get(row.query) ?? null;
    return {
      ...row,
      previousPosition,
      change: previousPosition === null ? null : Math.round((row.position - previousPosition) * 10) / 10,
    };
  });
}

export type PageRanking = {
  /** Site path of the page. */
  path: string;
  clicks: number;
  impressions: number;
  ctr: number;
  /** Impression-weighted average position over the page's queries. */
  position: number;
  /** Queries the page showed for. */
  queries: number;
  /** The query that brought the page the most impressions. */
  topQuery: string;
};

const pathOfUrl = (url: string): string => {
  try {
    return (new URL(url).pathname.replace(/\/+$/, "") || "/") as string;
  } catch {
    return url;
  }
};

/** One line per page from the same Search Console rows, most clicks first, then most impressions. */
export function groupByPage(rows: RankingRow[]): PageRanking[] {
  const map = new Map<string, RankingRow[]>();
  for (const row of rows) {
    const path = pathOfUrl(row.page);
    const list = map.get(path);
    if (list) list.push(row);
    else map.set(path, [row]);
  }
  return [...map.entries()]
    .map(([path, group]) => {
      const clicks = group.reduce((s, r) => s + r.clicks, 0);
      const impressions = group.reduce((s, r) => s + r.impressions, 0);
      const weighted = group.reduce((s, r) => s + r.position * r.impressions, 0);
      const top = group.reduce((a, b) => (b.impressions > a.impressions ? b : a));
      return { path, clicks, impressions, ctr: impressions > 0 ? clicks / impressions : 0, position: impressions > 0 ? weighted / impressions : top.position, queries: new Set(group.map((r) => r.query)).size, topQuery: top.query };
    })
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions || a.path.localeCompare(b.path));
}
