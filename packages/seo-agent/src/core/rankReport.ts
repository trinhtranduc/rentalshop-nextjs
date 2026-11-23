import type { QueryRanking } from "./rankings";

/** Weekly or monthly ranking movement of the site, from two Search Console snapshots of the same length. Pure. */

export type RankPeriod = "week" | "month";
export const RANK_PERIOD_DAYS: Record<RankPeriod, number> = { week: 7, month: 28 };

/** A move smaller than this many positions counts as unchanged (Search Console averages wobble). */
export const MOVE_THRESHOLD = 1;
/** Keywords below this many impressions in both periods are left out of the mover lists. */
export const MIN_IMPRESSIONS = 5;

export type RankMover = { query: string; position: number | null; previousPosition: number | null; change: number | null; impressions: number; watched: boolean };

export type RankTotals = { keywords: number; clicks: number; impressions: number; position: number | null; top10: number };

export type RankReport = {
  period: RankPeriod;
  range: { start: string; end: string };
  previousRange: { start: string; end: string } | null;
  totals: RankTotals;
  previousTotals: RankTotals | null;
  /** Keywords present in both periods. */
  up: number;
  down: number;
  same: number;
  fresh: number;
  lost: number;
  /** Site-wide direction by impression-weighted average position; null without a previous period. */
  verdict: "up" | "down" | "flat" | null;
  topUp: RankMover[];
  topDown: RankMover[];
  newKeywords: RankMover[];
  lostKeywords: RankMover[];
  /** Every target keyword that has a position now, most impressions first. */
  watchedKeywords: RankMover[];
  /** Movement of the owner's target keywords only. */
  watched: { total: number; ranking: number; up: number; down: number };
};

const round1 = (n: number) => Math.round(n * 10) / 10;

function totalsOf(rows: QueryRanking[]): RankTotals {
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const weighted = rows.reduce((s, r) => s + r.position * r.impressions, 0);
  return {
    keywords: rows.length,
    clicks: rows.reduce((s, r) => s + r.clicks, 0),
    impressions,
    position: impressions > 0 ? round1(weighted / impressions) : null,
    top10: rows.filter((r) => r.position <= 10).length,
  };
}

export function buildRankReport(input: {
  period: RankPeriod;
  range: { start: string; end: string };
  previousRange: { start: string; end: string } | null;
  current: QueryRanking[];
  previous: QueryRanking[] | null;
  /** Normalised target keywords. */
  watchlist: string[];
  limit?: number;
}): RankReport {
  const limit = input.limit ?? 5;
  const watch = new Set(input.watchlist);
  const now = new Map(input.current.map((r) => [r.query, r]));
  const before = new Map((input.previous ?? []).map((r) => [r.query, r]));
  const totals = totalsOf(input.current);
  const base: Pick<RankReport, "period" | "range" | "totals"> = { period: input.period, range: input.range, totals };
  const ranking = input.watchlist.filter((k) => now.has(k)).length;

  if (!input.previous || !input.previousRange) {
    return { ...base, previousRange: null, previousTotals: null, up: 0, down: 0, same: 0, fresh: 0, lost: 0, verdict: null, topUp: [], topDown: [], newKeywords: [], lostKeywords: [], watchedKeywords: input.current.filter((r) => watch.has(r.query)).sort((a, b) => b.impressions - a.impressions).slice(0, 40).map((r) => ({ query: r.query, position: round1(r.position), previousPosition: null, change: null, impressions: r.impressions, watched: true })), watched: { total: watch.size, ranking, up: 0, down: 0 } };
  }

  const moved: RankMover[] = [];
  const fresh: RankMover[] = [];
  for (const row of input.current) {
    const prev = before.get(row.query);
    const mover = { query: row.query, position: round1(row.position), impressions: row.impressions, watched: watch.has(row.query) };
    if (!prev) fresh.push({ ...mover, previousPosition: null, change: null });
    else moved.push({ ...mover, previousPosition: round1(prev.position), change: round1(row.position - prev.position), impressions: Math.max(row.impressions, prev.impressions) });
  }
  const lost: RankMover[] = [...before.values()]
    .filter((r) => !now.has(r.query))
    .map((r) => ({ query: r.query, position: null, previousPosition: round1(r.position), change: null, impressions: r.impressions, watched: watch.has(r.query) }));

  const isUp = (m: RankMover) => (m.change ?? 0) <= -MOVE_THRESHOLD;
  const isDown = (m: RankMover) => (m.change ?? 0) >= MOVE_THRESHOLD;
  const seen = (m: RankMover) => m.impressions >= MIN_IMPRESSIONS;
  const byImpressions = (a: RankMover, b: RankMover) => b.impressions - a.impressions;
  const previousTotals = totalsOf(input.previous);
  const delta = totals.position !== null && previousTotals.position !== null ? totals.position - previousTotals.position : null;

  return {
    ...base,
    previousRange: input.previousRange,
    previousTotals,
    up: moved.filter(isUp).length,
    down: moved.filter(isDown).length,
    same: moved.filter((m) => !isUp(m) && !isDown(m)).length,
    fresh: fresh.length,
    lost: lost.length,
    verdict: delta === null ? null : delta <= -0.5 ? "up" : delta >= 0.5 ? "down" : "flat",
    topUp: moved.filter((m) => isUp(m) && seen(m)).sort((a, b) => (a.change ?? 0) - (b.change ?? 0)).slice(0, limit),
    topDown: moved.filter((m) => isDown(m) && seen(m)).sort((a, b) => (b.change ?? 0) - (a.change ?? 0)).slice(0, limit),
    newKeywords: fresh.filter(seen).sort(byImpressions).slice(0, limit),
    lostKeywords: lost.filter(seen).sort(byImpressions).slice(0, limit),
    watchedKeywords: [...moved, ...fresh].filter((m) => m.watched).sort(byImpressions).slice(0, 40),
    watched: { total: watch.size, ranking, up: moved.filter((m) => m.watched && isUp(m)).length, down: moved.filter((m) => m.watched && isDown(m)).length },
  };
}

