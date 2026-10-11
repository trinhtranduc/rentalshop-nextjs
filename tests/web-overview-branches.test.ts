/**
 * #827 shop web Tổng quan: branch picker state, the comparison rows and "Tháng trước".
 * "Tất cả" = the ACTIVE branches; inactive ones only when ticked. URL `?outlets=` wins over localStorage.
 * Day logic must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  BRANCH_COLORS,
  branchLabel,
  branchStorageKey,
  compareBranches,
  isAllActive,
  outletsParam,
  parseOutletIds,
  readStoredBranches,
  readStoredBranchLabel,
  resolveBranchSelection,
  selectionOutletIds,
  showsBranchPicker,
  toBranchOptions,
  toggleAllBranches,
  toggleBranch,
  writeStoredBranches,
  type BranchOption,
} from '../apps/client/app/dashboard/branch-model';
import { OVERVIEW_PERIODS, chartRange, periodRange } from '../apps/client/app/dashboard/overview-model';

const OUTLETS = [
  { id: 4, name: 'Outlet 2', isActive: true, isDefault: false },
  { id: 9, name: 'Bình Thạnh', isActive: false, isDefault: false },
  { id: 2, name: 'Main Branch', isActive: true, isDefault: true },
];
const options: BranchOption[] = toBranchOptions(OUTLETS);

describe('toBranchOptions', () => {
  it('default first, then active by name, inactive last; each gets a stable colour', () => {
    expect(options.map((o) => [o.id, o.isActive, o.isDefault])).toEqual([
      [2, true, true],
      [4, true, false],
      [9, false, false],
    ]);
    expect(options.map((o) => o.color)).toEqual([BRANCH_COLORS[0], BRANCH_COLORS[1], BRANCH_COLORS[2]]);
  });

  it('drops rows without a numeric id, and keeps each id once', () => {
    expect(toBranchOptions([{ id: 'x', name: 'a' }, { id: 2, name: 'b' }, { id: 2, name: 'b' }] as any).map((o) => o.id)).toEqual([2]);
  });
});

describe('showsBranchPicker', () => {
  it('merchant with 2+ branches (active or not) only', () => {
    expect(showsBranchPicker('MERCHANT', options)).toBe(true);
    expect(showsBranchPicker('MERCHANT', options.slice(0, 1))).toBe(false);
    expect(showsBranchPicker('OUTLET_ADMIN', options)).toBe(false);
    expect(showsBranchPicker('OUTLET_STAFF', options)).toBe(false);
    expect(showsBranchPicker(undefined, options)).toBe(false);
  });
});

describe('parseOutletIds', () => {
  it('reads 1,3 and rejects junk', () => {
    expect(parseOutletIds('4,2')).toEqual([4, 2]);
    expect(parseOutletIds('4,4')).toEqual([4]);
    expect(parseOutletIds('')).toBeNull();
    expect(parseOutletIds(null)).toBeNull();
    expect(parseOutletIds('a,2')).toBeNull();
    expect(parseOutletIds('0')).toBeNull();
  });
});

describe('resolveBranchSelection', () => {
  it('nothing chosen → all ACTIVE branches (inactive left out)', () => {
    expect(resolveBranchSelection(options, null, null)).toEqual([2, 4]);
  });

  it('the URL wins over what the browser remembered', () => {
    expect(resolveBranchSelection(options, '9', [4])).toEqual([9]);
    expect(resolveBranchSelection(options, null, [4])).toEqual([4]);
  });

  it('unknown ids are dropped; nothing left → all active', () => {
    expect(resolveBranchSelection(options, '4,77', null)).toEqual([4]);
    expect(resolveBranchSelection(options, '77', [88])).toEqual([2, 4]);
  });

  it('keeps the list order of the options', () => {
    expect(resolveBranchSelection(options, '9,4,2', null)).toEqual([2, 4, 9]);
  });
});

describe('toggles', () => {
  it('ticking an inactive branch adds it to "Tất cả"', () => {
    const next = toggleBranch([2, 4], 9, options);
    expect(next).toEqual([2, 4, 9]);
    expect(isAllActive(next, options)).toBe(false);
  });

  it('unticking keeps at least one branch', () => {
    expect(toggleBranch([2, 4], 4, options)).toEqual([2]);
    expect(toggleBranch([2], 2, options)).toEqual([2]);
  });

  it('"Tất cả" selects the active branches; ticking it again keeps them', () => {
    expect(toggleAllBranches([4], options)).toEqual([2, 4]);
    expect(toggleAllBranches([2, 4, 9], options)).toEqual([2, 4]);
    expect(toggleAllBranches([2, 4], options)).toEqual([2, 4]);
  });

  it('isAllActive: exactly the active ones', () => {
    expect(isAllActive([4, 2], options)).toBe(true);
    expect(isAllActive([2], options)).toBe(false);
  });
});

describe('URL and API params', () => {
  it('?outlets= is left out for "Tất cả"', () => {
    expect(outletsParam([2, 4], options)).toBeNull();
    expect(outletsParam([4], options)).toBe('4');
    expect(outletsParam([2, 4, 9], options)).toBe('2,4,9');
  });

  it('the API always gets the explicit ids while the picker is shown (all = active only)', () => {
    expect(selectionOutletIds([2, 4], options, true)).toEqual([2, 4]);
    expect(selectionOutletIds([2, 4], options, false)).toBeUndefined();
  });
});

describe('labels', () => {
  it('all, one, some', () => {
    expect(branchLabel([2, 4], options)).toEqual({ kind: 'all', count: 2 });
    expect(branchLabel([4], options)).toEqual({ kind: 'one', count: 1, name: 'Outlet 2' });
    expect(branchLabel([2, 4, 9], options)).toEqual({ kind: 'some', count: 3 });
  });
});

describe('browser storage', () => {
  function memory() {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
      setItem: (k: string, v: string) => void data.set(k, v),
    };
  }
  const throwing = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };

  it('per merchant key; round trip of ids and the sidebar label', () => {
    const s = memory();
    expect(branchStorageKey(5)).not.toBe(branchStorageKey(6));
    writeStoredBranches(s, 5, [4], { kind: 'one', count: 1, name: 'Outlet 2' });
    expect(readStoredBranches(s, 5)).toEqual([4]);
    expect(readStoredBranches(s, 6)).toBeNull();
    expect(readStoredBranchLabel(s)).toEqual({ kind: 'one', count: 1, name: 'Outlet 2' });
  });

  it('never throws: blocked or broken storage reads as nothing', () => {
    expect(() => writeStoredBranches(throwing, 5, [4], { kind: 'all', count: 2 })).not.toThrow();
    expect(readStoredBranches(throwing, 5)).toBeNull();
    expect(readStoredBranchLabel(throwing)).toBeNull();
    expect(readStoredBranches(null, 5)).toBeNull();
    const s = memory();
    s.setItem(branchStorageKey(5), '{oops');
    expect(readStoredBranches(s, 5)).toBeNull();
  });
});

describe('compareBranches', () => {
  const byOutlet = [
    { outletId: 4, outletName: 'Outlet 2', orderValue: 50000, collected: 40000, cashCollected: 40000, outstanding: 10000, newOrders: 1, collateralHeldOrders: 3 },
    { outletId: 2, outletName: 'Main Branch', orderValue: 140000, collected: 90000, cashCollected: 100000, outstanding: 40000, newOrders: 2, collateralHeldOrders: 5 },
  ];

  it('sorted by Giá trị đơn mới (desc) by default, bars and shares from it, total = sum', () => {
    const { rows, total } = compareBranches(byOutlet, options);
    expect(rows.map((r) => r.outletId)).toEqual([2, 4]);
    expect(rows[0].name).toBe('Main Branch');
    expect(rows[0].color).toBe(BRANCH_COLORS[0]);
    expect(rows[0].bar).toBe(100);
    expect(Math.round(rows[1].bar)).toBe(36);
    expect(rows.map((r) => r.share)).toEqual([74, 26]);
    expect(total).toEqual({ orderValue: 190000, collected: 140000, outstanding: 50000, newOrders: 3, collateralHeldOrders: 8, count: 2 });
  });

  it('Thực thu is cashCollected (as the card), else collected', () => {
    const { rows } = compareBranches([{ ...byOutlet[1], cashCollected: undefined as any }], options);
    expect(rows[0].collected).toBe(90000);
  });

  it('sorts by any column, both ways', () => {
    expect(compareBranches(byOutlet, options, { key: 'collateralHeldOrders', dir: 'asc' }).rows.map((r) => r.outletId)).toEqual([4, 2]);
    expect(compareBranches(byOutlet, options, { key: 'name', dir: 'asc' }).rows.map((r) => r.outletId)).toEqual([2, 4]);
  });

  it('no value at all: shares and bars are 0', () => {
    const zero = byOutlet.map((r) => ({ ...r, orderValue: 0 }));
    expect(compareBranches(zero, options).rows.map((r) => [r.bar, r.share])).toEqual([[0, 0], [0, 0]]);
  });
});

describe('Tháng trước (lastMonth)', () => {
  it('is a period of its own', () => {
    expect(OVERVIEW_PERIODS).toContain('lastMonth');
  });

  it('the previous calendar month of the shop day', () => {
    expect(periodRange('lastMonth', '2026-10-11')).toEqual({ startDate: '2026-09-01', endDate: '2026-09-30' });
    expect(periodRange('lastMonth', '2026-01-01')).toEqual({ startDate: '2025-12-01', endDate: '2025-12-31' });
    expect(periodRange('lastMonth', '2028-03-31')).toEqual({ startDate: '2028-02-01', endDate: '2028-02-29' });
    const range = periodRange('lastMonth', '2026-10-11');
    expect(chartRange('lastMonth', range)).toEqual(range);
  });
});
