/**
 * validateAddonDeletion — only checks limits affected by the addon being removed.
 */

jest.mock('../../../packages/utils/src/core/validation/plan-limits', () => ({
  getPlanLimitsInfo: jest.fn(),
}));

jest.mock('../../../packages/utils/src/core/validation/entity-counts', () => ({
  getEntityCountsForAddonDeletion: jest.fn(),
}));

import { validateAddonDeletion } from '../../../packages/utils/src/core/validation/addon-deletion';
import { getPlanLimitsInfo } from '../../../packages/utils/src/core/validation/plan-limits';
import { getEntityCountsForAddonDeletion } from '../../../packages/utils/src/core/validation/entity-counts';

const mockPlanInfo = {
  planLimits: { outlets: 1, users: 5, products: 2000, customers: 2000, orders: 2000 },
  basePlanLimits: { outlets: 1, users: 2, products: 2000, customers: 2000, orders: 2000 },
};

describe('validateAddonDeletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPlanLimitsInfo as jest.Mock).mockResolvedValue(mockPlanInfo);
  });

  it('allows deleting +1 user addon (Basic 2 + addons 1+2) with 4 users', async () => {
    (getEntityCountsForAddonDeletion as jest.Mock).mockResolvedValue({
      outlets: 2,
      users: 4,
      products: 10,
      customers: 5,
      orders: 0,
    });

    const removingPlusOne = await validateAddonDeletion(1, {
      outlets: 0,
      users: 1,
      products: 0,
      customers: 0,
      orders: 0,
    });
    expect(removingPlusOne.isValid).toBe(true);
  });

  it('blocks deleting +2 user addon when 4 users exceed future limit of 3', async () => {
    (getEntityCountsForAddonDeletion as jest.Mock).mockResolvedValue({
      outlets: 2,
      users: 4,
      products: 10,
      customers: 5,
      orders: 0,
    });

    const removingPlusTwo = await validateAddonDeletion(1, {
      outlets: 0,
      users: 2,
      products: 0,
      customers: 0,
      orders: 0,
    });
    expect(removingPlusTwo.isValid).toBe(false);
    expect(removingPlusTwo.exceededLimits).toEqual([
      { entityType: 'users', current: 4, futureLimit: 3 },
    ]);
  });

  it('does not block user-addon deletion when outlets exceed plan limit', async () => {
    (getEntityCountsForAddonDeletion as jest.Mock).mockResolvedValue({
      outlets: 2,
      users: 4,
      products: 10,
      customers: 5,
      orders: 0,
    });

    const result = await validateAddonDeletion(1, {
      outlets: 0,
      users: 1,
      products: 0,
      customers: 0,
      orders: 0,
    });

    expect(result.isValid).toBe(true);
    expect(result.exceededLimits).toBeUndefined();
  });

  it('blocks when users exceed future limit after removing user addon', async () => {
    (getEntityCountsForAddonDeletion as jest.Mock).mockResolvedValue({
      outlets: 1,
      users: 5,
      products: 10,
      customers: 5,
      orders: 0,
    });

    const result = await validateAddonDeletion(1, {
      outlets: 0,
      users: 2,
      products: 0,
      customers: 0,
      orders: 0,
    });

    expect(result.isValid).toBe(false);
    expect(result.exceededLimits).toEqual([{ entityType: 'users', current: 5, futureLimit: 3 }]);
  });

  it('validates outlet addon only against outlets', async () => {
    (getPlanLimitsInfo as jest.Mock).mockResolvedValue({
      planLimits: { outlets: 3, users: 5, products: 2000, customers: 2000, orders: 2000 },
      basePlanLimits: { outlets: 1, users: 2, products: 2000, customers: 2000, orders: 2000 },
    });
    (getEntityCountsForAddonDeletion as jest.Mock).mockResolvedValue({
      outlets: 3,
      users: 10,
      products: 10,
      customers: 5,
      orders: 0,
    });

    const result = await validateAddonDeletion(1, {
      outlets: 2,
      users: 0,
      products: 0,
      customers: 0,
      orders: 0,
    });

    expect(result.isValid).toBe(false);
    expect(result.exceededLimits).toEqual([{ entityType: 'outlets', current: 3, futureLimit: 1 }]);
  });
});