const day = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const num = (n: number) => n.toLocaleString("vi-VN");
const pos = (n: number | null) => (n === null ? "—" : n.toFixed(1));
const signed = (now: number, before: number) => (now === before ? "không đổi" : `${now > before ? "+" : "−"}${num(Math.abs(now - before))}`);

/** The report as one Telegram message. Position: a lower number is better, so "lên" means the number went down. */
export function rankReportText(report: RankReport, siteUrl: string): string {
  const title = `Thứ hạng ${report.period === "week" ? "tuần" : "tháng"} (${day(report.range.start)} – ${day(report.range.end)})`;
  const t = report.totals;
  const link = `Chi tiết: ${siteUrl.replace(/\/+$/, "")}/admin/seo-rankings`;
  if (!report.previousTotals || !report.previousRange) {
    return [title, "", `${num(t.keywords)} từ khoá có hiển thị · ${num(t.clicks)} lượt bấm · ${num(t.impressions)} lượt hiển thị · vị trí trung bình ${pos(t.position)}`, "Chưa có kỳ trước cùng độ dài để so sánh.", "", link].join("\n");
  }
  const p = report.previousTotals;
  const verdict = report.verdict === "up" ? "Site đang LÊN" : report.verdict === "down" ? "Site đang TỤT" : "Site đi ngang";
  const list = (label: string, rows: RankReport["topUp"], line: (m: RankReport["topUp"][number]) => string) => (rows.length === 0 ? [] : ["", label, ...rows.map((m) => `• ${m.watched ? "★ " : ""}${m.query}: ${line(m)}`)]);
  return [
    title,
    `So với ${day(report.previousRange.start)} – ${day(report.previousRange.end)}`,
    "",
    `${verdict}: vị trí trung bình ${pos(p.position)} → ${pos(t.position)}`,
    `Lượt bấm ${num(t.clicks)} (${signed(t.clicks, p.clicks)}) · hiển thị ${num(t.impressions)} (${signed(t.impressions, p.impressions)})`,
    `Từ khoá trong top 10: ${num(t.top10)} (${signed(t.top10, p.top10)})`,
    `Lên hạng ${num(report.up)} · tụt hạng ${num(report.down)} · đứng yên ${num(report.same)} · mới ${num(report.fresh)} · mất ${num(report.lost)}`,
    `Từ khoá mục tiêu: ${num(report.watched.ranking)}/${num(report.watched.total)} có hạng · lên ${num(report.watched.up)} · tụt ${num(report.watched.down)}`,
    ...list("Lên mạnh nhất", report.topUp, (m) => `${pos(m.previousPosition)} → ${pos(m.position)}`),
    ...list("Tụt mạnh nhất", report.topDown, (m) => `${pos(m.previousPosition)} → ${pos(m.position)}`),
    ...list("Mới xuất hiện", report.newKeywords, (m) => `vị trí ${pos(m.position)}`),
    ...list("Không còn hiển thị", report.lostKeywords, (m) => `trước ở vị trí ${pos(m.previousPosition)}`),
    "",
    "★ = từ khoá mục tiêu",
    link,
  ].join("\n");
}
