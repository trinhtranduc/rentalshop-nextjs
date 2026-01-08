/**
 * Cleanup Old Request Logs
 * 
 * Removes request logs older than 3 months to manage database size
 */

import { prisma } from './index';

/**
 * Cleanup request logs older than retention period (default: 3 months)
 */
export async function cleanupOldRequestLogs(retentionMonths: number = 3): Promise<{
  deletedCount: number;
  cutoffDate: Date;
}> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

  console.log(`🧹 Cleaning up request logs older than ${retentionMonths} months (before ${cutoffDate.toISOString()})`);

  // @ts-ignore - RequestLog model will be available after migration
  const result = await prisma.requestLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  console.log(`✅ Deleted ${result.count} old request logs`);

  return {
    deletedCount: result.count,
    cutoffDate,
  };
}
