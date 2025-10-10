import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const GET = withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
  try {

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate limit
    const maxLimit = Math.min(limit, 50);
    const validOffset = Math.max(offset, 0);

    // Get recent audit logs
    const auditLogs = await db.auditLogs.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: maxLimit,
      skip: validOffset
    });

    // Transform audit logs to activity format
    const activities = auditLogs.map((log: any, index: number) => {
      // Parse details to get description and other info
      let details = {};
      try {
        details = JSON.parse(log.details);
      } catch (e) {
        details = { description: log.details };
      }

      // Determine activity type based on action
      let type: 'success' | 'warning' | 'error' | 'info' = 'info';
      const actionLower = log.action.toLowerCase();
      if (actionLower.includes('delete') || actionLower.includes('remove')) {
        type = 'warning';
      } else if (actionLower.includes('create') || actionLower.includes('add')) {
        type = 'success';
      } else if (actionLower.includes('error') || actionLower.includes('fail')) {
        type = 'error';
      }

      // Format timestamp
      const now = new Date();
      const logTime = new Date(log.createdAt);
      const diffInMinutes = Math.floor((now.getTime() - logTime.getTime()) / (1000 * 60));
      
      let timestamp: string;
      if (diffInMinutes < 1) {
        timestamp = 'Just now';
      } else if (diffInMinutes < 60) {
        timestamp = `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        timestamp = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        timestamp = `${days} day${days > 1 ? 's' : ''} ago`;
      }

      // Get user display name
      const userDisplay = log.user 
        ? `${log.user.firstName} ${log.user.lastName}`.trim() || log.user.email
        : (details as any).user || 'System';

      // Format action and description
      const action = log.action.toLowerCase();
      const description = (details as any).description || `${log.action} ${log.entityType || 'item'}`;

      return {
        id: log.id,
        timestamp,
        user: userDisplay,
        action,
        description,
        type,
        createdAt: log.createdAt,
        entityType: log.entityType
      };
    });

    // Get total count for pagination
    const totalCount = await db.auditLogs.getStats();

    return NextResponse.json({
      success: true,
      data: activities,
      pagination: {
        total: totalCount,
        limit: maxLimit,
        offset: validOffset,
        hasMore: validOffset + maxLimit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching recent activities:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
