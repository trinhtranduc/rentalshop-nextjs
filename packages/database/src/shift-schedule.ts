import { prisma } from './client';

/**
 * #907 Shift templates, weekly rules (ShiftRule) and one-day changes (ShiftDay).
 * Day keys are VN civil days `YYYY-MM-DD` stored as text, so string comparison is date order.
 */

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function listShiftTemplates(merchantId: number, outletId?: number | null) {
  return prisma.shiftTemplate.findMany({
    where: { merchantId, ...(outletId ? { outletId } : {}) },
    orderBy: [{ isActive: 'desc' }, { startTime: 'asc' }, { id: 'asc' }],
  });
}

export async function getShiftTemplate(id: number, merchantId: number) {
  return prisma.shiftTemplate.findFirst({ where: { id, merchantId } });
}

export async function createShiftTemplate(data: {
  merchantId: number;
  outletId: number;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  color: string;
}) {
  return prisma.shiftTemplate.create({ data });
}

export async function updateShiftTemplate(
  id: number,
  data: Partial<{ name: string; startTime: string; endTime: string; breakMinutes: number; color: string; isActive: boolean }>
) {
  return prisma.shiftTemplate.update({ where: { id }, data });
}

export async function deleteShiftTemplate(id: number) {
  return prisma.shiftTemplate.delete({ where: { id } });
}

/** Referenced by any rule, day change or record. */
export async function isShiftTemplateUsed(id: number): Promise<boolean> {
  const [rules, days, records] = await Promise.all([
    prisma.shiftRule.count({ where: { templateId: id } }),
    prisma.shiftDay.count({ where: { templateId: id } }),
    prisma.attendanceRecord.count({ where: { shiftTemplateId: id } }),
  ]);
  return rules + days + records > 0;
}

/** Template ids (of the given list) that are used somewhere. */
export async function usedShiftTemplateIds(ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const [rules, days, records] = await Promise.all([
    prisma.shiftRule.findMany({ where: { templateId: { in: ids } }, select: { templateId: true }, distinct: ['templateId'] }),
    prisma.shiftDay.findMany({ where: { templateId: { in: ids } }, select: { templateId: true }, distinct: ['templateId'] }),
    prisma.attendanceRecord.findMany({
      where: { shiftTemplateId: { in: ids } },
      select: { shiftTemplateId: true },
      distinct: ['shiftTemplateId'],
    }),
  ]);
  const used = new Set<number>();
  rules.forEach((r) => used.add(r.templateId));
  days.forEach((d) => d.templateId != null && used.add(d.templateId));
  records.forEach((r) => r.shiftTemplateId != null && used.add(r.shiftTemplateId));
  return used;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export interface ShiftRuleInput {
  merchantId: number;
  outletId: number;
  userId: number;
  templateId: number;
  weekdays: number[];
  startDate: string;
  endDate: string | null;
  createdById?: number | null;
}

/** Rules of a merchant, optionally one outlet / some users; `activeFrom` drops rules ended before it. */
export async function listShiftRules(filter: {
  merchantId: number;
  outletId?: number | null;
  userIds?: number[];
  activeFrom?: string;
}) {
  return prisma.shiftRule.findMany({
    where: {
      merchantId: filter.merchantId,
      ...(filter.outletId ? { outletId: filter.outletId } : {}),
      ...(filter.userIds ? { userId: { in: filter.userIds } } : {}),
      ...(filter.activeFrom ? { OR: [{ endDate: null }, { endDate: { gte: filter.activeFrom } }] } : {}),
    },
    orderBy: [{ userId: 'asc' }, { startDate: 'asc' }, { id: 'asc' }],
  });
}

export async function getShiftRule(id: number, merchantId: number) {
  return prisma.shiftRule.findFirst({ where: { id, merchantId } });
}

export async function createShiftRules(rows: ShiftRuleInput[]) {
  return prisma.$transaction(rows.map((data) => prisma.shiftRule.create({ data })));
}

export async function updateShiftRule(id: number, data: { endDate?: string | null }) {
  return prisma.shiftRule.update({ where: { id }, data });
}

export async function deleteShiftRule(id: number) {
  return prisma.shiftRule.delete({ where: { id } });
}

/**
 * "Đổi từ ngày …": the old rule ends on `oldEndDate` (removed when that is before its start) and a new
 * rule starts, in one transaction. History stays in the old row.
 */
export async function replaceShiftRule(id: number, oldEndDate: string, next: ShiftRuleInput) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.shiftRule.findUniqueOrThrow({ where: { id } });
    const old =
      oldEndDate < current.startDate
        ? (await tx.shiftRule.delete({ where: { id } }), null)
        : await tx.shiftRule.update({ where: { id }, data: { endDate: oldEndDate } });
    const created = await tx.shiftRule.create({ data: next });
    return { old, created };
  });
}

// ---------------------------------------------------------------------------
// One-day changes
// ---------------------------------------------------------------------------

export async function upsertShiftDay(data: {
  merchantId: number;
  outletId: number;
  userId: number;
  dateKey: string;
  off: boolean;
  templateId: number | null;
  startTime: string | null;
  endTime: string | null;
  breakMinutes: number | null;
  createdById?: number | null;
}) {
  const { userId, dateKey, ...rest } = data;
  return prisma.shiftDay.upsert({
    where: { userId_dateKey: { userId, dateKey } },
    create: data,
    update: rest,
  });
}

export async function deleteShiftDay(userId: number, dateKey: string) {
  const res = await prisma.shiftDay.deleteMany({ where: { userId, dateKey } });
  return res.count;
}

/** Rules, one-day changes and templates needed to compute the schedule of some users over [from, to]. */
export async function getShiftScheduleData(filter: { merchantId: number; userIds: number[]; from: string; to: string }) {
  const [rules, dayChanges, templates] = await Promise.all([
    prisma.shiftRule.findMany({
      where: {
        merchantId: filter.merchantId,
        userId: { in: filter.userIds },
        startDate: { lte: filter.to },
        OR: [{ endDate: null }, { endDate: { gte: filter.from } }],
      },
      orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
    }),
    prisma.shiftDay.findMany({
      where: { merchantId: filter.merchantId, userId: { in: filter.userIds }, dateKey: { gte: filter.from, lte: filter.to } },
    }),
    prisma.shiftTemplate.findMany({ where: { merchantId: filter.merchantId } }),
  ]);
  return { rules, dayChanges, templates };
}

/** `${userId}:${dateKey}` of every day on which the user has an attendance record (locked days). */
export async function workedShiftDays(userIds: number[], from: string, to: string): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await prisma.attendanceRecord.findMany({
    where: { userId: { in: userIds }, dateKey: { gte: from, lte: to } },
    select: { userId: true, dateKey: true },
    distinct: ['userId', 'dateKey'],
  });
  return rows.map((r) => `${r.userId}:${r.dateKey}`);
}
