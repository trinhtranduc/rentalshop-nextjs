import { describe, expect, it } from 'vitest';
import { resolveUsersIsActiveFilter } from '@rentalshop/utils';

describe('resolveUsersIsActiveFilter', () => {
  it('returns undefined by default so disabled users are included', () => {
    expect(resolveUsersIsActiveFilter({})).toBeUndefined();
    expect(resolveUsersIsActiveFilter({ status: 'all' })).toBeUndefined();
  });

  it('maps explicit filters', () => {
    expect(resolveUsersIsActiveFilter({ isActive: true })).toBe(true);
    expect(resolveUsersIsActiveFilter({ isActive: false })).toBe(false);
    expect(resolveUsersIsActiveFilter({ status: 'active' })).toBe(true);
    expect(resolveUsersIsActiveFilter({ status: 'inactive' })).toBe(false);
  });

  it('prefers isActive over status', () => {
    expect(
      resolveUsersIsActiveFilter({ isActive: false, status: 'active' })
    ).toBe(false);
  });
});
