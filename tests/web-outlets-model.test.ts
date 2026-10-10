/**
 * #545 shop web Chi nhánh: pure model. Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import { ROLE_PERMISSIONS } from '../packages/auth/src/permissions';
import {
  EMPTY_OUTLET_FORM,
  formatOutletDate,
  groupAccountNumber,
  nextSort,
  outletActions,
  outletAddress,
  outletCreatePayload,
  outletFormFrom,
  outletUpdatePayload,
  parseOutletId,
  parseOutletParams,
  validateOutlet,
} from '../apps/client/app/outlets/outlets-model';

const params = (q: string) => new URLSearchParams(q);

describe('parseOutletParams', () => {
  it('defaults to newest first, page 1, 20 rows', () => {
    expect(parseOutletParams(params(''))).toEqual({ q: '', page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });
  });
  it('reads valid values', () => {
    expect(parseOutletParams(params('q=%20Qu%E1%BA%ADn%201%20&page=2&limit=10&sortBy=name&sortOrder=asc'))).toEqual({
      q: 'Quận 1',
      page: 2,
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  });
  it('falls back on broken values', () => {
    expect(parseOutletParams(params('page=-1&limit=25&sortBy=phone&sortOrder=x'))).toEqual({
      q: '',
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });
});

describe('nextSort', () => {
  it('flips the same column, starts a new one ascending', () => {
    expect(nextSort({ sortBy: 'createdAt', sortOrder: 'desc' }, 'createdAt')).toEqual({ sortBy: 'createdAt', sortOrder: 'asc' });
    expect(nextSort({ sortBy: 'createdAt', sortOrder: 'asc' }, 'createdAt')).toEqual({ sortBy: 'createdAt', sortOrder: 'desc' });
    expect(nextSort({ sortBy: 'createdAt', sortOrder: 'desc' }, 'name')).toEqual({ sortBy: 'name', sortOrder: 'asc' });
  });
});

describe('outletAddress', () => {
  it('joins the non-empty parts', () => {
    expect(outletAddress({ address: '12 Lê Lợi ', city: 'TP. HCM', state: '', zipCode: null, country: 'Việt Nam' })).toBe('12 Lê Lợi, TP. HCM, Việt Nam');
  });
  it('drops a part repeated right after itself', () => {
    expect(outletAddress({ address: '1 Main', city: 'Hà Nội', state: 'hà nội', country: '' })).toBe('1 Main, Hà Nội');
  });
  it('empty when nothing is set', () => {
    expect(outletAddress({})).toBe('');
  });
});

describe('forms and payloads', () => {
  const outlet = {
    id: 3,
    name: 'Thủ Đức',
    address: '88 Võ Văn Ngân',
    city: 'TP. Thủ Đức',
    state: null,
    zipCode: null,
    country: 'Việt Nam',
    phone: '0909',
    description: null,
    printNote: '*** Mang CCCD',
  };

  it('outletFormFrom fills blanks for nulls', () => {
    expect(outletFormFrom(outlet)).toEqual({
      name: 'Thủ Đức',
      phone: '0909',
      address: '88 Võ Văn Ngân',
      city: 'TP. Thủ Đức',
      state: '',
      zipCode: '',
      country: 'Việt Nam',
      description: '',
      printNote: '*** Mang CCCD',
    });
  });

  it('validateOutlet: name required, print note at most 500', () => {
    expect(validateOutlet({ ...EMPTY_OUTLET_FORM, name: '  ' })).toEqual({ name: 'nameRequired' });
    expect(validateOutlet({ ...EMPTY_OUTLET_FORM, name: 'A', printNote: 'x'.repeat(500) })).toEqual({});
    expect(validateOutlet({ ...EMPTY_OUTLET_FORM, name: 'A', printNote: 'x'.repeat(501) })).toEqual({ printNote: 'printNoteTooLong' });
  });

  it('create payload: the old add fields, trimmed, with merchantId and no print note', () => {
    expect(outletCreatePayload({ ...EMPTY_OUTLET_FORM, name: ' Quận 1 ', phone: ' 0908 ', printNote: 'x' }, 7)).toEqual({
      name: 'Quận 1',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      phone: '0908',
      description: '',
      merchantId: 7,
    });
  });

  it('update payload: id, the same fields and the print note as typed', () => {
    expect(outletUpdatePayload(3, outletFormFrom(outlet))).toEqual({
      id: 3,
      name: 'Thủ Đức',
      address: '88 Võ Văn Ngân',
      city: 'TP. Thủ Đức',
      state: '',
      zipCode: '',
      country: 'Việt Nam',
      phone: '0909',
      description: '',
      printNote: '*** Mang CCCD',
    });
  });
});

describe('outletActions', () => {
  it('the default outlet cannot be paused', () => {
    expect(outletActions({ isDefault: true, isActive: true })).toEqual(['view', 'edit', 'bank']);
  });
  it('others pause when open and reopen when paused', () => {
    expect(outletActions({ isDefault: false, isActive: true })).toEqual(['view', 'edit', 'bank', 'disable']);
    expect(outletActions({ isDefault: false, isActive: false })).toEqual(['view', 'edit', 'bank', 'enable']);
  });
});

describe('formatOutletDate', () => {
  it('uses the Vietnam day, not the UTC day', () => {
    expect(formatOutletDate('2026-10-05T18:30:00.000Z')).toBe('06/10/2026');
    expect(formatOutletDate('2026-10-06T16:59:00.000Z')).toBe('06/10/2026');
    expect(formatOutletDate('2026-10-06T17:00:00.000Z')).toBe('07/10/2026');
  });
  it('dash for missing or broken values', () => {
    expect(formatOutletDate(null)).toBe('—');
    expect(formatOutletDate('nope')).toBe('—');
  });
});

describe('parseOutletId / groupAccountNumber', () => {
  it('accepts positive integers only', () => {
    expect(parseOutletId('12')).toBe(12);
    expect(parseOutletId(['5'])).toBe(5);
    expect(parseOutletId('0')).toBeNull();
    expect(parseOutletId('abc')).toBeNull();
    expect(parseOutletId('1.5')).toBeNull();
    expect(parseOutletId(undefined)).toBeNull();
  });
  it('groups digits in fours', () => {
    expect(groupAccountNumber('1234567890')).toBe('1234 5678 90');
    expect(groupAccountNumber(' 1234 5678 ')).toBe('1234 5678');
    expect(groupAccountNumber(null)).toBe('');
  });
});

describe('outletActions without outlet.manage (#736)', () => {
  it('a role that cannot manage outlets gets no edit, disable or enable', () => {
    expect(outletActions({ isDefault: false, isActive: true }, false)).toEqual(['view', 'bank']);
    expect(outletActions({ isDefault: false, isActive: false }, false)).toEqual(['view', 'bank']);
  });
  it('the edit control follows outlet.manage of the permission matrix (same as PUT /api/outlets)', () => {
    const edits = (role: string) => (ROLE_PERMISSIONS as Record<string, string[]>)[role].includes('outlet.manage');
    expect(edits('MERCHANT')).toBe(true);
    expect(edits('OUTLET_ADMIN')).toBe(true);
    expect(edits('OUTLET_STAFF')).toBe(false);
    expect(edits('OUTLET_INVENTORY')).toBe(false);
    expect(outletActions({ isDefault: true, isActive: true }, edits('OUTLET_STAFF'))).not.toContain('edit');
    expect(outletActions({ isDefault: true, isActive: true }, edits('MERCHANT'))).toContain('edit');
  });
});
