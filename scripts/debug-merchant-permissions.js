/**
 * Script to debug merchant permissions for products and categories
 * 
 * Usage:
 *   node scripts/debug-merchant-permissions.js <merchant_id>
 * 
 * Example:
 *   node scripts/debug-merchant-permissions.js 5
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugMerchantPermissions(merchantId) {
  console.log('🔍 Debugging Merchant Permissions');
  console.log('================================\n');
  
  try {
    // 1. Get merchant info
    const merchant = await prisma.merchant.findUnique({
      where: { id: parseInt(merchantId) },
      select: {
        id: true,
        name: true,
      }
    });

    if (!merchant) {
      console.error(`❌ Merchant with ID ${merchantId} not found`);
      process.exit(1);
    }

    console.log(`📋 Merchant: ${merchant.name} (ID: ${merchant.id})\n`);

    // 2. Check for custom MerchantRole that might override MERCHANT permissions
    console.log('🔍 Checking for custom MerchantRole...');
    const customMerchantRole = await prisma.merchantRole.findFirst({
      where: {
        merchantId: merchant.id,
        isSystemRole: true,
        systemRole: 'MERCHANT',
        isActive: true
      },
      select: {
        id: true,
        roleName: true,
        isSystemRole: true,
        systemRole: true,
        permissions: true,
        isActive: true
      }
    });

    if (customMerchantRole) {
      console.log('⚠️  FOUND CUSTOM MERCHANT ROLE:');
      console.log(`   - Role Name: ${customMerchantRole.roleName}`);
      console.log(`   - System Role: ${customMerchantRole.systemRole}`);
      console.log(`   - Permissions Count: ${customMerchantRole.permissions.length}`);
      console.log(`   - Permissions:`, customMerchantRole.permissions);
      
      const hasProductsManage = customMerchantRole.permissions.includes('products.manage');
      console.log(`   - Has products.manage: ${hasProductsManage ? '✅' : '❌'}`);
      
      if (!hasProductsManage) {
        console.log('\n❌ PROBLEM FOUND: Custom MerchantRole does NOT have products.manage permission!');
        console.log('   This is overriding default MERCHANT permissions.\n');
        
        // Show default MERCHANT permissions for comparison
        const defaultMerchantPermissions = [
          'merchant.manage', 'merchant.view',
          'outlet.manage', 'outlet.view',
          'users.manage', 'users.view',
          'products.manage', 'products.view', 'products.export',
          'orders.create', 'orders.view', 'orders.update', 'orders.delete', 'orders.export', 'orders.manage',
          'customers.manage', 'customers.view', 'customers.export',
          'analytics.view',
          'analytics.view.dashboard',
          'analytics.view.revenue',
          'analytics.view.orders',
          'analytics.view.customers',
          'analytics.view.products',
          'analytics.export',
          'billing.view',
          'bankAccounts.manage', 'bankAccounts.view'
        ];
        
        console.log('📋 Default MERCHANT permissions should include:');
        console.log('   - products.manage ✅');
        console.log('   - products.view ✅');
        console.log('   - products.export ✅');
        
        console.log('\n💡 SOLUTION:');
        console.log('   1. Add products.manage to custom MerchantRole permissions');
        console.log('   2. OR delete/disable the custom MerchantRole to use default permissions');
        console.log('   3. OR update the custom MerchantRole to include all necessary permissions\n');
      }
    } else {
      console.log('✅ No custom MerchantRole found - using default MERCHANT permissions');
      console.log('   Default MERCHANT permissions include products.manage ✅\n');
    }

    // 3. Check users with MERCHANT role in this merchant
    console.log('🔍 Checking MERCHANT users in this merchant...');
    const merchantUsers = await prisma.user.findMany({
      where: {
        merchantId: merchant.id,
        role: 'MERCHANT',
        isActive: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        customRoleId: true,
        merchantId: true
      }
    });

    console.log(`   Found ${merchantUsers.length} MERCHANT user(s):`);
    merchantUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`);
      if (user.customRoleId) {
        console.log(`      ⚠️  Has customRoleId: ${user.customRoleId}`);
      }
    });
    console.log('');

    // 4. Summary
    console.log('📊 SUMMARY:');
    if (customMerchantRole) {
      const hasProductsManage = customMerchantRole.permissions.includes('products.manage');
      if (!hasProductsManage) {
        console.log('   ❌ Merchant does NOT have products.manage permission');
        console.log('   ❌ Cause: Custom MerchantRole is overriding default permissions');
        console.log('   ❌ Fix: Add products.manage to custom MerchantRole or remove customization');
      } else {
        console.log('   ✅ Merchant has products.manage permission');
      }
    } else {
      console.log('   ✅ Merchant should have products.manage (using default permissions)');
      console.log('   ⚠️  If still having issues, check:');
      console.log('      1. API login/verify response includes permissions');
      console.log('      2. Frontend stores permissions in localStorage');
      console.log('      3. usePermissions hook loads permissions correctly');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get merchant ID from command line args
const merchantId = process.argv[2];

if (!merchantId) {
  console.error('❌ Please provide merchant ID');
  console.log('Usage: node scripts/debug-merchant-permissions.js <merchant_id>');
  process.exit(1);
}

debugMerchantPermissions(merchantId)
  .then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

