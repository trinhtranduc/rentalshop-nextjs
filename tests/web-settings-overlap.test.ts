/**
 * #1314 Settings › "Cho tạo đơn khi trùng lịch": the owner switches it on the web.
 * A missing key is unknown (load the profile); only the owner sees and changes it.
 */
import { describe, expect, it } from '@jest/globals';
import { canChangeOverlap, overlapFlag } from '../apps/client/app/settings/settings-model';

describe('overlapFlag (#1314)', () => {
  it('no merchant or no flag is unknown, not OFF', () => {
    expect(overlapFlag(null)).toBeNull();
    expect(overlapFlag(undefined)).toBeNull();
    expect(overlapFlag({ id: 12, name: 'Shop' })).toBeNull();
    expect(overlapFlag({ allowOverlappingOrders: 'false' })).toBeNull();
  });

  it('gives the stored value', () => {
    expect(overlapFlag({ allowOverlappingOrders: true })).toBe(true);
    expect(overlapFlag({ allowOverlappingOrders: false })).toBe(false);
  });
});

describe('canChangeOverlap (#1314)', () => {
  it('only the owner', () => {
    expect(canChangeOverlap('MERCHANT')).toBe(true);
    expect(canChangeOverlap('merchant')).toBe(true);
    for (const role of ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY', 'ADMIN', 'OPS', '', null, undefined]) {
      expect(canChangeOverlap(role)).toBe(false);
    }
  });
});
