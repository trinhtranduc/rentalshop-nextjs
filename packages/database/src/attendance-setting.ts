import { prisma } from './client';

/**
 * #907 Outlet attendance settings (location, radius, QR state, kiosk token) and the outlet / user
 * lookups the attendance routes scope with. Every lookup takes the caller's merchantId: another
 * merchant's row is simply not found.
 */

const OUTLET_ROLES = ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'] as const;

export async function getAttendanceOutlet(outletId: number, merchantId: number) {
  return prisma.outlet.findFirst({
    where: { id: outletId, merchantId },
    select: { id: true, name: true, address: true, phone: true, merchantId: true, isActive: true },
  });
}

export async function listAttendanceOutlets(merchantId: number, outletId?: number | null) {
  return prisma.outlet.findMany({
    where: { merchantId, ...(outletId ? { id: outletId } : {}) },
    select: { id: true, name: true, address: true, phone: true, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  });
}

export async function getAttendanceSetting(outletId: number) {
  return prisma.attendanceSetting.findUnique({ where: { outletId } });
}

export async function listAttendanceSettings(outletIds: number[]) {
  if (outletIds.length === 0) return [];
  return prisma.attendanceSetting.findMany({ where: { outletId: { in: outletIds } } });
}

export async function upsertAttendanceSetting(
  outletId: number,
  merchantId: number,
  data: { latitude?: number | null; longitude?: number | null; radiusM?: number; qrMode?: string; qrVersion?: number }
) {
  return prisma.attendanceSetting.upsert({
    where: { outletId },
    create: { outletId, merchantId, ...data },
    update: data,
  });
}

/** "Tạo mã QR" / "Tạo mã mới": version + 1, every older code stops working. */
export async function bumpAttendanceQrVersion(outletId: number, merchantId: number) {
  return prisma.attendanceSetting.upsert({
    where: { outletId },
    create: { outletId, merchantId, qrVersion: 1, qrCreatedAt: new Date() },
    update: { qrVersion: { increment: 1 }, qrCreatedAt: new Date() },
  });
}

export async function setAttendanceKioskToken(outletId: number, merchantId: number, token: string) {
  return prisma.attendanceSetting.upsert({
    where: { outletId },
    create: { outletId, merchantId, kioskToken: token, kioskTokenAt: new Date() },
    update: { kioskToken: token, kioskTokenAt: new Date() },
  });
}

export async function findAttendanceSettingByKioskToken(token: string) {
  return prisma.attendanceSetting.findUnique({
    where: { kioskToken: token },
    include: { outlet: { select: { id: true, name: true, merchantId: true } } },
  });
}

/** Active users of an outlet that can be scheduled (outlet roles). */
export async function listAttendanceOutletUsers(outletId: number) {
  return prisma.user.findMany({
    where: { outletId, isActive: true, deletedAt: null, role: { in: [...OUTLET_ROLES] } },
    select: { id: true, firstName: true, lastName: true, role: true, outletId: true, attendanceRequired: true },
    orderBy: { id: 'asc' },
  });
}

/**
 * #927 People of an outlet who can be asked to clock in: its active outlet users plus the shop's active
 * owners (MERCHANT, outletId null, they punch at any outlet). Order: staff / inventory, outlet admin, owner, id.
 */
export async function listAttendanceMembers(outletId: number, merchantId: number) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [
        { outletId, merchantId, role: { in: [...OUTLET_ROLES] } },
        { merchantId, role: 'MERCHANT' },
      ],
    },
    select: { id: true, firstName: true, lastName: true, role: true, outletId: true, attendanceRequired: true },
    orderBy: { id: 'asc' },
  });
  const rank = (role: string) => (role === 'OUTLET_ADMIN' ? 1 : role === 'MERCHANT' ? 2 : 0);
  return users.sort((a, b) => rank(a.role) - rank(b.role) || a.id - b.id);
}

/** #927 Who must clock in: true / false, or null to follow the role default. */
export async function setAttendanceRequired(userId: number, value: boolean | null) {
  return prisma.user.update({
    where: { id: userId },
    data: { attendanceRequired: value },
    select: { id: true, firstName: true, lastName: true, role: true, outletId: true, attendanceRequired: true },
  });
}

export async function getAttendanceUserInMerchant(userId: number, merchantId: number) {
  return prisma.user.findFirst({
    where: { id: userId, merchantId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      outletId: true,
      merchantId: true,
      isActive: true,
      attendanceRequired: true,
    },
  });
}

export async function findUsersByIds(userIds: number[]) {
  if (userIds.length === 0) return [];
  return prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true, role: true, outletId: true, attendanceRequired: true },
  });
}
