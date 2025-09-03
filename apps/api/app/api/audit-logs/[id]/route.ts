import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';

// GET /api/audit-logs/[id] - Get specific audit log entry
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Only ADMIN users can access audit logs
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions. Admin access required.' },
        { status: 403 }
      );
    }

    const logId = parseInt(params.id);
    if (isNaN(logId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid audit log ID' },
        { status: 400 }
      );
    }

    const auditLog = await prisma.auditLog.findUnique({
      where: { publicId: logId },
      include: {
        user: {
          select: {
            publicId: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        merchant: {
          select: {
            publicId: true,
            name: true
          }
        },
        outlet: {
          select: {
            publicId: true,
            name: true
          }
        }
      }
    });

    if (!auditLog) {
      return NextResponse.json(
        { success: false, message: 'Audit log not found' },
        { status: 404 }
      );
    }

    // Transform the audit log to include parsed JSON fields
    const transformedLog = {
      id: auditLog.publicId,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      entityName: auditLog.entityName,
      user: auditLog.user ? {
        id: auditLog.user.publicId,
        email: auditLog.user.email,
        name: `${auditLog.user.firstName} ${auditLog.user.lastName}`,
        role: auditLog.user.role
      } : null,
      merchant: auditLog.merchant ? {
        id: auditLog.merchant.publicId,
        name: auditLog.merchant.name
      } : null,
      outlet: auditLog.outlet ? {
        id: auditLog.outlet.publicId,
        name: auditLog.outlet.name
      } : null,
      oldValues: auditLog.oldValues ? JSON.parse(auditLog.oldValues) : null,
      newValues: auditLog.newValues ? JSON.parse(auditLog.newValues) : null,
      changes: auditLog.changes ? JSON.parse(auditLog.changes) : null,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      sessionId: auditLog.sessionId,
      requestId: auditLog.requestId,
      metadata: auditLog.metadata ? JSON.parse(auditLog.metadata) : null,
      severity: auditLog.severity,
      category: auditLog.category,
      description: auditLog.description,
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
      { status: 500 }
    );
  }
}
