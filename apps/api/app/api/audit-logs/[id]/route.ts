import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

// GET /api/audit-logs/[id] - Get specific audit log entry
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Only ADMIN users can access audit logs
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions. Admin access required.' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const logId = params.id;
    if (!logId) {
      return NextResponse.json(
        { success: false, message: 'Invalid audit log ID' },
        { status: 400 }
      );
    }

    const auditLog = await prisma.auditLog.findUnique({
      where: { id: logId },
      include: {
        user: {
          select: {
            publicId: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    if (!auditLog) {
      return NextResponse.json(
        { success: false, message: 'Audit log not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Transform the audit log to include parsed JSON fields
    const transformedLog = {
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      details: auditLog.details,
      user: auditLog.user ? {
        id: auditLog.user.publicId,
        email: auditLog.user.email,
        name: `${auditLog.user.firstName} ${auditLog.user.lastName}`,
        role: auditLog.user.role
      } : null,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      createdAt: auditLog.createdAt
    };

    return NextResponse.json({
      success: true,
      data: transformedLog
    });

  } catch (error) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch audit log' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
