/**
 * #1643 public shop page: which branch is shown, when the picker appears, when the phone-derived Zalo button stays,
 * and what the URL says. Pure (no dates): same answers under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  orderOutlets,
  outletSearch,
  parseOutletParam,
  pickOutlet,
  showsOutletPicker,
  showsPhoneZaloButton,
} from '../apps/client/app/[tenantKey]/products/lib/outlet-picker';

const A = { id: 3, name: 'Thủ Đức', isDefault: false };
const B = { id: 4, name: 'Quận 1', isDefault: true };
const C = { id: 7, name: 'Bình Thạnh' };

describe('parseOutletParam', () => {
  it('a positive integer', () => {
    expect(parseOutletParam('3')).toBe(3);
    expect(parseOutletParam(' 12 ')).toBe(12);
    expect(parseOutletParam(['5', '6'])).toBe(5);
  });
  it('anything else is no choice', () => {
    for (const v of [undefined, null, '', '0', '-2', '3.5', 'abc', '3; drop', '1234567890123']) expect(parseOutletParam(v as any)).toBeNull();
  });
});

describe('pickOutlet', () => {
  it('the asked branch when the shop has it', () => {
    expect(pickOutlet([A, B, C], 7)).toBe(C);
  });
  it('an unknown or inactive id falls back to the main branch (not the first in the list, the old bug)', () => {
    expect(pickOutlet([A, B, C], 99)).toBe(B);
    expect(pickOutlet([A, B, C], null)).toBe(B);
  });
  it('no main branch flagged (older data): the first one', () => {
    expect(pickOutlet([A, C], null)).toBe(A);
  });
  it('no branches: nothing', () => {
    expect(pickOutlet([], 3)).toBeUndefined();
  });
});

describe('orderOutlets', () => {
  it('the main branch first, the others keep the API order', () => {
    expect(orderOutlets([A, C, B]).map((o) => o.id)).toEqual([4, 3, 7]);
  });
  it('does not change the list it is given', () => {
    const list = [A, B];
    orderOutlets(list);
    expect(list.map((o) => o.id)).toEqual([3, 4]);
  });
});

describe('picker and Zalo button', () => {
  it('the picker needs 2 or more branches', () => {
    expect(showsOutletPicker([])).toBe(false);
    expect(showsOutletPicker([A])).toBe(false);
    expect(showsOutletPicker([A, B])).toBe(true);
  });
  it('the big phone Zalo button stays until the branch has a Zalo link', () => {
    expect(showsPhoneZaloButton(undefined)).toBe(true);
    expect(showsPhoneZaloButton({ ...A, links: null })).toBe(true);
    expect(showsPhoneZaloButton({ ...A, links: [{ type: 'instagram', url: 'https://instagram.com/a' }] })).toBe(true);
    expect(showsPhoneZaloButton({ ...A, links: [{ type: 'zalo', url: 'https://zalo.me/0901234567' }] })).toBe(false);
  });
});

describe('outletSearch (the URL after a pick)', () => {
  it('adds ?outlet= for a branch, keeps the other filters', () => {
    expect(outletSearch('', A)).toBe('?outlet=3');
    expect(outletSearch('?categoryId=2&search=ao', A)).toBe('?categoryId=2&search=ao&outlet=3');
    expect(outletSearch('?outlet=7&page=2', A)).toBe('?outlet=3&page=2');
  });
  it('the main branch drops the parameter', () => {
    expect(outletSearch('?outlet=3', B)).toBe('');
    expect(outletSearch('?outlet=3&page=2', B)).toBe('?page=2');
  });
});
