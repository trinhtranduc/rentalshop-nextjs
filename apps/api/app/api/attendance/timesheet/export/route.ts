import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ATTENDANCE_MANAGER_ROLES, attendanceRoute, resolveOutlet } from '../../../../../lib/attendance/context';
import { validationFailed } from '../../../../../lib/attendance/http';
import { scanKindLabel, scanResultLabel } from '../../../../../lib/attendance/export-labels';
import { getUtcRangeForDateKeys } from '../../../../../lib/attendance/rules';
import { listDateKeys } from '../../../../../lib/attendance/schedule';
import { monthSchema, queryIdSchema, queryOf } from '../../../../../lib/attendance/schemas';
import { fullName, loadTimesheet } from '../../../../../lib/attendance/timesheet';
import { editorNames, isAddedRecordEdit } from '../../../../../lib/attendance/editors';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** `dd/MM HH:mm` in VN wall time (Vietnam has no DST). */
function vnTime(at: Date | string | null | undefined): string {
  if (!at) return '';
  const d = new Date(new Date(at).getTime() + VN_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

const PARTS = ['grid', 'scans', 'edits'] as const;

/**
 * GET /api/attendance/timesheet/export?outletId&month&parts=grid,scans,edits — #907 rule 31.
 * MERCHANT, OUTLET_ADMIN (own outlet). `.xlsx` with "Bảng tháng" (hours per day, total hours, days),
 * "Chi tiết" (every scan with result, distance, coordinates) and "Lịch sử sửa".
 * #924 "Lịch sử sửa": "Người sửa" is a name (the shop owner too); "Trước" is empty for an added record.
 */
export const GET = attendanceRoute(ATTENDANCE_MANAGER_ROLES, async (request, { user }) => {
  const parsed = z
    .object({ outletId: queryIdSchema, month: monthSchema, parts: z.string().optional() })
    .safeParse(queryOf(request.url));
  if (!parsed.success) return validationFailed(parsed.error);
  const parts = new Set(
    (parsed.data.parts ? parsed.data.parts.split(',') : [...PARTS]).map((p) => p.trim()).filter((p) => (PARTS as readonly string[]).includes(p))
  );
  if (parts.size === 0) PARTS.forEach((p) => parts.add(p));

  const outlet = await resolveOutlet(user, parsed.data.outletId);
  const sheet = await loadTimesheet(outlet.id, parsed.data.month);
  const names = new Map(sheet.users.map((u) => [u.userId, u.name]));
  const workbook = XLSX.utils.book_new();

  if (parts.has('grid')) {
    const days = listDateKeys(sheet.from, sheet.to);
    const header = ['Nhân viên', ...days.map((d) => d.slice(8)), 'Tổng giờ', 'Số công'];
    const rows = sheet.users.map((u) => [u.name, ...days.map((d) => u.days[d]?.hours ?? ''), u.totals.hours, u.totals.dayCredits]);
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([header, ...rows]), 'Bảng tháng');
  }
  if (parts.has('scans')) {
    const { start, end } = getUtcRangeForDateKeys({ from: sheet.from, to: sheet.to });
    const scans = await db.attendance.listOutletScans(outlet.id, start, end);
    const rows = scans.map((s) => [
      fullName(s.user) || names.get(s.userId) || String(s.userId),
      vnTime(s.at),
      scanKindLabel(s.action),
      scanResultLabel(s.result),
      s.distanceM ?? '',
      Math.round(s.accuracy),
      s.latitude,
      s.longitude,
    ]);
    const header = ['Nhân viên', 'Thời gian', 'Loại', 'Kết quả', 'Khoảng cách (m)', 'GPS ± (m)', 'Vĩ độ', 'Kinh độ'];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([header, ...rows]), 'Chi tiết');
  }
  if (parts.has('edits')) {
    const edits = await db.attendance.listEdits(sheet.records.map((r) => r.id));
    const recordUser = new Map(sheet.records.map((r) => [r.id, r.userId]));
    // #924 the shop owner is not a timesheet user: look the other editors up by id
    const editors = await editorNames(edits, names);
    const rows = edits.map((e) => {
      const before = (e.before ?? {}) as Record<string, string | null>;
      const after = (e.after ?? {}) as Record<string, string | null>;
      return [
        names.get(recordUser.get(e.recordId) ?? 0) ?? '',
        vnTime(e.createdAt),
        isAddedRecordEdit(e.before) ? '' : `${vnTime(before.checkInAt)} – ${vnTime(before.checkOutAt)}`,
        `${vnTime(after.checkInAt)} – ${vnTime(after.checkOutAt)}`,
        e.reason,
        editors.get(e.editedById) ?? String(e.editedById),
      ];
    });
    const header = ['Nhân viên', 'Sửa lúc', 'Trước', 'Sau', 'Lý do', 'Người sửa'];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([header, ...rows]), 'Lịch sử sửa');
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const filename = `cham-cong-${outlet.id}-${parsed.data.month}.xlsx`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
