/**
 * Addon deletion validation — soft-deleted user accounts must not block addon removal.
 */

import { PrismaClient } from '@prisma/client';
import { USER_ROLE } from '@rentalshop/constants';
import {
  getEntityCountsForAddonDeletion,
  countMerchantUsersForPlanLimit,
} from '../../../packages/utils/src/core/validation/entity-counts';

const prisma = new PrismaClient();

describe('getEntityCountsForAddonDeletion', () => {
  let testMerchantId: number;
  let testOutletId: number;
  let testPlanId: number;
  let createdUserIds: number[] = [];

  beforeAll(async () => {
    const plan = await prisma.plan.create({
      data: {
        name: `test-plan-addon-${Date.now()}`,
        description: 'Test plan',
        basePrice: 10,
        limits: JSON.stringify({ outlets: 5, users: 5, products: 100, customers: 100, orders: -1 }),
        features: '[]',
      },
    });
    testPlanId = plan.id;

    const merchant = await prisma.merchant.create({
      data: {
        name: 'Addon Deletion Test Merchant',
        email: `addon-del-${Date.now()}@test.com`,
        phone: '0900000001',
        planId: testPlanId,
      },
    });
    testMerchantId = merchant.id;

    const outlet = await prisma.outlet.create({
      data: {
        merchantId: merchant.id,
        name: 'Test Outlet',
        address: 'Test',
      },
    });
    testOutletId = outlet.id;
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (testOutletId) {
      await prisma.outlet.deleteMany({ where: { id: testOutletId } });
    }
    if (testMerchantId) {
      await prisma.merchant.deleteMany({ where: { id: testMerchantId } });
    }
    if (testPlanId) {
      await prisma.plan.deleteMany({ where: { id: testPlanId } });
    }
    await prisma.$disconnect();
  });

  afterEach(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      createdUserIds = [];
    }
  });

  it('excludes soft-deleted user accounts from user count', async () => {
    const activeUser = await prisma.user.create({
      data: {
        email: `addon-active-${Date.now()}@test.com`,
        password: 'hashed',
        firstName: 'Active',
        lastName: 'User',
        role: USER_ROLE.OUTLET_STAFF,
        merchantId: testMerchantId,
        outletId: testOutletId,
        isActive: true,
      },
    });

    const deletedUser = await prisma.user.create({
      data: {
        email: `addon-deleted-${Date.now()}@test.com`,
        password: 'hashed',
        firstName: 'Deleted',
        lastName: 'User',
        role: USER_ROLE.OUTLET_STAFF,
        merchantId: testMerchantId,
        outletId: testOutletId,
        isActive: false,
        deletedAt: new Date(),
      },
    });

    createdUserIds.push(activeUser.id, deletedUser.id);

    const userCount = await countMerchantUsersForPlanLimit(testMerchantId);
    const counts = await getEntityCountsForAddonDeletion(testMerchantId);

    expect(userCount).toBe(1);
    expect(counts.users).toBe(1);
  });

  it('still counts inactive but non-deleted users', async () => {
    const inactiveUser = await prisma.user.create({
      data: {
        email: `addon-inactive-${Date.now()}@test.com`,
        password: 'hashed',
        firstName: 'Inactive',
        lastName: 'User',
        role: USER_ROLE.OUTLET_STAFF,
        merchantId: testMerchantId,
        outletId: testOutletId,
        isActive: false,
      },
    });

    createdUserIds.push(inactiveUser.id);

    const counts = await getEntityCountsForAddonDeletion(testMerchantId);
    expect(counts.users).toBe(1);
  });
});
