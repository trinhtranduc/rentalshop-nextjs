/**
 * Test for getCurrentEntityCounts function
 * Tests user counting logic: count active + inactive, exclude deleted + ADMIN
 */

import { PrismaClient } from '@prisma/client';
import { getCurrentEntityCounts } from '../packages/utils/src/core/validation';
import { USER_ROLE } from '@rentalshop/constants';

const prisma = new PrismaClient();

describe('getCurrentEntityCounts', () => {
  let testMerchantId: number;
  let testOutletId: number;
  let createdUserIds: number[] = [];

  beforeAll(async () => {
    // Create test merchant
    const merchant = await prisma.merchant.create({
      data: {
        name: 'Test Merchant for Entity Counts',
        email: `test-merchant-${Date.now()}@test.com`,
        phone: '1234567890',
      },
    });
    testMerchantId = merchant.id;

    // Create test outlet
    const outlet = await prisma.outlet.create({
      data: {
        merchantId: merchant.id,
        name: 'Test Outlet',
        address: 'Test Address',
      },
    });
    testOutletId = outlet.id;
  });

  afterAll(async () => {
    // Cleanup: Delete all test users
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }

    // Delete test outlet
    if (testOutletId) {
      await prisma.outlet.deleteMany({
        where: { id: testOutletId },
      });
    }

    // Delete test merchant
    if (testMerchantId) {
      await prisma.merchant.deleteMany({
        where: { id: testMerchantId },
      });
    }

    await prisma.$disconnect();
  });

  beforeEach(() => {
    createdUserIds = [];
  });

  afterEach(async () => {
    // Cleanup test users after each test
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
      createdUserIds = [];
    }
  });

  describe('User counting logic', () => {
    it('should count active users', async () => {
      // Create 2 active users
      const user1 = await prisma.user.create({
        data: {
          email: `active1-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Active',
          lastName: 'User1',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: true,
        },
      });

      const user2 = await prisma.user.create({
        data: {
          email: `active2-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Active',
          lastName: 'User2',
          role: USER_ROLE.OUTLET_ADMIN,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: true,
        },
      });

      createdUserIds.push(user1.id, user2.id);

      const counts = await getCurrentEntityCounts(testMerchantId);

      expect(counts.users).toBe(2);
    });

    it('should count inactive users', async () => {
      // Create 2 inactive users
      const user1 = await prisma.user.create({
        data: {
          email: `inactive1-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Inactive',
          lastName: 'User1',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: false,
        },
      });

      const user2 = await prisma.user.create({
        data: {
          email: `inactive2-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Inactive',
          lastName: 'User2',
          role: USER_ROLE.MERCHANT,
          merchantId: testMerchantId,
          isActive: false,
        },
      });

      createdUserIds.push(user1.id, user2.id);

      const counts = await getCurrentEntityCounts(testMerchantId);

      expect(counts.users).toBe(2);
    });

    it('should count both active and inactive users', async () => {
      // Create mix of active and inactive users
      const activeUser = await prisma.user.create({
        data: {
          email: `active-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Active',
          lastName: 'User',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: true,
        },
      });

      const inactiveUser = await prisma.user.create({
        data: {
          email: `inactive-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Inactive',
          lastName: 'User',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: false,
        },
      });

      createdUserIds.push(activeUser.id, inactiveUser.id);

      const counts = await getCurrentEntityCounts(testMerchantId);

      expect(counts.users).toBe(2);
    });

    it('should exclude deleted users', async () => {
      // Create active user
      const activeUser = await prisma.user.create({
        data: {
          email: `active-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Active',
          lastName: 'User',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: true,
        },
      });

      // Create deleted user
      const deletedUser = await prisma.user.create({
        data: {
          email: `deleted-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Deleted',
          lastName: 'User',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: true,
          deletedAt: new Date(),
        },
      });

      createdUserIds.push(activeUser.id, deletedUser.id);

      const counts = await getCurrentEntityCounts(testMerchantId);

      expect(counts.users).toBe(1); // Only active user, deleted user excluded
    });

    it('should exclude ADMIN users', async () => {
      // Create regular user
      const regularUser = await prisma.user.create({
        data: {
          email: `regular-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Regular',
          lastName: 'User',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: true,
        },
      });

      // Create ADMIN user
      const adminUser = await prisma.user.create({
        data: {
          email: `admin-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Admin',
          lastName: 'User',
          role: USER_ROLE.ADMIN,
          merchantId: testMerchantId,
          isActive: true,
        },
      });

      createdUserIds.push(regularUser.id, adminUser.id);

      const counts = await getCurrentEntityCounts(testMerchantId);

      expect(counts.users).toBe(1); // Only regular user, ADMIN excluded
    });

    it('should exclude both deleted and ADMIN users', async () => {
      // Create regular active user
      const regularUser = await prisma.user.create({
        data: {
          email: `regular-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Regular',
          lastName: 'User',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: true,
        },
      });

      // Create deleted user
      const deletedUser = await prisma.user.create({
        data: {
          email: `deleted-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Deleted',
          lastName: 'User',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: true,
          deletedAt: new Date(),
        },
      });

      // Create ADMIN user
      const adminUser = await prisma.user.create({
        data: {
          email: `admin-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Admin',
          lastName: 'User',
          role: USER_ROLE.ADMIN,
          merchantId: testMerchantId,
          isActive: true,
        },
      });

      createdUserIds.push(regularUser.id, deletedUser.id, adminUser.id);

      const counts = await getCurrentEntityCounts(testMerchantId);

      expect(counts.users).toBe(1); // Only regular user, deleted and ADMIN excluded
    });

    it('should count inactive but not deleted users', async () => {
      // Create inactive but not deleted user
      const inactiveUser = await prisma.user.create({
        data: {
          email: `inactive-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Inactive',
          lastName: 'User',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: false,
        },
      });

      // Create inactive and deleted user
      const inactiveDeletedUser = await prisma.user.create({
        data: {
          email: `inactive-deleted-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Inactive',
          lastName: 'Deleted',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: false,
          deletedAt: new Date(),
        },
      });

      createdUserIds.push(inactiveUser.id, inactiveDeletedUser.id);

      const counts = await getCurrentEntityCounts(testMerchantId);

      expect(counts.users).toBe(1); // Only inactive but not deleted user
    });

    it('should handle complex scenario with all user types', async () => {
      // Create various user types
      const activeRegular = await prisma.user.create({
        data: {
          email: `active-regular-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Active',
          lastName: 'Regular',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: true,
        },
      });

      const inactiveRegular = await prisma.user.create({
        data: {
          email: `inactive-regular-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Inactive',
          lastName: 'Regular',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: false,
        },
      });

      const activeDeleted = await prisma.user.create({
        data: {
          email: `active-deleted-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Active',
          lastName: 'Deleted',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: true,
          deletedAt: new Date(),
        },
      });

      const inactiveDeleted = await prisma.user.create({
        data: {
          email: `inactive-deleted-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Inactive',
          lastName: 'Deleted',
          role: USER_ROLE.OUTLET_STAFF,
          merchantId: testMerchantId,
          outletId: testOutletId,
          isActive: false,
          deletedAt: new Date(),
        },
      });

      const activeAdmin = await prisma.user.create({
        data: {
          email: `active-admin-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Active',
          lastName: 'Admin',
          role: USER_ROLE.ADMIN,
          merchantId: testMerchantId,
          isActive: true,
        },
      });

      const inactiveAdmin = await prisma.user.create({
        data: {
          email: `inactive-admin-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Inactive',
          lastName: 'Admin',
          role: USER_ROLE.ADMIN,
          merchantId: testMerchantId,
          isActive: false,
        },
      });

      createdUserIds.push(
        activeRegular.id,
        inactiveRegular.id,
        activeDeleted.id,
        inactiveDeleted.id,
        activeAdmin.id,
        inactiveAdmin.id
      );

      const counts = await getCurrentEntityCounts(testMerchantId);

      // Should count: activeRegular + inactiveRegular = 2
      // Exclude: activeDeleted, inactiveDeleted, activeAdmin, inactiveAdmin
      expect(counts.users).toBe(2);
    });
  });

  describe('Other entity counts', () => {
    it('should count outlets correctly', async () => {
      const counts = await getCurrentEntityCounts(testMerchantId);
      expect(counts.outlets).toBeGreaterThanOrEqual(1); // At least the test outlet
    });

    it('should count products correctly', async () => {
      // Create a test product
      const product = await prisma.product.create({
        data: {
          merchantId: testMerchantId,
          outletId: testOutletId,
          name: 'Test Product',
          rentPrice: 100,
          stock: 10,
        },
      });

      const counts = await getCurrentEntityCounts(testMerchantId);
      expect(counts.products).toBeGreaterThanOrEqual(1);

      // Cleanup
      await prisma.product.delete({ where: { id: product.id } });
    });

    it('should count customers correctly', async () => {
      // Create a test customer
      const customer = await prisma.customer.create({
        data: {
          merchantId: testMerchantId,
          firstName: 'Test',
          lastName: 'Customer',
        },
      });

      const counts = await getCurrentEntityCounts(testMerchantId);
      expect(counts.customers).toBeGreaterThanOrEqual(1);

      // Cleanup
      await prisma.customer.delete({ where: { id: customer.id } });
    });

    it('should count orders correctly', async () => {
      // Create a test order
      const order = await prisma.order.create({
        data: {
          outletId: testOutletId,
          orderNumber: `TEST-${Date.now()}`,
          orderType: 'RENT',
          status: 'RESERVED',
          totalAmount: 100,
        },
      });

      const counts = await getCurrentEntityCounts(testMerchantId);
      expect(counts.orders).toBeGreaterThanOrEqual(1);

      // Cleanup
      await prisma.order.delete({ where: { id: order.id } });
    });
  });
});
