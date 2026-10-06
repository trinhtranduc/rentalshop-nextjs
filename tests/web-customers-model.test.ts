/**
 * #526 shop web Khách hàng: list text, page selection, summary, and the Excel import checks.
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  addressLine,
  canSelectAll,
  customerName,
  dayText,
  exportFileName,
  formatPhone,
  initials,
  MAX_SELECT_ALL,
  pageSelection,
  parsePage,
  parsePageSize,
  parseQuery,
  summaryOf,
  toggleOne,
  togglePage,
} from '../apps/client/app/customers/customers-model';
import {
  acceptsFile,
  badColumn,
  cellOf,
  checkRow,
  checkRows,
  clockText,
  counts,
  initialSelection,
  MAX_IMPORT_ROWS,
  orderRows,
  payloadOf,
  phoneText,
  resultOf,
  rowsToSend,
} from '../apps/client/app/customers/import/import-model';

describe('customers list text', () => {
  it('joins the name and falls back to empty', () => {
    expect(customerName({ firstName: 'Vũ Hải', lastName: 'Yến' })).toBe('Vũ Hải Yến');
    expect(customerName({ firstName: ' Lan ', lastName: null })).toBe('Lan');
    expect(customerName({ firstName: '', lastName: '' })).toBe('');
  });

  it('takes initials from the last two words', () => {
    expect(initials('Vũ Hải Yến')).toBe('HY');
    expect(initials('Lan Anh')).toBe('LA');
    expect(initials('huy')).toBe('HU');
    expect(initials('')).toBe('?');
    expect(initials('Đinh Bảo Ngọc')).toBe('BN');
  });

  it('groups Vietnamese phone numbers', () => {
    expect(formatPhone('0912555018')).toBe('0912 555 018');
    expect(formatPhone('0912 555 018')).toBe('0912 555 018');
    expect(formatPhone('+84912555018')).toBe('+84912555018');
    expect(formatPhone('12345')).toBe('12345');
    expect(formatPhone(null)).toBe('');
  });

  it('builds the address without repeats', () => {
    expect(addressLine({ address: '45 Nguyễn Trãi', city: 'Quận 5', state: 'TP.HCM' })).toBe('45 Nguyễn Trãi, Quận 5, TP.HCM');
    expect(addressLine({ address: '', city: 'Hà Nội', state: 'Hà Nội' })).toBe('Hà Nội');
  });

  it('writes a day key as dd/mm/yyyy', () => {
    expect(dayText('2026-10-05')).toBe('05/10/2026');
    expect(dayText('2026-02-30')).toBe('');
    expect(dayText(null)).toBe('');
  });

  it('reads the URL', () => {
    expect(parsePage('3')).toBe(3);
    expect(parsePage('-1')).toBe(1);
    expect(parsePageSize('50')).toBe(50);
    expect(parsePageSize('25')).toBe(10);
    expect(parseQuery('  yen ')).toBe('yen');
    expect(parseQuery(null)).toBe('');
  });
});

describe('page selection', () => {
  const page = [1, 2, 3];
  it('reports all / some / none', () => {
    expect(pageSelection(page, new Set())).toBe('none');
    expect(pageSelection(page, new Set([2, 9]))).toBe('some');
    expect(pageSelection(page, new Set([1, 2, 3, 9]))).toBe('all');
    expect(pageSelection([], new Set([1]))).toBe('none');
  });

  it('header checkbox fills a partial page and clears a full one, keeping other pages', () => {
    const filled = togglePage(page, new Set([2, 9]));
    expect([...filled].sort()).toEqual([1, 2, 3, 9]);
    const cleared = togglePage(page, filled);
    expect([...cleared]).toEqual([9]);
  });

  it('toggles one row without touching the input', () => {
    const before = new Set([1]);
    expect([...toggleOne(2, before)].sort()).toEqual([1, 2]);
    expect([...toggleOne(1, before)]).toEqual([]);
    expect([...before]).toEqual([1]);
  });

  it('offers "select all" only up to the cap', () => {
    expect(canSelectAll(412, 2)).toBe(true);
    expect(canSelectAll(412, 412)).toBe(false);
    expect(canSelectAll(MAX_SELECT_ALL + 1, 0)).toBe(false);
  });

  it('names the export file by the Vietnam day', () => {
    expect(exportFileName('2026-10-06', 0)).toBe('khach-hang-2026-10-06.xlsx');
    expect(exportFileName('2026-10-06', 3)).toBe('khach-hang-2026-10-06-3.xlsx');
  });
});

describe('customer summary', () => {
  it('reads count and spend (cancelled already left out by the API)', () => {
    expect(summaryOf({ total: 6, summary: { totalOrders: 6, totalAmount: 2150000 } }, 1)).toEqual({ orders: 6, spent: 2150000, renting: 1 });
  });
  it('falls back to total and shows unknown as null', () => {
    expect(summaryOf({ total: 4 }, null)).toEqual({ orders: 4, spent: null, renting: null });
    expect(summaryOf(null, undefined)).toEqual({ orders: null, spent: null, renting: null });
  });
});

describe('import rows', () => {
  const file = [
    { firstName: 'Nguyễn Thanh', lastName: 'Hương', phone: '0901111345', email: 'huongnt@gmail.com', address: '15 Pasteur', city: 'Q3' },
    { phone: '0934220118', address: '22 Hai Bà Trưng' },
    { firstName: 'Trương Mỹ', lastName: 'Linh', email: 'mylinh@gmail', notes: 'Khách quen' },
    { firstName: 'Lê Quốc Bảo', phone: 912345678, idType: 'cmnd' },
    { lastName: 'Phan', phone: '0977456123', email: '' },
  ];
  const rows = checkRows(file);

  it('numbers rows like Excel and finds the problem', () => {
    expect(rows.map((r) => r.n)).toEqual([2, 3, 4, 5, 6]);
    expect(rows.map((r) => r.issue)).toEqual([null, 'missingName', 'badEmail', 'badIdType', null]);
    expect(rows[3].values.phone).toBe('0912345678');
  });

  it('shows cells and marks the bad one', () => {
    expect(cellOf(rows[0], 'name')).toBe('Nguyễn Thanh Hương');
    expect(cellOf(rows[0], 'address')).toBe('15 Pasteur, Q3');
    expect(badColumn(rows[1])).toBe('name');
    expect(badColumn(rows[2])).toBe('email');
    expect(badColumn(rows[3])).toBeNull();
    expect(badColumn(rows[0])).toBeNull();
  });

  it('counts and orders errors first', () => {
    expect(counts(rows)).toEqual({ all: 5, ok: 2, bad: 3 });
    expect(orderRows(rows, true).map((r) => r.n)).toEqual([3, 4, 5, 2, 6]);
    expect(orderRows(rows, false).map((r) => r.n)).toEqual([2, 3, 4, 5, 6]);
  });

  it('ticks valid rows and sends only ticked valid rows', () => {
    const sel = initialSelection(rows);
    expect([...sel]).toEqual([0, 4]);
    sel.add(1); // an error row can never be sent
    sel.delete(4);
    expect(rowsToSend(rows, sel).map((r) => r.n)).toEqual([2]);
  });

  it('builds the old payload shape', () => {
    expect(payloadOf(rows[0], 7)).toEqual({
      firstName: 'Nguyễn Thanh',
      lastName: 'Hương',
      phone: '0901111345',
      email: 'huongnt@gmail.com',
      address: '15 Pasteur',
      city: 'Q3',
      merchantId: 7,
    });
    expect(payloadOf(rows[4])).toEqual({ firstName: 'Phan', lastName: '', phone: '0977456123' });
    expect(checkRow({ firstName: 'A', idType: 'passport' }, 0).issue).toBeNull();
  });

  it('maps API row errors back to file rows', () => {
    const sent = [rows[0], rows[4]];
    expect(resultOf({ imported: 0, failed: 1, total: 2, errors: [{ row: 2, error: 'email: Invalid email address' }] }, sent)).toEqual({
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 1,
      errors: [{ n: 6, message: 'email: Invalid email address' }],
    });
    expect(resultOf({ imported: 1, updated: 1, skipped: 0, failed: 0, errors: [] }, sent)).toEqual({ imported: 1, updated: 1, skipped: 0, failed: 0, errors: [] });
    expect(resultOf(null, sent).imported).toBe(0);
  });

  it('puts back the leading 0 a numeric phone cell lost', () => {
    expect(phoneText(912345678)).toBe('0912345678');
    expect(phoneText('0912345678')).toBe('0912345678');
    expect(phoneText('+84912345678')).toBe('+84912345678');
    expect(phoneText('12345')).toBe('12345');
    expect(phoneText(undefined)).toBe('');
  });

  it('accepts spreadsheet files and caps the row count like the API', () => {
    expect(acceptsFile('khach-hang.xlsx')).toBe(true);
    expect(acceptsFile('KH.CSV')).toBe(true);
    expect(acceptsFile('notes.pdf')).toBe(false);
    expect(MAX_IMPORT_ROWS).toBe(3000);
  });

  it('reads the clock in the shop timezone', () => {
    expect(clockText(new Date('2026-10-06T07:05:00Z'))).toBe('14:05');
  });
});
