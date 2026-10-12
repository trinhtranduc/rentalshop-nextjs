/**
 * #924 Chi tiết theo người: the "Đã sửa" row says who edited and the times (before → after for an edit), and an
 * out time on the next VN day reads "(hôm sau)". Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh; results must match.
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@rentalshop/utils', () => ({
  ...(jest.requireActual('../packages/utils/src/core/date-range') as object),
  ...(jest.requireActual('../packages/utils/src/core/shop-day') as object),
  SHOP_TIMEZONE: 'Asia/Ho_Chi_Minh',
}));
import { editSummaryText, isNextDayOf } from '../apps/client/app/attendance/attendance-model';
import type { AttendancePersonRow } from '@rentalshop/types';

const WORDS = { checkIn: (t: string) => `vào ${t}`, checkOut: (t: string) => `ra ${t}`, nextDay: '(hôm sau)' };

const edit = (extra: Partial<AttendancePersonRow> & Record<string, unknown>): AttendancePersonRow =>
  ({ at: '2026-10-12T03:00:00.000Z', kind: 'EDIT', result: 'EDITED', recordId: 3, dateKey: '2026-10-05', ...extra }) as AttendancePersonRow;

describe('#924 "Đã sửa" row text', () => {
  it('a new record: editor · in → out · "reason"', () => {
    const row = edit({
      editorName: 'Minh Chủ',
      note: 'Quên quét',
      before: null,
      after: { checkInAt: '2026-10-05T01:05:00.000Z', checkOutAt: '2026-10-05T10:20:00.000Z' },
    });
    expect(editSummaryText(row, WORDS)).toBe('Minh Chủ · vào 08:05 → ra 17:20 · "Quên quét"');
  });

  it('an edit: each changed time before → after, an unchanged one once', () => {
    const row = edit({
      editorName: 'Chi Ng',
      note: 'Sai giờ',
      before: { checkInAt: '2026-10-05T01:00:00.000Z', checkOutAt: '2026-10-05T10:00:00.000Z' },
      after: { checkInAt: '2026-10-05T01:05:00.000Z', checkOutAt: '2026-10-05T10:20:00.000Z' },
    });
    expect(editSummaryText(row, WORDS)).toBe('Chi Ng · vào 08:00 → 08:05 · ra 17:00 → 17:20 · "Sai giờ"');
    const outOnly = edit({
      editorName: 'Chi Ng',
      note: 'Quên quét ra',
      before: { checkInAt: '2026-10-05T01:00:00.000Z', checkOutAt: null },
      after: { checkInAt: '2026-10-05T01:00:00.000Z', checkOutAt: '2026-10-05T10:30:00.000Z' },
    });
    expect(editSummaryText(outOnly, WORDS)).toBe('Chi Ng · vào 08:00 · ra — → 17:30 · "Quên quét ra"');
  });

  it('an out time on the day after the record day gets "(hôm sau)"; no editor name → no name part', () => {
    const row = edit({
      dateKey: '2026-10-20',
      note: 'Ca đêm',
      before: { checkInAt: '2026-10-20T15:00:00.000Z', checkOutAt: '2026-10-20T16:00:00.000Z' },
      // 02:00 on 21/10 in Vietnam, still 20/10 in UTC
      after: { checkInAt: '2026-10-20T15:00:00.000Z', checkOutAt: '2026-10-20T19:00:00.000Z' },
    });
    expect(editSummaryText(row, WORDS)).toBe('vào 22:00 · ra 23:00 → 02:00 (hôm sau) · "Ca đêm"');
  });

  it('a non-edit row has no summary', () => {
    expect(editSummaryText({ at: '2026-10-05T01:00:00.000Z', kind: 'IN', result: 'ACCEPTED' } as AttendancePersonRow, WORDS)).toBe('');
  });
});

describe('#924 isNextDayOf (VN civil day)', () => {
  it('true only when the instant is on the VN day after the record day', () => {
    expect(isNextDayOf('2026-10-20T19:00:00.000Z', '2026-10-20')).toBe(true); // 02:00 21/10 VN
    expect(isNextDayOf('2026-10-20T16:59:00.000Z', '2026-10-20')).toBe(false); // 23:59 20/10 VN
    expect(isNextDayOf('2026-10-20T17:00:00.000Z', '2026-10-20')).toBe(true); // 00:00 21/10 VN
    expect(isNextDayOf('2026-10-22T01:00:00.000Z', '2026-10-20')).toBe(false); // two days later is not "hôm sau"
    expect(isNextDayOf(null, '2026-10-20')).toBe(false);
  });
});
