/**
 * #924 who edited a record: the Excel "Lịch sử sửa" sheet and the person month EDIT rows name the editor, the
 * shop owner included (the owner is not an outlet user, so the timesheet names do not have them).
 * A new record has no "Trước" times.
 */
jest.mock('next/server', () => require('../helpers/attendance-route-mocks').nextServerModule);
jest.mock('@rentalshop/auth/server', () => require('../helpers/attendance-route-mocks').authServerModule);
jest.mock('@rentalshop/database', () => require('../helpers/attendance-route-mocks').databaseModule);
jest.mock('@rentalshop/utils', () => require('../helpers/attendance-route-mocks').utilsModule());

import * as XLSX from 'xlsx';
import { mockDb, params, req, resetAttendanceMocks, setCaller } from '../helpers/attendance-route-mocks';
import { GET as exportSheet } from '../../apps/api/app/api/attendance/timesheet/export/route';
import { GET as personMonth } from '../../apps/api/app/api/attendance/people/[userId]/month/route';

const RECORD = {
  id: 3, userId: 7, outletId: 1, dateKey: '2026-10-05', status: 'DONE', source: 'MANUAL', shiftName: null, shiftStart: null, shiftEnd: null,
  shiftBreak: null, checkInAt: new Date('2026-10-05T01:05:00Z'), checkOutAt: new Date('2026-10-05T10:20:00Z'), suspectedFake: false,
  suspectReasons: null, autoClosedAt: null,
};

const EDITS = [
  // added by the shop owner (user 3, not an outlet user)
  { id: 1, recordId: 3, editedById: 3, createdAt: new Date('2026-10-12T03:00:00Z'), reason: 'Quên quét', before: null,
    after: { checkInAt: '2026-10-05T01:00:00.000Z', checkOutAt: '2026-10-05T10:00:00.000Z', status: 'DONE' } },
  // then fixed by the outlet admin (user 8, an outlet user)
  { id: 2, recordId: 3, editedById: 8, createdAt: new Date('2026-10-12T04:00:00Z'), reason: 'Sai giờ',
    before: { checkInAt: '2026-10-05T01:00:00.000Z', checkOutAt: '2026-10-05T10:00:00.000Z', status: 'DONE' },
    after: { checkInAt: '2026-10-05T01:05:00.000Z', checkOutAt: '2026-10-05T10:20:00.000Z', status: 'DONE' } },
];

beforeEach(() => {
  resetAttendanceMocks();
  mockDb.attendance.listRecords.mockResolvedValue([RECORD]);
  mockDb.attendance.listScans.mockResolvedValue([]);
  mockDb.attendance.listEdits.mockResolvedValue(EDITS);
  const people: Record<number, any> = {
    3: { id: 3, firstName: 'Minh', lastName: 'Chủ', role: 'MERCHANT', outletId: null },
    8: { id: 8, firstName: 'Chi', lastName: 'Ng', role: 'OUTLET_ADMIN', outletId: 1 },
  };
  mockDb.attendance.findUsersByIds.mockImplementation(async (ids: number[]) => ids.filter((id) => people[id]).map((id) => people[id]));
});

describe('Excel "Lịch sử sửa" (#924)', () => {
  it('names the shop owner as editor and leaves "Trước" empty for a new record', async () => {
    setCaller('MERCHANT');
    const res: any = await exportSheet(req('/api/attendance/timesheet/export?outletId=1&month=2026-10&parts=edits'));
    expect(res.status).toBe(200);
    const wb = XLSX.read(Buffer.from(res.body), { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Lịch sử sửa'], { header: 1, defval: '' });
    expect(rows[0]).toEqual(['Nhân viên', 'Sửa lúc', 'Trước', 'Sau', 'Lý do', 'Người sửa']);
    expect(rows[1]).toEqual(['Bình Tran', '12/10 10:00', '', '05/10 08:00 – 05/10 17:00', 'Quên quét', 'Minh Chủ']);
    expect(rows[2]).toEqual(['Bình Tran', '12/10 11:00', '05/10 08:00 – 05/10 17:00', '05/10 08:05 – 05/10 17:20', 'Sai giờ', 'Chi Ng']);
  });
});

describe('person month EDIT rows (#924)', () => {
  it('carry editorName (owner from a user lookup, outlet admin from the outlet users)', async () => {
    setCaller('MERCHANT');
    const res: any = await personMonth(req('/api/attendance/people/7/month?outletId=1&month=2026-10'), params({ userId: '7' }));
    expect(res.status).toBe(200);
    const edits = res.body.data.rows.filter((r: any) => r.kind === 'EDIT');
    expect(edits.map((r: any) => r.editorName)).toEqual(['Minh Chủ', 'Chi Ng']);
    // existing fields unchanged
    expect(edits[0]).toEqual(expect.objectContaining({ result: 'EDITED', note: 'Quên quét', before: null, dateKey: '2026-10-05' }));
  });

  it('editorName is null when the editor no longer exists', async () => {
    setCaller('MERCHANT');
    mockDb.attendance.findUsersByIds.mockResolvedValue([]);
    const res: any = await personMonth(req('/api/attendance/people/7/month?outletId=1&month=2026-10'), params({ userId: '7' }));
    const first = res.body.data.rows.find((r: any) => r.kind === 'EDIT');
    expect(first).toHaveProperty('editorName', null);
  });
});
