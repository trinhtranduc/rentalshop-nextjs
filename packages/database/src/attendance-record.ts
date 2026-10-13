import { Prisma } from '@prisma/client';
import { prisma } from './client';

/**
 * #907 Attendance records (IN/OUT pairs), scans (every punch attempt), manual edits and month locks.
 */

export interface AttendanceScanInput {
  merchantId: number;
  outletId: number | null;
  userId: number;
  at: Date;
  action: 'IN' | 'OUT' | null;
  result: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceM: number | null;
  recordId?: number | null;
  /** #949 QR_WRONG_OUTLET: the outlet of the scanned code (this merchant only); `outletId` is the scanner's */
  qrOutletId?: number | null;
}

export async function createAttendanceScan(data: AttendanceScanInput) {
  return prisma.attendanceScan.create({ data });
}

/** Last accepted punches of an outlet since `since` (kiosk screen), first name only. */
export async function recentAttendancePunches(outletId: number, since: Date, limit: number) {
  const rows = await prisma.attendanceScan.findMany({
    where: { outletId, result: 'ACCEPTED', at: { gte: since } },
    orderBy: { at: 'desc' },
    take: limit,
    select: { at: true, action: true, user: { select: { firstName: true } } },
  });
  return rows.map((r) => ({ at: r.at, action: r.action, firstName: r.user.firstName }));
}

/**
 * Lazy auto-close (no cron): every OPEN record whose close time has passed becomes MISSING_OUT,
 * checkOutAt stays null and autoClosedAt is its close time. One updateMany (+ a column copy).
 */
export async function autoCloseOverdueAttendance(
  scope: { userId?: number; outletId?: number },
  now: Date,
  client: Pick<Prisma.TransactionClient, '$executeRaw' | 'attendanceRecord'> = prisma
) {
  // The instant comparison goes through Prisma (closeAt is `timestamp without time zone` in UTC; a raw
  // timestamptz parameter would be read in the database session's time zone and shift by hours).
  const res = await client.attendanceRecord.updateMany({
    where: { ...scope, status: 'OPEN', closeAt: { lte: now } },
    data: { status: 'MISSING_OUT' },
  });
  if (res.count > 0) {
    const filter =
      scope.userId != null
        ? Prisma.sql`AND "userId" = ${scope.userId}`
        : scope.outletId != null
          ? Prisma.sql`AND "outletId" = ${scope.outletId}`
          : Prisma.empty;
    // autoClosedAt = the record's own close time (column copy, no time parameter); checkOutAt stays null (0 h)
    await client.$executeRaw`UPDATE "AttendanceRecord" SET "autoClosedAt" = "closeAt"
      WHERE "status" = 'MISSING_OUT' AND "autoClosedAt" IS NULL AND "closeAt" IS NOT NULL ${filter}`;
  }
  return res.count;
}

export async function findOpenAttendanceRecord(userId: number) {
  return prisma.attendanceRecord.findFirst({ where: { userId, status: 'OPEN' }, orderBy: { checkInAt: 'desc' } });
}

export async function lastAttendanceRecord(userId: number) {
  return prisma.attendanceRecord.findFirst({ where: { userId }, orderBy: { checkInAt: 'desc' } });
}

export interface PunchPlanIn {
  dateKey: string;
  shiftTemplateId: number | null;
  shiftName: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  shiftBreak: number | null;
  closeAt: Date;
}

export interface PunchInput {
  merchantId: number;
  outletId: number;
  userId: number;
  now: Date;
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceM: number;
  /** Record fields used when the punch opens a new record (IN) */
  inPlan: PunchPlanIn;
  /** Suspected-fake reasons given the user's previous accepted scan */
  suspect: (prev: { latitude: number; longitude: number; accuracy: number; at: Date } | null) => string[];
}

/**
 * One accepted punch. Serialized per user (row lock on the user), so two quick taps cannot open two
 * records. Closes the open record (OUT) or opens one (IN), and writes the ACCEPTED scan row.
 */
