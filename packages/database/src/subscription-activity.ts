import { prisma } from './client';

/**
 * Create a subscription activity log
 */
export async function createActivity(data: {
  subscriptionId: number;
  type: string;
  description: string;
  reason?: string;
  metadata?: any;
  performedBy?: number;
}) {
  const { metadata, ...rest } = data;
  
  return await prisma.subscriptionActivity.create({
    data: {
      ...rest,
      metadata: metadata ? JSON.stringify(metadata) : null
    }
  });
}

/**
 * Get activities for a subscription
 */
export async function getActivitiesBySubscriptionId(
  subscriptionId: number,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options;
  
  const [activities, total] = await Promise.all([
    prisma.subscriptionActivity.findMany({
      where: { subscriptionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.subscriptionActivity.count({ where: { subscriptionId } })
  ]);

  // Parse metadata JSON
  return {
    activities: activities.map(activity => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null
    })),
    total
  };
}

/**
 * Simplified subscription activity operations
 */
export const simplifiedSubscriptionActivities = {
  /**
   * Create activity (simplified API)
   */
  create: createActivity,

  /**
   * Get activities by subscription ID
   */
  getBySubscriptionId: getActivitiesBySubscriptionId
};

