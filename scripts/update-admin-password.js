#!/usr/bin/env node

/**
 * Script to update admin password with a strong password
 * 
 * Usage:
 *   # Update admin password with auto-generated strong password
 *   node scripts/update-admin-password.js
 * 
 *   # Update admin password with custom email
 *   ADMIN_EMAIL="admin@rentalshop.com" node scripts/update-admin-password.js
 * 
 *   # Update admin password with custom strong password
 *   ADMIN_EMAIL="admin@rentalshop.com" ADMIN_PASSWORD="YourStrongPassword123!@#" node scripts/update-admin-password.js
 * 
 *   # On Railway Development
 *   railway run --service apis --environment development node scripts/update-admin-password.js
 * 
 *   # On Railway Production (⚠️ WARNING: Production!)
 *   railway run --service apis --environment production node scripts/update-admin-password.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Generate a strong password
function generateStrongPassword(length = 20) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = lowercase + uppercase + numbers + symbols;
  
  // Ensure at least one character from each category
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to avoid predictable pattern
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Validate password strength
function validatePasswordStrength(password) {
  const minLength = 16;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
  
  if (password.length < minLength) {
    return { valid: false, reason: `Password must be at least ${minLength} characters long` };
  }
  if (!hasLowercase) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter' };
  }
  if (!hasUppercase) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter' };
  }
  if (!hasNumber) {
    return { valid: false, reason: 'Password must contain at least one number' };
  }
  if (!hasSymbol) {
    return { valid: false, reason: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)' };
  }
  
  return { valid: true };
}

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
      console.error('   railway run --service apis node scripts/update-admin-password.js');
    } else if (error.message.includes('authentication failed')) {
      console.error('💡 Authentication failed - check database credentials in DATABASE_URL');
    } else if (error.message.includes('database')) {
      console.error('💡 Database may not exist - run: npx prisma db push');
    }
    
    throw error;
  }
}

async function updateAdminPassword() {
  // Test database connection first
  await testDatabaseConnection();
  
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@rentalshop.com';
    let password = process.env.ADMIN_PASSWORD;
    
    // Generate strong password if not provided
    if (!password) {
      password = generateStrongPassword(20);
      console.log('\n🔐 Generated strong password automatically');
    } else {
      // Validate provided password
      const validation = validatePasswordStrength(password);
      if (!validation.valid) {
        console.error(`\n❌ Password validation failed: ${validation.reason}`);
        console.error('\n💡 Password requirements:');
        console.error('  - At least 16 characters long');
        console.error('  - Contains lowercase letters (a-z)');
        console.error('  - Contains uppercase letters (A-Z)');
        console.error('  - Contains numbers (0-9)');
        console.error('  - Contains special characters (!@#$%^&*()_+-=[]{}|;:,.<>?)');
        process.exit(1);
      }
      console.log('\n🔐 Using provided password');
    }

    console.log(`\n👑 Updating admin password...`);
    console.log(`Email: ${email}`);

    // Check if admin exists
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, firstName: true, lastName: true }
    });

    if (!existing) {
      console.error(`\n❌ Admin user not found: ${email}`);
      console.error('\n💡 To create admin user, run:');
      console.error('   node scripts/create-super-admin.js');
      process.exit(1);
    }

    if (existing.role !== 'ADMIN') {
      console.error(`\n❌ User found but is not an ADMIN: ${existing.role}`);
      console.error(`   Email: ${existing.email}`);
      process.exit(1);
    }

    console.log(`\n✅ Admin user found:`);
    console.log(`   ID: ${existing.id}`);
    console.log(`   Email: ${existing.email}`);
    console.log(`   Name: ${existing.firstName} ${existing.lastName}`);
    console.log(`   Role: ${existing.role}`);

    // Hash password with bcrypt (12 rounds for better security)
    console.log('\n🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and set passwordChangedAt to invalidate old tokens
    console.log('💾 Updating password in database...');
    await prisma.user.update({
      where: { email },
      data: { 
        password: hashedPassword,
        passwordChangedAt: new Date() // Invalidate all existing tokens
      }
    });

    console.log('\n✅ Password updated successfully!');
    console.log('\n📋 Updated Account Details:');
    console.log(`   Email: ${existing.email}`);
    console.log(`   Name: ${existing.firstName} ${existing.lastName}`);
    console.log(`   Role: ${existing.role}`);
    console.log('\n🔑 New Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
    console.log('   1. Save this password securely (password manager recommended)');
    console.log('   2. All existing sessions have been invalidated');
    console.log('   3. User must login again with new password');
    console.log('   4. Consider rotating this password every 3-6 months');

  } catch (error) {
    console.error('\n❌ Error updating admin password:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run script
updateAdminPassword();
