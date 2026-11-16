import { USER_ROLE } from '@rentalshop/constants';
import { resolveAnalyticsOutletFilter } from '@rentalshop/utils/server';
import { aiSummaryAvailable, type SummaryWriter } from './claude';
import { computeWeeklyNumbers, weekHasActivity, type Prisma, type WeeklyNumbers } from './numbers';
import { summarySystemPrompt, summaryUserMessage, type SummaryContent } from './prompt';
import { lastFullWeek, nextWeekStart, type WeekKeys } from './week';

type SummaryCreateData = Parameters<Prisma['aiWeeklySummary']['create']>[0]['data'];
type Db = Parameters<typeof resolveAnalyticsOutletFilter>[0] & Parameters<typeof computeWeeklyNumbers>[1];

/** #1612 whose summary: the whole shop (owner) or one branch (branch manager) */
export interface SummaryScope {
  key: string;
  merchantId: number;
  outletId: number | null;
}

export type SummaryStatus = 'NONE' | 'READY' | 'NO_ORDERS';

export interface WeeklySummaryData {
  /** The API has an AI key; false → the apps hide the button */
  available: boolean;
  week: WeekKeys;
  nextWeekStart: string;
  /** NONE = not opened yet this week (red dot) */
  status: SummaryStatus;
  /** Branch name for a branch manager, null for the whole shop */
  branchName: string | null;
  summary: {
    generatedAt: string;
    language: string | null;
    numbers: WeeklyNumbers | null;
    content: SummaryContent | null;
  } | null;
}

/** MERCHANT → whole shop; OUTLET_ADMIN → own branch; other roles have no summary */
export function summaryScope(
  user: { role: string },
  userScope: { merchantId?: number; outletId?: number }
): SummaryScope | null {
  if (user.role === USER_ROLE.MERCHANT && userScope.merchantId) {
    return { key: `m:${userScope.merchantId}`, merchantId: userScope.merchantId, outletId: null };
  }
  if (user.role === USER_ROLE.OUTLET_ADMIN && userScope.merchantId && userScope.outletId) {
    return { key: `o:${userScope.outletId}`, merchantId: userScope.merchantId, outletId: userScope.outletId };
  }
  return null;
}

interface SummaryRow {
  status: string;
  createdAt: Date;
  language: string | null;
  numbers: unknown;
  content: unknown;
}

async function branchNameOf(prisma: Prisma, scope: SummaryScope): Promise<string | null> {
  if (scope.outletId == null) return null;
  const outlet = await prisma.outlet.findUnique({ where: { id: scope.outletId }, select: { name: true } });
  return outlet?.name ?? null;
}

function toData(
  row: SummaryRow | null,
  week: WeekKeys,
  todayKey: string,
  branchName: string | null
): WeeklySummaryData {
  return {
    available: aiSummaryAvailable(),
    week,
    nextWeekStart: nextWeekStart(todayKey),
    status: row ? (row.status === 'NO_ORDERS' ? 'NO_ORDERS' : 'READY') : 'NONE',
    branchName,
    summary: row
      ? {
          generatedAt: row.createdAt.toISOString(),
          language: row.language,
          numbers: (row.numbers as WeeklyNumbers | null) ?? null,
          content: (row.content as SummaryContent | null) ?? null
        }
      : null
  };
}

function findRow(prisma: Prisma, scope: SummaryScope, week: WeekKeys) {
  return prisma.aiWeeklySummary.findUnique({ where: { scopeKey_weekStart: { scopeKey: scope.key, weekStart: week.start } } });
}

/** GET: the stored summary of last week, never an AI call */
export async function readWeeklySummary(
  prisma: Prisma,
  scope: SummaryScope,
  todayKey: string
): Promise<WeeklySummaryData> {
  const week = lastFullWeek(todayKey);
  const [row, branchName] = await Promise.all([findRow(prisma, scope, week), branchNameOf(prisma, scope)]);
  return toData(row, week, todayKey, branchName);
}

export interface WriteParams {
  scope: SummaryScope;
  user: { role: string };
  userScope: { merchantId?: number; outletId?: number };
  todayKey: string;
  timeZone: string;
  language: string;
}

/** Writes running in this process, by scope and week */
const inFlight = new Map<string, Promise<WeeklySummaryData>>();

/**
 * POST: the stored summary, or write it now (once per scope and week). A week with no activity is stored as
 * NO_ORDERS without AI. Writer errors propagate and nothing is stored, so the next tap retries.
 * A second request for the same scope and week while the first is writing (double tap, React StrictMode running
 * the effect twice, app and web at once) waits for that write instead of calling AI again.
 */
export function writeWeeklySummary(
  prisma: Prisma,
  db: Db,
  writer: SummaryWriter,
  params: WriteParams
): Promise<WeeklySummaryData> {
  const key = `${params.scope.key}|${lastFullWeek(params.todayKey).start}`;
  const running = inFlight.get(key);
  if (running) return running;
  const write = writeOnce(prisma, db, writer, params).finally(() => inFlight.delete(key));
  inFlight.set(key, write);
  return write;
}

async function writeOnce(
  prisma: Prisma,
  db: Db,
  writer: SummaryWriter,
  params: WriteParams
): Promise<WeeklySummaryData> {
  const { scope, user, userScope, todayKey, timeZone, language } = params;
  const week = lastFullWeek(todayKey);
  const branchName = await branchNameOf(prisma, scope);
  const existing = await findRow(prisma, scope, week);
  if (existing) return toData(existing, week, todayKey, branchName);

  const outletFilter = (await resolveAnalyticsOutletFilter(db, user, userScope)) ?? { outletId: -1 };
  let branchOutletIds: number[] | null = null;
  if (scope.outletId == null) {
    const open = await prisma.outlet.findMany({
      where: { merchantId: scope.merchantId, isActive: true },
      select: { id: true },
      orderBy: { id: 'asc' }
    });
    if (open.length >= 2) branchOutletIds = open.map((o) => o.id);
  }
  const numbers = await computeWeeklyNumbers(prisma, db, {
    week,
    todayKey,
    timeZone,
    userRole: user.role,
    outletFilter,
    branchOutletIds,
    productScope: scope.outletId == null ? { merchantId: scope.merchantId } : { outletId: scope.outletId }
  });

  const json = (value: unknown) => value as NonNullable<SummaryCreateData['numbers']>;
  const base = { merchantId: scope.merchantId, outletId: scope.outletId, scopeKey: scope.key, weekStart: week.start };
  let data: SummaryCreateData;
  if (!weekHasActivity(numbers)) {
    data = { ...base, status: 'NO_ORDERS', numbers: json(numbers) };
  } else {
    const shop = await prisma.merchant.findUnique({
      where: { id: scope.merchantId },
      select: { businessType: true, country: true, city: true, currency: true }
    });
    const written = await writer({
      system: summarySystemPrompt(language),
      user: summaryUserMessage(numbers, { ...(shop ?? {}), branchName }, todayKey)
    });
    data = {
      ...base,
      status: 'READY',
      language,
      model: written.model,
      numbers: json(numbers),
      content: json(written.content),
      inputTokens: written.inputTokens,
      outputTokens: written.outputTokens
    };
  }

  try {
    const row = await prisma.aiWeeklySummary.create({ data });
    return toData(row, week, todayKey, branchName);
  } catch (error) {
    // Two taps at once: the other request stored it first
    if ((error as { code?: string } | null)?.code === 'P2002') {
      const row = await findRow(prisma, scope, week);
      if (row) return toData(row, week, todayKey, branchName);
    }
    throw error;
  }
}
