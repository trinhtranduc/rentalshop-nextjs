/**
 * Test script for getCurrentEntityCounts function
 * Tests user counting logic: count active + inactive, exclude deleted + ADMIN
 */

import { PrismaClient } from '@prisma/client';
import { getCurrentEntityCounts } from '../packages/utils/src/core/validation';
import { USER_ROLE } from '@rentalshop/constants';

const prisma = new PrismaClient();

let testMerchantId: number;
let testOutletId: number;
let createdUserIds: number[] = [];

async function setupTestData() {
  console.log('🔧 Setting up test data...');
  
  // Create test merchant
  const merchant = await prisma.merchant.create({
    data: {
      name: `Test Merchant for Entity Counts ${Date.now()}`,
      email: `test-merchant-${Date.now()}@test.com`,
      phone: '1234567890',
    },
  });
  testMerchantId = merchant.id;
  console.log(`✅ Created test merchant: ${merchant.name} (ID: ${testMerchantId})`);

  // Create test outlet
  const outlet = await prisma.outlet.create({
    data: {
      merchantId: merchant.id,
      name: 'Test Outlet',
      address: 'Test Address',
    },
  });
  testOutletId = outlet.id;
  console.log(`✅ Created test outlet: ${outlet.name} (ID: ${testOutletId})`);
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  // Cleanup: Delete all test users
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
    console.log(`✅ Deleted ${createdUserIds.length} test users`);
  }

  // Delete test outlet
  if (testOutletId) {
    await prisma.outlet.deleteMany({
      where: { id: testOutletId },
    });
    console.log(`✅ Deleted test outlet`);
  }

  // Delete test merchant
  if (testMerchantId) {
    await prisma.merchant.deleteMany({
      where: { id: testMerchantId },
    });
    console.log(`✅ Deleted test merchant`);
  }
}

async function testCase(name: string, testFn: () => Promise<void>) {
  console.log(`\n🧪 Test: ${name}`);
  try {
    // Cleanup before test
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
      createdUserIds = [];
    }
    
    await testFn();
    console.log(`   ✅ PASSED`);
  } catch (error: any) {
    console.log(`   ❌ FAILED: ${error.message}`);
    throw error;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 Testing getCurrentEntityCounts Function');
  console.log('='.repeat(80));

  try {
    await setupTestData();

    // Test 1: Count active users
    await testCase('Should count active users', async () => {
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
      
      if (counts.users !== 2) {
        throw new Error(`Expected 2 users, got ${counts.users}`);
      }
    });

    // Test 2: Count inactive users
    await testCase('Should count inactive users', async () => {
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
      
      if (counts.users !== 2) {
        throw new Error(`Expected 2 users, got ${counts.users}`);
      }
    });

    // Test 3: Count both active and inactive users
    await testCase('Should count both active and inactive users', async () => {
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
      
      if (counts.users !== 2) {
        throw new Error(`Expected 2 users, got ${counts.users}`);
      }
    });

    // Test 4: Exclude deleted users
    await testCase('Should exclude deleted users', async () => {
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
      
      if (counts.users !== 1) {
        throw new Error(`Expected 1 user, got ${counts.users}`);
      }
    });

    // Test 5: Exclude ADMIN users
    await testCase('Should exclude ADMIN users', async () => {
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
      
      if (counts.users !== 1) {
        throw new Error(`Expected 1 user, got ${counts.users}`);
      }
    });

    // Test 6: Exclude both deleted and ADMIN users
    await testCase('Should exclude both deleted and ADMIN users', async () => {
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
      
      if (counts.users !== 1) {
        throw new Error(`Expected 1 user, got ${counts.users}`);
      }
    });

    // Test 7: Complex scenario
    await testCase('Should handle complex scenario with all user types', async () => {
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
      if (counts.users !== 2) {
        throw new Error(`Expected 2 users, got ${counts.users}`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ All tests passed!');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await cleanupTestData();
    await prisma.$disconnect();
  }
}

// Run tests
runTests()
  .then(() => {
    console.log('\n✅ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
