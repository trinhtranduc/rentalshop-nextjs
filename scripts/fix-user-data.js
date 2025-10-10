#!/usr/bin/env node

/**
 * Fix User Data Script
 * Updates merchant users with proper firstName, lastName, and phone data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUserData() {
  console.log('🔧 Fixing user data...');
  
  try {
    // Get all merchant users
    const merchantUsers = await prisma.user.findMany({
      where: {
        role: 'MERCHANT'
      }
    });
    
    console.log(`📊 Found ${merchantUsers.length} merchant users`);
    
    for (const user of merchantUsers) {
      console.log(`🔍 Checking user: ${user.email}`);
      console.log(`   Current firstName: "${user.firstName}"`);
      console.log(`   Current lastName: "${user.lastName}"`);
      console.log(`   Current phone: "${user.phone}"`);
      
      // Extract merchant ID from email (merchant1@example.com -> 1)
      const merchantId = user.email.match(/merchant(\d+)@example\.com/)?.[1];
      
      if (merchantId) {
        const updates = {};
        
        // Fix firstName if missing
        if (!user.firstName || user.firstName.trim() === '') {
          updates.firstName = 'Merchant';
        }
        
        // Fix lastName if missing
        if (!user.lastName || user.lastName.trim() === '') {
          updates.lastName = merchantId;
        }
        
        // Fix phone if missing
        if (!user.phone || user.phone.trim() === '') {
          updates.phone = `+1-555-${String(merchantId).padStart(4, '0')}`;
        }
        
        if (Object.keys(updates).length > 0) {
          console.log(`   🔧 Updating user ${user.email} with:`, updates);
          
          await prisma.user.update({
            where: { id: user.id },
            data: updates
          });
          
          console.log(`   ✅ Updated user ${user.email}`);
        } else {
          console.log(`   ✅ User ${user.email} already has correct data`);
        }
      } else {
        console.log(`   ⚠️ Could not extract merchant ID from email: ${user.email}`);
      }
    }
    
    // Also fix outlet users
    const outletUsers = await prisma.user.findMany({
      where: {
        role: { in: ['OUTLET_ADMIN', 'OUTLET_STAFF'] }
      }
    });
    
    console.log(`\n📊 Found ${outletUsers.length} outlet users`);
    
    for (const user of outletUsers) {
      console.log(`🔍 Checking outlet user: ${user.email}`);
      console.log(`   Current firstName: "${user.firstName}"`);
      console.log(`   Current lastName: "${user.lastName}"`);
      console.log(`   Current phone: "${user.phone}"`);
      
      // Extract outlet ID from email (admin.outlet1@example.com -> 1)
      const outletId = user.email.match(/(?:admin|staff)\.outlet(\d+)@example\.com/)?.[1];
      
      if (outletId) {
        const updates = {};
        
        // Fix firstName if missing
        if (!user.firstName || user.firstName.trim() === '') {
          updates.firstName = user.role === 'OUTLET_ADMIN' ? 'Admin' : 'Staff';
        }
        
        // Fix lastName if missing
        if (!user.lastName || user.lastName.trim() === '') {
          updates.lastName = `Outlet ${outletId}`;
        }
        
        // Fix phone if missing (use a different pattern for outlet users)
        if (!user.phone || user.phone.trim() === '') {
          updates.phone = `+1-555-${String(2000 + parseInt(outletId)).padStart(4, '0')}`;
        }
        
        if (Object.keys(updates).length > 0) {
          console.log(`   🔧 Updating outlet user ${user.email} with:`, updates);
          
          await prisma.user.update({
            where: { id: user.id },
            data: updates
          });
          
          console.log(`   ✅ Updated outlet user ${user.email}`);
        } else {
          console.log(`   ✅ Outlet user ${user.email} already has correct data`);
        }
      } else {
        console.log(`   ⚠️ Could not extract outlet ID from email: ${user.email}`);
      }
    }
    
    // Fix admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        email: 'admin@rentalshop.com'
      }
    });
    
    if (adminUser) {
      console.log(`\n🔍 Checking admin user: ${adminUser.email}`);
      console.log(`   Current firstName: "${adminUser.firstName}"`);
      console.log(`   Current lastName: "${adminUser.lastName}"`);
      console.log(`   Current phone: "${adminUser.phone}"`);
      
      const updates = {};
      
      // Fix firstName if missing
      if (!adminUser.firstName || adminUser.firstName.trim() === '') {
        updates.firstName = 'Super';
      }
      
      // Fix lastName if missing
      if (!adminUser.lastName || adminUser.lastName.trim() === '') {
        updates.lastName = 'Administrator';
      }
      
      // Fix phone if missing
      if (!adminUser.phone || adminUser.phone.trim() === '') {
        updates.phone = '+1-555-0001';
      }
      
      if (Object.keys(updates).length > 0) {
        console.log(`   🔧 Updating admin user with:`, updates);
        
        await prisma.user.update({
          where: { id: adminUser.id },
          data: updates
        });
        
        console.log(`   ✅ Updated admin user`);
      } else {
        console.log(`   ✅ Admin user already has correct data`);
      }
    }
    
    console.log('\n✅ User data fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing user data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixUserData();
