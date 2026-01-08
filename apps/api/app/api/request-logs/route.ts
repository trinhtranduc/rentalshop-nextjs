import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/request-logs
 * Query request logs with filters, pagination, and search
 * 
 * Authorization: ADMIN only (sensitive data)
 */
export const GET = withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const correlationId = searchParams.get('correlationId') || undefined;
    const path = searchParams.get('path') || undefined;
    const method = searchParams.get('method') || undefined;
    const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!, 10) : undefined;
    const merchantId = searchParams.get('merchantId') ? parseInt(searchParams.get('merchantId')!, 10) : undefined;
    const outletId = searchParams.get('outletId') ? parseInt(searchParams.get('outletId')!, 10) : undefined;
    const statusCode = searchParams.get('statusCode') ? parseInt(searchParams.get('statusCode')!, 10) : undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const search = searchParams.get('search') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200); // Max 200
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {};

    if (correlationId) {
      where.correlationId = correlationId;
    }

    if (path) {
      where.path = { contains: path };
    }

    if (method) {
      where.method = method;
    }

    if (userId) {
      where.userId = userId;
    }

    if (merchantId) {
      where.merchantId = merchantId;
    }

    if (outletId) {
      where.outletId = outletId;
    }

    if (statusCode) {
      where.statusCode = statusCode;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // Full-text search in path, requestBody, responseBody, errorMessage
    if (search) {
      where.OR = [
        { path: { contains: search, mode: 'insensitive' } },
        { requestBody: { contains: search, mode: 'insensitive' } },
        { responseBody: { contains: search, mode: 'insensitive' } },
        { errorMessage: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const orderBy: any = {};
    if (sortBy === 'duration') {
      orderBy.duration = sortOrder;
    } else if (sortBy === 'statusCode') {
      orderBy.statusCode = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Query logs
    // @ts-ignore - RequestLog model will be available after migration
    const [logs, total] = await Promise.all([
      prisma.requestLog.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          merchant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      // @ts-ignore - RequestLog model will be available after migration
      prisma.requestLog.count({ where }),
    ]);

    // Transform logs to parse JSON fields
    const transformedLogs = logs.map((log) => ({
      id: log.id,
      correlationId: log.correlationId,
      method: log.method,
      path: log.path,
      queryParams: log.queryParams ? JSON.parse(log.queryParams) : null,
      requestBody: log.requestBody ? JSON.parse(log.requestBody) : null,
      responseBody: log.responseBody ? JSON.parse(log.responseBody) : null,
      statusCode: log.statusCode,
      duration: log.duration,
      userId: log.userId,
      merchantId: log.merchantId,
      outletId: log.outletId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt.toISOString(),
      user: log.user
        ? {
            id: log.user.id,
            email: log.user.email,
            name: `${log.user.firstName} ${log.user.lastName}`,
            role: log.user.role,
          }
        : null,
      merchant: log.merchant
        ? {
            id: log.merchant.id,
            name: log.merchant.name,
          }
        : null,
    }));

    return NextResponse.json(
      ResponseBuilder.success('REQUEST_LOGS_FETCHED', {
        logs: transformedLogs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      })
    );
  } catch (error) {
    console.error('Error fetching request logs:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
