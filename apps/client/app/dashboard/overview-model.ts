/**
 * Tổng quan (#514): pure mapping from the analytics responses to what the page draws.
 * No React and no clock: callers pass the shop's today key (Vietnam civil day) and a
 * `toDayKey` for ISO instants, so the logic is the same under any machine TZ.
 */

export type OverviewPeriod = 'today' | '7d' | 'month' | 'custom';
export const OVERVIEW_PERIODS: OverviewPeriod[] = ['today', '7d', 'month', 'custom'];

export interface DayRange {
  startDate: string;
  endDate: string;
}

const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDayKey(value: string | null | undefined): value is string {
  if (!value || !KEY_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function keyToUtc(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Calendar arithmetic on `YYYY-MM-DD`; no time zone involved. */
export function addDays(key: string, days: number): string {
  const date = keyToUtc(key);
  date.setUTCDate(date.getUTCDate() + days);
  return utcToKey(date);
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((keyToUtc(toKey).getTime() - keyToUtc(fromKey).getTime()) / 86_400_000);
}

/** Civil-day range of a period. A reversed custom range is swapped; a broken one falls back to today. */
export function periodRange(period: OverviewPeriod, todayKey: string, custom?: { from?: string | null; to?: string | null }): DayRange {
  switch (period) {
    case '7d':
      return { startDate: addDays(todayKey, -6), endDate: todayKey };
    case 'month': {
      const startDate = `${todayKey.slice(0, 7)}-01`;
      const nextMonth = `${addDays(startDate, 31).slice(0, 7)}-01`;
      return { startDate, endDate: addDays(nextMonth, -1) };
    }
    case 'custom': {
      const from = isDayKey(custom?.from) ? custom!.from! : null;
      const to = isDayKey(custom?.to) ? custom!.to! : null;
      if (!from && !to) return { startDate: todayKey, endDate: todayKey };
      const a = from ?? to!;
      const b = to ?? from!;
      return a <= b ? { startDate: a, endDate: b } : { startDate: b, endDate: a };
    }
    case 'today':
    default:
      return { startDate: todayKey, endDate: todayKey };
  }
}

/** The chart needs more than one bar: "Hôm nay" charts the last 7 days. */
export function chartRange(period: OverviewPeriod, range: DayRange): DayRange {
  if (range.startDate === range.endDate) return { startDate: addDays(range.endDate, -6), endDate: range.endDate };
  return range;
}

/** "T3 06/10" from a day key; `weekdays` is Sunday-first (CN, T2 … T7 in Vietnamese). */
export function formatDayLabel(key: string, weekdays: string[]): string {
  if (!isDayKey(key)) return '';
  const date = keyToUtc(key);
  return `${weekdays[date.getUTCDay()] ?? ''} ${key.slice(8, 10)}/${key.slice(5, 7)}`.trim();
}

export function formatRangeLabel(range: DayRange, weekdays: string[]): string {
  const start = formatDayLabel(range.startDate, weekdays);
  return range.startDate === range.endDate ? start : `${start} – ${formatDayLabel(range.endDate, weekdays)}`;
}

// ----------------------------------------------------------------------------
// KPIs (GET /api/analytics/period)
// ----------------------------------------------------------------------------

type Num = number | null | undefined;

export interface PeriodReportLike {
  operational?: { orderCounts?: { new?: Num } | null } | null;
  revenue?: {
    totalOrderValue?: Num;
    outstanding?: Num;
    outstandingBreakdown?: {
      atPickup?: { amount?: Num; orders?: Num } | null;
      overduePickup?: { amount?: Num; orders?: Num } | null;
    } | null;
    collected?: Num;
    collectedBreakdown?: { deposits?: Num; pickupAndSale?: Num; fees?: Num; refunds?: Num } | null;
    collateralFlow?: { received?: Num; returned?: Num } | null;
  } | null;
  growth?: {
    collected?: { growth?: Num } | null;
    orderValue?: { growth?: Num } | null;
  } | null;
  series?: SeriesPointLike[] | null;
  topProducts?: TopProductLike[] | null;
}

export interface SeriesPointLike {
  month?: string;
  date?: string;
  dateISO?: string;
  realIncome?: Num;
  collected?: Num;
  orderCount?: Num;
  newOrderCount?: Num;
  /** Expected collections still to come that day (#604 follow-up). Absent until the API sends it. */
  forecast?: Num;
  /** The API's name for `forecast` (#605): GET /api/analytics/period `series[].expectedCollected` */
  expectedCollected?: Num;
}

/** Forecast of a series point: `forecast`, else the API's `expectedCollected` (#605) */
const forecastOf = (p: SeriesPointLike | undefined): number => Math.max(0, num(p?.forecast) ?? num(p?.expectedCollected) ?? 0);

export interface TopProductLike {
  id: number | string;
  name: string;
  rentalCount?: Num;
  totalRevenue?: Num;
  image?: string | null;
}

export type Growth = { kind: 'none' } | { kind: 'new' } | { kind: 'pct'; value: number; up: boolean };

const num = (v: Num): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Same rule as the old page (#350): 1000%+ means the previous period was (almost) empty. */
export function toGrowth(value: Num): Growth {
  const v = num(value);
  if (v == null || v === 0) return { kind: 'none' };
  if (Math.abs(v) >= 1000) return { kind: 'new' };
  return { kind: 'pct', value: Math.round(Math.abs(v)), up: v > 0 };
}

export interface OverviewKpis {
  orderValue: number | null;
  orderValueGrowth: Growth;
  newOrders: number | null;
  collected: number | null;
  collectedGrowth: Growth;
  outstanding: number | null;
  overduePickup: number;
  /** Collected + collateral received − collateral returned */
  netReceived: number | null;
}

export function buildKpis(report: PeriodReportLike | null | undefined): OverviewKpis {
  const revenue = report?.revenue ?? null;
  const collected = num(revenue?.collected);
  const flow = revenue?.collateralFlow;
  const received = num(flow?.received);
  const returned = num(flow?.returned);
  return {
    orderValue: num(revenue?.totalOrderValue),
    orderValueGrowth: toGrowth(report?.growth?.orderValue?.growth),
    newOrders: num(report?.operational?.orderCounts?.new),
    collected,
    collectedGrowth: toGrowth(report?.growth?.collected?.growth),
    outstanding: num(revenue?.outstanding),
    overduePickup: num(revenue?.outstandingBreakdown?.overduePickup?.amount) ?? 0,
    netReceived: collected != null && received != null ? collected + received - (returned ?? 0) : null,
  };
}

export interface MoneyBreakdown {
  collected: { deposits: number; pickupAndSale: number; fees: number; refunds: number; total: number } | null;
  outstanding: {
    atPickup: { amount: number; orders: number };
    overduePickup: { amount: number; orders: number };
    total: number;
  } | null;
  collateral: { received: number; returned: number } | null;
}

export function buildMoney(report: PeriodReportLike | null | undefined): MoneyBreakdown {
  const revenue = report?.revenue ?? null;
  const cb = revenue?.collectedBreakdown;
  const ob = revenue?.outstandingBreakdown;
  const flow = revenue?.collateralFlow;
  const amt = (v: Num) => num(v) ?? 0;
  return {
    collected: cb
      ? {
          deposits: amt(cb.deposits),
          pickupAndSale: amt(cb.pickupAndSale),
          fees: amt(cb.fees),
          refunds: amt(cb.refunds),
          total: num(revenue?.collected) ?? amt(cb.deposits) + amt(cb.pickupAndSale) + amt(cb.fees) - amt(cb.refunds),
        }
      : null,
    outstanding: ob
      ? {
          atPickup: { amount: amt(ob.atPickup?.amount), orders: amt(ob.atPickup?.orders) },
          overduePickup: { amount: amt(ob.overduePickup?.amount), orders: amt(ob.overduePickup?.orders) },
          total: num(revenue?.outstanding) ?? amt(ob.atPickup?.amount) + amt(ob.overduePickup?.amount),
        }
      : null,
    collateral: flow ? { received: amt(flow.received), returned: amt(flow.returned) } : null,
  };
}

// ----------------------------------------------------------------------------
// Chart
// ----------------------------------------------------------------------------

export type ChartMode = 'collected' | 'orders';

export interface ChartBar {
  key: string;
  /** Day key for day buckets, `MM/YY` for month buckets */
  label: string;
  value: number;
  /** Expected still to come (collected mode only; 0 when the API sends none) */
  forecast: number;
  /** 0–1 of the tallest bar (value + forecast) */
  ratio: number;
  /** 0–1 of the tallest bar, forecast part only */
  forecastRatio: number;
  current: boolean;
  /** This bar is the shop's today (the "Hôm nay" marker) */
  isToday: boolean;
}

/** `YYYY/MM/DD` (income series) or `YYYY-MM-DDT…Z` (dateISO) → `YYYY-MM-DD`. */
function seriesDayKey(point: SeriesPointLike): string | null {
  const fromDate = point.date?.replace(/\//g, '-');
  if (isDayKey(fromDate)) return fromDate!;
  const fromIso = point.dateISO?.slice(0, 10);
  return isDayKey(fromIso) ? fromIso! : null;
}

/**
 * Bars for the chart. `currentKey` (the shop's today) is highlighted when it is in the series,
 * otherwise the last bar. Long ranges get `dd/MM` labels without the weekday.
 */
export function chartBars(
  series: SeriesPointLike[] | null | undefined,
  mode: ChartMode,
  weekdays: string[],
  currentKey?: string,
): ChartBar[] {
  const points = series ?? [];
  const values = points.map((p) =>
    mode === 'collected' ? num(p.collected) ?? num(p.realIncome) ?? 0 : num(p.newOrderCount) ?? num(p.orderCount) ?? 0,
  );
  const forecasts = points.map((p) => (mode === 'collected' ? forecastOf(p) : 0));
  const max = Math.max(0, ...values.map((v, i) => v + forecasts[i]));
  const days = points.map(seriesDayKey);
  const currentIndex = currentKey && days.includes(currentKey) ? days.indexOf(currentKey) : points.length - 1;
  const short = points.length > 14;
  return points.map((p, i) => {
    const day = days[i];
    return {
      key: day ?? p.month ?? String(i),
      label: day ? (short ? `${day.slice(8, 10)}/${day.slice(5, 7)}` : formatDayLabel(day, weekdays)) : p.month ?? '',
      value: values[i],
      forecast: forecasts[i],
      ratio: max > 0 ? (values[i] + forecasts[i]) / max : 0,
      forecastRatio: max > 0 ? forecasts[i] / max : 0,
      current: i === currentIndex,
      isToday: !!currentKey && day === currentKey,
    };
  });
}

/**
 * The Thực thu tile's collected/forecast bar: shown only when the series carries a forecast for today.
 * `pct` is the collected share of collected + forecast.
 */
export function forecastBar(
  collected: number | null,
  series: SeriesPointLike[] | null | undefined,
  todayKey: string,
): { collected: number; forecast: number; pct: number } | null {
  const point = (series ?? []).find((p) => seriesDayKey(p) === todayKey);
  const forecast = forecastOf(point);
  if (collected == null || forecast <= 0) return null;
  const done = Math.max(0, collected);
  return { collected, forecast, pct: (done / (done + forecast)) * 100 };
}

// ----------------------------------------------------------------------------
// Today (GET /api/analytics/outlet-operations)
// ----------------------------------------------------------------------------

export interface OpsOrderLike {
  id: number;
  orderNumber: string;
  customerName: string | null;
  pickupPlanAt: string | null;
  returnPlanAt: string | null;
  isReadyToDeliver: boolean;
  amountDue?: number;
  refundDue?: number;
  lateDays?: number;
  daysOverdue?: number;
}

interface OpsListLike {
  count: number;
  orders: OpsOrderLike[];
}

export interface OutletOpsLike {
  date: string;
  pickupsToday: OpsListLike;
  returnsToday: OpsListLike;
  overdueReturns: OpsListLike;
  noShows: OpsListLike;
  doneToday: { pickups: number; returns: number };
  tomorrow?: { pickups: number; returns: number } | null;
  tomorrowPickups?: OpsListLike | null;
  tomorrowReturns?: OpsListLike | null;
  cash?: {
    collateralToCollect?: { securityDeposit: number; orders: number };
    collateralToReturn?: { securityDeposit: number; orders: number };
  } | null;
}

export interface TodayWork {
  dateKey: string;
  pickups: { left: number; done: number; total: number };
  returns: { left: number; done: number; total: number };
  overdueReturns: number;
  noShows: number;
  tomorrow: { dateKey: string; pickups: number; returns: number } | null;
}

export function buildTodayWork(ops: OutletOpsLike): TodayWork {
  const tomorrow = ops.tomorrow
    ? ops.tomorrow
    : ops.tomorrowPickups || ops.tomorrowReturns
      ? { pickups: ops.tomorrowPickups?.count ?? 0, returns: ops.tomorrowReturns?.count ?? 0 }
      : null;
  return {
    dateKey: ops.date,
    pickups: { left: ops.pickupsToday.count, done: ops.doneToday.pickups, total: ops.pickupsToday.count + ops.doneToday.pickups },
    returns: { left: ops.returnsToday.count, done: ops.doneToday.returns, total: ops.returnsToday.count + ops.doneToday.returns },
    overdueReturns: ops.overdueReturns.count,
    noShows: ops.noShows.count,
    tomorrow: tomorrow && isDayKey(ops.date) ? { dateKey: addDays(ops.date, 1), ...tomorrow } : null,
  };
}

export type TodayRowKind = 'pickup' | 'return';

export interface TodayRow {
  id: number;
  orderNumber: string;
  kind: TodayRowKind;
  customerName: string;
  pickupKey: string | null;
  returnKey: string | null;
  /** Late return: days past the planned return */
  lateDays: number;
  notPrepared: boolean;
  money: { kind: 'collect' | 'refund' | 'fee'; amount: number } | null;
}

/**
 * Today's pickups, then today's and overdue returns (late ones last), each order once.
 * `toDayKey` turns an ISO instant into its Vietnam civil day.
 */
export function buildTodayRows(ops: OutletOpsLike, toDayKey: (iso: string) => string): TodayRow[] {
  const seen = new Set<number>();
  const rows: TodayRow[] = [];
  const day = (iso: string | null) => (iso ? toDayKey(iso) || null : null);
  const push = (order: OpsOrderLike, kind: TodayRowKind, late: boolean) => {
    if (seen.has(order.id)) return;
    seen.add(order.id);
    const due = order.amountDue ?? 0;
    const refund = order.refundDue ?? 0;
    let money: TodayRow['money'] = null;
    if (kind === 'pickup') money = due > 0 ? { kind: 'collect', amount: due } : null;
    else if (due > 0) money = { kind: 'fee', amount: due };
    else if (refund > 0) money = { kind: 'refund', amount: refund };
    rows.push({
      id: order.id,
      orderNumber: order.orderNumber,
      kind,
      customerName: order.customerName ?? '',
      pickupKey: day(order.pickupPlanAt),
      returnKey: day(order.returnPlanAt),
      lateDays: late ? Math.max(order.lateDays ?? 0, order.daysOverdue ?? 0) : 0,
      notPrepared: kind === 'pickup' && !order.isReadyToDeliver,
      money,
    });
  };
  ops.pickupsToday.orders.forEach((o) => push(o, 'pickup', false));
  ops.returnsToday.orders.forEach((o) => push(o, 'return', false));
  ops.overdueReturns.orders.forEach((o) => push(o, 'return', true));
  return rows;
}

/** 0–100 for the progress bars. */
export function progressPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(done, total) / total) * 100);
}

// ----------------------------------------------------------------------------
// Tiles, sparklines and detail drawers (#604)
// ----------------------------------------------------------------------------

export type DetailKind = 'orderValue' | 'collected' | 'outstanding' | 'collateral';
export const DETAIL_KINDS: DetailKind[] = ['orderValue', 'collected', 'outstanding', 'collateral'];

/** `?detail=` → drawer kind; anything else means no drawer. */
export function parseDetail(value: string | null | undefined): DetailKind | null {
  return value && (DETAIL_KINDS as string[]).includes(value) ? (value as DetailKind) : null;
}

export type ChipTone = 'up' | 'down' | 'warn' | 'info';

/** A status chip as an i18n key (`home.tiles.*` or `home.kpi.new`) plus its values. */
export interface TileChip {
  tone: ChipTone;
  key: string;
  values?: Record<string, number>;
}

export interface Tile {
  kind: DetailKind;
  value: number | null;
  /** Show a leading `+` for a positive value (net collateral). */
  signed: boolean;
  chip: TileChip | null;
}

export function growthChip(growth: Growth): TileChip | null {
  if (growth.kind === 'none') return null;
  if (growth.kind === 'new') return { tone: 'up', key: 'home.kpi.new' };
  return { tone: growth.up ? 'up' : 'down', key: growth.up ? 'home.tiles.up' : 'home.tiles.down', values: { value: growth.value } };
}

export interface CashLike {
  depositsHeld?: { securityDeposit?: number; orders?: number } | null;
  collateralToCollect?: { securityDeposit: number; orders: number } | null;
  collateralToReturn?: { securityDeposit: number; orders: number } | null;
}

/**
 * The four tiles, in display order. Thế chân is the period's net: received − returned.
 * Chips only say what the data supports: growth %, overdue/waiting pickups, orders whose collateral is held now.
 */
export function buildTiles(report: PeriodReportLike | null | undefined, cash?: CashLike | null): Tile[] {
  const kpis = buildKpis(report);
  const parts = buildMoney(report);
  const out = parts.outstanding;
  let outstandingChip: TileChip | null = null;
  if (out && out.overduePickup.orders > 0) {
    outstandingChip = { tone: 'warn', key: 'home.tiles.overdue', values: { count: out.overduePickup.orders } };
  } else if (out && out.atPickup.orders > 0) {
    outstandingChip = { tone: 'info', key: 'home.tiles.waiting', values: { count: out.atPickup.orders } };
  }
  const held = cash?.depositsHeld?.orders;
  return [
    { kind: 'orderValue', value: kpis.orderValue, signed: false, chip: growthChip(kpis.orderValueGrowth) },
    { kind: 'collected', value: kpis.collected, signed: false, chip: growthChip(kpis.collectedGrowth) },
    { kind: 'outstanding', value: kpis.outstanding, signed: false, chip: outstandingChip },
    {
      kind: 'collateral',
      value: parts.collateral ? parts.collateral.received - parts.collateral.returned : null,
      signed: true,
      chip: typeof held === 'number' && held > 0 ? { tone: 'info', key: 'home.tiles.held', values: { count: held } } : null,
    },
  ];
}

/**
 * SVG polyline points for a sparkline in a `width`×`height` box (2 px inset).
 * Null under two points: one value is not a trend. A flat series draws a flat line in the middle.
 */
export function sparkPoints(values: number[], width = 96, height = 28): string | null {
  const vals = values.filter((v) => Number.isFinite(v));
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const inset = 2;
  const span = height - inset * 2;
  return vals
    .map((v, i) => {
      const x = (i * width) / (vals.length - 1);
      const y = max === min ? height / 2 : inset + span - ((v - min) / (max - min)) * span;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export type WaterfallKey = 'deposits' | 'pickupAndSale' | 'fees' | 'refunds' | 'total';

export interface WaterfallRow {
  key: WaterfallKey;
  /** Signed contribution; the total row carries the total. */
  amount: number;
  /** Bar position, 0–100 of the track. */
  left: number;
  width: number;
  negative: boolean;
  total: boolean;
}

/** Thực thu as a waterfall: three additions, minus refunds, = total. Handles a negative total. */
export function waterfallRows(collected: MoneyBreakdown['collected']): WaterfallRow[] {
  if (!collected) return [];
  const steps: Array<{ key: WaterfallKey; amount: number }> = [
    { key: 'deposits', amount: collected.deposits },
    { key: 'pickupAndSale', amount: collected.pickupAndSale },
    { key: 'fees', amount: collected.fees },
    { key: 'refunds', amount: -collected.refunds },
  ];
  const spans: Array<{ key: WaterfallKey; amount: number; from: number; to: number; total: boolean }> = [];
  let run = 0;
  for (const s of steps) {
    spans.push({ ...s, from: run, to: run + s.amount, total: false });
    run += s.amount;
  }
  spans.push({ key: 'total', amount: collected.total, from: 0, to: collected.total, total: true });
  const lo = Math.min(0, ...spans.map((s) => Math.min(s.from, s.to)));
  const hi = Math.max(0, ...spans.map((s) => Math.max(s.from, s.to)));
  const range = hi - lo || 1;
  return spans.map((s) => ({
    key: s.key,
    amount: s.amount,
    left: ((Math.min(s.from, s.to) - lo) / range) * 100,
    width: (Math.abs(s.to - s.from) / range) * 100,
    negative: s.amount < 0,
    total: s.total,
  }));
}

export interface SplitPart {
  amount: number;
  orders: number;
  /** Share of the bar, 0–100 */
  pct: number;
}

/** Còn phải thu as one stacked bar: waiting for pickup vs overdue pickup. */
export function outstandingSplit(outstanding: MoneyBreakdown['outstanding']): { atPickup: SplitPart; overdue: SplitPart } | null {
  if (!outstanding) return null;
  const a = Math.max(0, outstanding.atPickup.amount);
  const o = Math.max(0, outstanding.overduePickup.amount);
  const sum = a + o;
  return {
    atPickup: { ...outstanding.atPickup, pct: sum > 0 ? (a / sum) * 100 : 0 },
    overdue: { ...outstanding.overduePickup, pct: sum > 0 ? (o / sum) * 100 : 0 },
  };
}

export type CollateralKey = 'received' | 'returned' | 'toCollect' | 'toReturn';

export interface CollateralRow {
  key: CollateralKey;
  amount: number;
  orders: number | null;
  /** Hatched: not in the period's numbers yet */
  upcoming: boolean;
  /** 0–100 of the largest row */
  width: number;
}

/** Thế chân: received / returned in the period, then the upcoming ones from today's cash (when known). */
export function collateralRows(collateral: MoneyBreakdown['collateral'], cash?: CashLike | null): CollateralRow[] {
  const rows: Array<Omit<CollateralRow, 'width'>> = [];
  if (collateral) {
    rows.push({ key: 'received', amount: collateral.received, orders: null, upcoming: false });
    rows.push({ key: 'returned', amount: collateral.returned, orders: null, upcoming: false });
  }
  if (cash?.collateralToCollect) {
    rows.push({ key: 'toCollect', amount: cash.collateralToCollect.securityDeposit, orders: cash.collateralToCollect.orders, upcoming: true });
  }
  if (cash?.collateralToReturn) {
    rows.push({ key: 'toReturn', amount: cash.collateralToReturn.securityDeposit, orders: cash.collateralToReturn.orders, upcoming: true });
  }
  const max = Math.max(0, ...rows.map((r) => Math.abs(r.amount)));
  return rows.map((r) => ({ ...r, width: max > 0 ? (Math.abs(r.amount) / max) * 100 : 0 }));
}

/** "Nguyễn Thị Lan" → "NL"; one word → its first letter; empty → "#". */
export function initials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '#';
  const first = Array.from(words[0])[0] ?? '';
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] ?? '' : '';
  return (first + last).toUpperCase();
}

export interface TopBar {
  id: number | string;
  name: string;
  rentals: number;
  value: number;
  /** 0–100 of the highest value in the list */
  width: number;
}

/** Top products as bars, in the API's order (by order value), at most `limit`. */
export function topBars(products: TopProductLike[] | null | undefined, limit = 5): TopBar[] {
  const list = (products ?? []).slice(0, limit);
  const max = Math.max(0, ...list.map((p) => num(p.totalRevenue) ?? 0));
  return list.map((p) => {
    const value = num(p.totalRevenue) ?? 0;
    return { id: p.id, name: p.name, rentals: num(p.rentalCount) ?? 0, value, width: max > 0 ? (Math.max(0, value) / max) * 100 : 0 };
  });
}
