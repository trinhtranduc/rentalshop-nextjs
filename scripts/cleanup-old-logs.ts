/**
 * CLI Script to Cleanup Old Request Logs
 * 
 * Usage: npx tsx scripts/cleanup-old-logs.ts [retention-months]
 */

import { cleanupOldRequestLogs } from '@rentalshop/database';

const retentionMonths = parseInt(process.argv[2] || '3', 10);

async function main() {
  try {
    console.log(`Starting cleanup of request logs older than ${retentionMonths} months...`);
    
    const result = await cleanupOldRequestLogs(retentionMonths);
    
    console.log(`✅ Cleanup completed successfully!`);
    console.log(`   Deleted: ${result.deletedCount} logs`);
    console.log(`   Cutoff date: ${result.cutoffDate.toISOString()}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

main();
