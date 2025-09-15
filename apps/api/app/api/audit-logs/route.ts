import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';
import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../../../../packages/database/src/audit';
import {API} from '@rentalshop/constants';

// Create Prisma client instance
const prisma = new PrismaClient();

// GET /api/audit-logs - Get audit logs with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const user = authResult.user;

    // Only ADMIN users can access audit logs
    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions. Admin access required.' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const filter = {
      action: searchParams.get('action') || undefined,
      entityType: searchParams.get('entityType') || undefined,
      entityId: searchParams.get('entityId') || undefined,
      userId: searchParams.get('userId') || undefined,
      merchantId: searchParams.get('merchantId') || undefined,
      outletId: searchParams.get('outletId') || undefined,
      severity: searchParams.get('severity') || undefined,
      category: searchParams.get('category') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    // Validate limit and offset
    if (filter.limit > 100) filter.limit = 100;
    if (filter.offset < 0) filter.offset = 0;

    const auditLogger = new AuditLogger(prisma);
    const result = await auditLogger.getAuditLogs(filter);

    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: filter.limit,
        offset: filter.offset,
        hasMore: result.hasMore
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch audit logs' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
