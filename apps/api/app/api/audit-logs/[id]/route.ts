import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { API } from '@rentalshop/constants';

/**
 * GET /api/audit-logs/[id] - Get specific audit log entry
 * Requires: ADMIN role
 */
async function handleGetAuditLog(
  request: NextRequest,
  { user }: { user: any; userScope: any }, 
  params: { id: string }
) {
  console.log(`🔍 GET /api/audit-logs/${params.id} - requested`);
  
  try {

    const logId = params.id;
    if (!logId || isNaN(parseInt(logId))) {
      return NextResponse.json(
        { success: false, message: 'Invalid audit log ID' },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    const auditLog = await prisma.auditLog.findUnique({
      where: { id: parseInt(logId) },
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
      user: (auditLog as any).user ? {
        id: (auditLog as any).user.id,
        email: (auditLog as any).user.email,
        name: `${(auditLog as any).user.firstName} ${(auditLog as any).user.lastName}`,
        role: (auditLog as any).user.role
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleGetAuditLog(req, context, params)
  );
  return authenticatedHandler(request);
}
