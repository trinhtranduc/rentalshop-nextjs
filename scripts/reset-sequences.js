/**
 * Reset PostgreSQL Sequences Script
 * 
 * This script resets all PostgreSQL sequences to match the current max IDs in the database.
 * This fixes the "Unique constraint failed on the fields: (id)" error that occurs when
 * sequences are out of sync (e.g., after seed scripts manually inserted IDs).
 * 
 * Run with: node scripts/reset-sequences.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Tables with autoincrement IDs that need sequence reset
const tablesWithSequences = [
  'User',
  'Merchant',
  'Outlet',
  'Category',
  'Product',
  'Customer',
  'Order',
  'OrderItem',
  'Payment',
  'BillingCycle',
  'Subscription',
  'EmailVerification',
  'Session',
  'AuditLog'
];

async function resetSequences() {
  try {
    console.log('🔄 Starting sequence reset...\n');

    for (const tableName of tablesWithSequences) {
      try {
        // Get the max ID from the table
        const maxIdResult = await prisma.$queryRawUnsafe(`
          SELECT COALESCE(MAX(id), 0) as max_id 
          FROM "${tableName}"
        `);

        const maxId = parseInt(maxIdResult[0]?.max_id || '0', 10);
        
        // Reset the sequence to maxId + 1
        // PostgreSQL sequences are named as {table}_id_seq
        const sequenceName = `${tableName}_id_seq`;
        
        await prisma.$executeRawUnsafe(`
          SELECT setval('${sequenceName}', ${maxId}, true)
        `);

        console.log(`✅ Reset ${sequenceName}: next value will be ${maxId + 1}`);
      } catch (error) {
        // If table doesn't exist or sequence doesn't exist, skip it
        if (error.message.includes('does not exist') || error.message.includes('relation')) {
          console.log(`⚠️  Skipping ${tableName} (table or sequence doesn't exist)`);
        } else {
          console.error(`❌ Error resetting ${tableName}:`, error.message);
        }
      }
    }

    console.log('\n✅ All sequences reset successfully!');
    console.log('💡 You can now create new records without ID conflicts.\n');
  } catch (error) {
    console.error('❌ Error during sequence reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resetSequences()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

