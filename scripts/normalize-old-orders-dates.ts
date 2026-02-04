/**
 * Migration script to normalize old orders' pickupPlanAt and returnPlanAt
 * to midnight UTC (no timezone shift)
 * 
 * This fixes the issue where old orders were stored with timezone conversion,
 * causing calendar filtering to fail.
 * 
 * Usage:
 *   tsx scripts/normalize-old-orders-dates.ts [--dry-run] [--limit=N]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Parse date string (YYYY-MM-DD) and normalize to midnight UTC
 */
function parseDateStringToUTC(dateStr: string): Date {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  
  const [, year, month, day] = match;
  return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0));
}

/**
 * Normalize a Date object to midnight UTC based on its UTC date components
 * This preserves the date without timezone shift
 */
function normalizeToMidnightUTC(date: Date): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Check if a date is already normalized (at midnight UTC)
 */
function isNormalized(date: Date): boolean {
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  const utcSeconds = date.getUTCSeconds();
  const utcMilliseconds = date.getUTCMilliseconds();
  
  return utcHours === 0 && utcMinutes === 0 && utcSeconds === 0 && utcMilliseconds === 0;
}

async function normalizeOrdersDates(dryRun: boolean = false, limit?: number) {
  console.log('🔍 Starting order date normalization...');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  if (limit) {
    console.log(`Limit: ${limit} orders`);
  }
  
  try {
    // Find all orders with pickupPlanAt or returnPlanAt
    const whereClause: any = {
      OR: [
        { pickupPlanAt: { not: null } },
        { returnPlanAt: { not: null } }
      ]
    };
    
    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        orderNumber: true,
        pickupPlanAt: true,
        returnPlanAt: true,
      },
      ...(limit ? { take: limit } : {})
    });
    
    console.log(`📦 Found ${orders.length} orders to check`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    const updates: Array<{ id: number; orderNumber: string; changes: string[] }> = [];
    
    for (const order of orders) {
      const changes: string[] = [];
      const updateData: any = {};
      
      // Normalize pickupPlanAt
      if (order.pickupPlanAt) {
        const currentDate = new Date(order.pickupPlanAt);
        if (!isNormalized(currentDate)) {
          const normalizedDate = normalizeToMidnightUTC(currentDate);
          updateData.pickupPlanAt = normalizedDate;
          changes.push(
            `pickupPlanAt: ${currentDate.toISOString()} → ${normalizedDate.toISOString()}`
          );
        }
      }
      
      // Normalize returnPlanAt
      if (order.returnPlanAt) {
        const currentDate = new Date(order.returnPlanAt);
        if (!isNormalized(currentDate)) {
          const normalizedDate = normalizeToMidnightUTC(currentDate);
          updateData.returnPlanAt = normalizedDate;
          changes.push(
            `returnPlanAt: ${currentDate.toISOString()} → ${normalizedDate.toISOString()}`
          );
        }
      }
      
      if (changes.length > 0) {
        updates.push({
          id: order.id,
          orderNumber: order.orderNumber,
          changes
        });
        
        if (!dryRun) {
          await prisma.order.update({
            where: { id: order.id },
            data: updateData
          });
        }
        
        updatedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  Total orders checked: ${orders.length}`);
    console.log(`  Orders updated: ${updatedCount}`);
    console.log(`  Orders skipped (already normalized): ${skippedCount}`);
    
    if (updates.length > 0) {
      console.log('\n📝 Sample updates (first 10):');
      updates.slice(0, 10).forEach(update => {
        console.log(`  Order #${update.orderNumber} (ID: ${update.id}):`);
        update.changes.forEach(change => {
          console.log(`    - ${change}`);
        });
      });
      
      if (updates.length > 10) {
        console.log(`  ... and ${updates.length - 10} more orders`);
      }
    }
    
    if (dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes were made');
      console.log('Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ Normalization completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error normalizing orders:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

// Run migration
normalizeOrdersDates(dryRun, limit)
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