export async function punchAttendance(input: PunchInput) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id = ${input.userId} FOR UPDATE`);
    await autoCloseOverdueAttendance({ userId: input.userId }, input.now, tx);

    const prev = await tx.attendanceScan.findFirst({
      where: { userId: input.userId, result: 'ACCEPTED' },
      orderBy: { at: 'desc' },
      select: { latitude: true, longitude: true, accuracy: true, at: true },
    });
    const reasons = input.suspect(prev);
    const open = await tx.attendanceRecord.findFirst({
      where: { userId: input.userId, status: 'OPEN' },
      orderBy: { checkInAt: 'desc' },
    });

    let action: 'IN' | 'OUT';
    let record;
    if (open) {
      action = 'OUT';
      const merged = [...new Set([...(open.suspectReasons || []), ...reasons])];
      record = await tx.attendanceRecord.update({
        where: { id: open.id },
        data: {
          checkOutAt: input.now,
          status: 'DONE',
          outLatitude: input.latitude,
          outLongitude: input.longitude,
          outAccuracy: input.accuracy,
          outDistanceM: input.distanceM,
          suspectedFake: merged.length > 0,
          suspectReasons: merged,
        },
      });
    } else {
      action = 'IN';
      record = await tx.attendanceRecord.create({
        data: {
          merchantId: input.merchantId,
          outletId: input.outletId,
          userId: input.userId,
          ...input.inPlan,
          checkInAt: input.now,
          status: 'OPEN',
          inLatitude: input.latitude,
          inLongitude: input.longitude,
          inAccuracy: input.accuracy,
          inDistanceM: input.distanceM,
          suspectedFake: reasons.length > 0,
          suspectReasons: reasons,
          source: 'PUNCH',
        },
      });
    }

    await tx.attendanceScan.create({
      data: {
        merchantId: input.merchantId,
        outletId: input.outletId,
        userId: input.userId,
        at: input.now,
        action,
        result: 'ACCEPTED',
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        distanceM: input.distanceM,
        recordId: record.id,
      },
    });
    return { action, record };
  });
}

export async function listAttendanceRecords(filter: { outletId: number; from: string; to: string; userId?: number }) {
  return prisma.attendanceRecord.findMany({
    where: {
      outletId: filter.outletId,
      dateKey: { gte: filter.from, lte: filter.to },
      ...(filter.userId ? { userId: filter.userId } : {}),
    },
    orderBy: [{ checkInAt: 'asc' }, { id: 'asc' }],
  });
}

export async function getAttendanceRecord(id: number, merchantId: number) {
  return prisma.attendanceRecord.findFirst({ where: { id, merchantId } });
}

export interface AttendanceEditInput {
  editedById: number;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  reason: string;
}

export async function updateAttendanceRecordWithEdit(
  id: number,
  data: Prisma.AttendanceRecordUncheckedUpdateInput,
  edit: AttendanceEditInput
) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.update({ where: { id }, data });
    await tx.attendanceEdit.create({
      data: {
        recordId: id,
        editedById: edit.editedById,
        before: (edit.before ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        after: edit.after as Prisma.InputJsonValue,
        reason: edit.reason,
      },
    });
    return record;
  });
}

export async function createAttendanceRecordWithEdit(
  data: Prisma.AttendanceRecordUncheckedCreateInput,
  edit: AttendanceEditInput
) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.create({ data });
    await tx.attendanceEdit.create({
      data: {
        recordId: record.id,
        editedById: edit.editedById,
        before: Prisma.JsonNull,
        after: { ...edit.after, id: record.id } as Prisma.InputJsonValue,
        reason: edit.reason,
      },
    });
    return record;
  });
}

export async function listAttendanceScans(filter: { userId: number; outletId?: number | null; start: Date; end: Date }) {
  return prisma.attendanceScan.findMany({
    where: {
      userId: filter.userId,
      at: { gte: filter.start, lte: filter.end },
      ...(filter.outletId ? { OR: [{ outletId: filter.outletId }, { outletId: null }] } : {}),
    },
    orderBy: [{ at: 'asc' }, { id: 'asc' }],
  });
}

/** Scans of an outlet in a time range (export "Chi tiết"). */
export async function listOutletAttendanceScans(outletId: number, start: Date, end: Date) {
  return prisma.attendanceScan.findMany({
    where: { outletId, at: { gte: start, lte: end } },
    orderBy: [{ at: 'asc' }, { id: 'asc' }],
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });
}

export async function listAttendanceEdits(recordIds: number[]) {
  if (recordIds.length === 0) return [];
  return prisma.attendanceEdit.findMany({
    where: { recordId: { in: recordIds } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
}

export async function isAttendanceMonthLocked(outletId: number, month: string): Promise<boolean> {
  const row = await prisma.attendanceMonthLock.findUnique({ where: { outletId_month: { outletId, month } } });
  return !!row;
}

export async function lockAttendanceMonth(outletId: number, month: string, lockedById: number) {
  return prisma.attendanceMonthLock.upsert({
    where: { outletId_month: { outletId, month } },
    create: { outletId, month, lockedById },
    update: {},
  });
}

export async function unlockAttendanceMonth(outletId: number, month: string) {
  const res = await prisma.attendanceMonthLock.deleteMany({ where: { outletId, month } });
  return res.count;
}
