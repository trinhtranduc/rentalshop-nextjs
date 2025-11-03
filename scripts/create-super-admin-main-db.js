#!/usr/bin/env node

/**
 * Script to create a super admin user in Main Database (for multi-tenant)
 * 
 * Usage:
 *   # Create admin with default credentials
 *   node scripts/create-super-admin-main-db.js
 * 
 *   # Create admin with custom email/password
 *   ADMIN_EMAIL="admin@rentalshop.com" ADMIN_PASSWORD="admin123" node scripts/create-super-admin-main-db.js
 */

const { getMainDb } = require('../packages/database/dist/index');
const bcrypt = require('bcryptjs');

async function createSuperAdmin() {
  console.log('\n🔍 Connecting to Main Database...');
  
  const mainDb = await getMainDb();
  await mainDb.connect();
  
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@rentalshop.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const firstName = process.env.ADMIN_FIRST_NAME || 'Super';
    const lastName = process.env.ADMIN_LAST_NAME || 'Administrator';
    const phone = process.env.ADMIN_PHONE || '+1-555-0001';

    console.log('\n👑 Creating super admin user in Main DB...');
    console.log(`Email: ${email}`);
    console.log(`Name: ${firstName} ${lastName}`);

    // Check if admin already exists
    const existing = await mainDb.query(
      'SELECT id, email, role FROM "User" WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      console.log(`\n⚠️  Admin user already exists: ${email}`);
      console.log('   User ID:', existing.rows[0].id);
      console.log('   Role:', existing.rows[0].role);
      console.log('\n✅ Skipping creation (user already exists)');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user (admin users don't need email verification)
    const result = await mainDb.query(
      'INSERT INTO "User" (email, password, "firstName", "lastName", phone, role, "isActive", "emailVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, true, true, NOW(), NOW()) RETURNING id, email, "firstName", "lastName", role',
      [email, hashedPassword, firstName, lastName, phone, 'ADMIN']
    );

    const admin = result.rows[0];

    console.log('\n✅ Super admin created successfully!');
    console.log('   ID:', admin.id);
    console.log('   Email:', admin.email);
    console.log('   Name:', admin.firstName, admin.lastName);
    console.log('   Role:', admin.role);
    console.log('\n📝 Login credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);

  } catch (error) {
    console.error('\n❌ Error creating super admin:', error.message);
    console.error('   Details:', error);
    throw error;
  } finally {
    await mainDb.end();
  }
}

// Run script
createSuperAdmin()
  .then(() => {
    console.log('\n✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });

