#!/usr/bin/env tsx
/**
 * Fix Database Sequences
 * Fixes PostgreSQL sequences that are out of sync
 * 
 * Usage:
 *   tsx scripts/fix-database-sequences.ts                    # Uses DATABASE_URL from env
 *   tsx scripts/fix-database-sequences.ts --env development  # Development database
 *   tsx scripts/fix-database-sequences.ts --env production   # Production database (requires confirmation)
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Get environment from args or env
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 
               args.find(arg => arg === '--env') ? args[args.indexOf('--env') + 1] : null;
const targetEnv = envArg || process.env.NODE_ENV || 'development';

function maskDatabaseUrl(url: string): string {
  if (!url) return 'NOT SET';
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.username}:***@${urlObj.host}${urlObj.pathname}`;
  } catch {
    return url.substring(0, 30) + '...';
  }
}

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function fixSequences() {
  const dbUrl = process.env.DATABASE_URL || '';
  const isProduction = targetEnv === 'production' || dbUrl.includes('production') || dbUrl.includes('prod');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 Fix Database Sequences');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Environment: ${targetEnv}`);
  console.log(`Database: ${maskDatabaseUrl(dbUrl)}`);
  console.log('');
  
  if (isProduction) {
    console.log('⚠️  WARNING: This will modify PRODUCTION database!');
    console.log('');
    const confirmed = await askConfirmation('Are you sure you want to continue? (yes/NO): ');
    if (!confirmed) {
      console.log('❌ Cancelled');
      process.exit(0);
    }
    console.log('');
  }
  
  console.log('🔄 Fixing database sequences...\n');

  const tables = [
    'User', 'Merchant', 'Outlet', 'Category', 'Product', 'Customer',
    'Order', 'OrderItem', 'Payment', 'Plan', 'Subscription'
  ];

  for (const table of tables) {
    try {
      // Get max ID
      const maxResult = await prisma.$queryRawUnsafe<Array<{ max_id: bigint }>>(
        `SELECT COALESCE(MAX(id), 0) as max_id FROM "${table}";`
      );
      const maxId = Number(maxResult[0]?.max_id || 0);

      // Get sequence name
      const seqResult = await prisma.$queryRawUnsafe<Array<{ seq_name: string | null }>>(
        `SELECT pg_get_serial_sequence('"${table}"', 'id') as seq_name;`
      );
      const seqName = seqResult[0]?.seq_name;

      if (!seqName) continue;

      // Fix sequence
      await prisma.$executeRawUnsafe(
        `SELECT setval('${seqName}', ${maxId}, true);`
      );

      console.log(`✅ ${table}: Fixed (next ID will be ${maxId + 1})`);
    } catch (error: any) {
      // Ignore if table/sequence doesn't exist
      if (!error.message?.includes('does not exist')) {
        console.log(`⚠️  ${table}: ${error.message}`);
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Done!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function main() {
  try {
    await fixSequences();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

