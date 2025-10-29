#!/usr/bin/env node

/**
 * Script to create a super admin user in the database
 * 
 * Usage:
 *   # Create admin with default credentials
 *   node scripts/create-super-admin.js
 * 
 *   # Create admin with custom email/password
 *   ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="secure123" node scripts/create-super-admin.js
 * 
 *   # On Railway
 *   railway run --service apis node scripts/create-super-admin.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Helper function to mask sensitive information in DATABASE_URL
function maskDatabaseUrl(url) {
  if (!url) return 'Not set';
  try {
    const urlObj = new URL(url);
    if (urlObj.password) {
      urlObj.password = '***';
    }
    return urlObj.toString();
  } catch (e) {
    return url.substring(0, 20) + '...';
  }
}

// Test database connection
async function testDatabaseConnection() {
  console.log('\n🔍 Checking database connection...');
  
  const dbUrl = process.env.DATABASE_URL;
  const maskedUrl = maskDatabaseUrl(dbUrl);
  console.log(`📊 DATABASE_URL: ${maskedUrl}`);
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set!\n' +
      'Please ensure DATABASE_URL is configured:\n' +
      '  - On Railway: railway variables --service apis\n' +
      '  - Locally: Set DATABASE_URL in .env file');
  }
  
  try {
    // Test connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful\n');
    return true;
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error(`Error: ${error.message}\n`);
    
    if (error.message.includes('Can\'t reach database server')) {
      console.error('💡 Possible solutions:');
      console.error('  1. Ensure PostgreSQL service is running on Railway');
      console.error('  2. Check if DATABASE_URL is correct');
      console.error('  3. Verify network connectivity to database');
      console.error('  4. If running locally, ensure DATABASE_URL uses public URL, not internal Railway URL');
      console.error('');
      console.error('   For Railway, ensure you use:');
      console.error('   railway run --service apis node scripts/create-super-admin.js');
    } else if (error.message.includes('authentication failed')) {
      console.error('💡 Authentication failed - check database credentials in DATABASE_URL');
    } else if (error.message.includes('database')) {
      console.error('💡 Database may not exist - run: npx prisma db push');
    }
    
    throw error;
  }
}

async function createSuperAdmin() {
  // Test database connection first
  await testDatabaseConnection();
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@rentalshop.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const firstName = process.env.ADMIN_FIRST_NAME || 'Super';
    const lastName = process.env.ADMIN_LAST_NAME || 'Administrator';
    const phone = process.env.ADMIN_PHONE || '+1-555-0001';

    console.log('\n👑 Creating super admin user...');
    console.log(`Email: ${email}`);
    console.log(`Name: ${firstName} ${lastName}`);

    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true }
    });

    if (existing) {
      console.log(`\n⚠️  Admin user already exists: ${email}`);
      console.log(`   Role: ${existing.role}`);
      console.log(`   ID: ${existing.id}`);
      
      // Ask if user wants to update password
      const updatePassword = process.env.UPDATE_PASSWORD === 'true';
      if (updatePassword) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { email },
          data: { password: hashedPassword }
        });
        console.log(`\n✅ Updated password for admin: ${email}`);
      } else {
        console.log(`\n💡 To update password, set UPDATE_PASSWORD=true`);
      }
      
      await prisma.$disconnect();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create super admin
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: 'ADMIN',
        isActive: true,
        // Super admin không thuộc merchant hoặc outlet nào
        merchantId: null,
        outletId: null
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    console.log('\n✅ Super admin created successfully!');
    console.log('\n📋 Account Details:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Active: ${admin.isActive ? 'Yes' : 'No'}`);
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Please change the default password after first login!');

  } catch (error) {
    console.error('\n❌ Error creating super admin:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run script
createSuperAdmin();

