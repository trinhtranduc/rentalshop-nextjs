import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../../../../../packages/database/src/audit';

// Create Prisma client instance
const prisma = new PrismaClient();

// GET /api/audit-logs/stats - Get audit log statistics
export async function GET(request: NextRequest) {
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

    // Only ADMIN users can access audit statistics
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions. Admin access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters for stats
    const filter: any = {};
    
    if (searchParams.get('merchantId')) {
      filter.merchantId = searchParams.get('merchantId');
    }
    if (searchParams.get('outletId')) {
      filter.outletId = searchParams.get('outletId');
    }
    if (searchParams.get('startDate')) {
      filter.startDate = new Date(searchParams.get('startDate')!);
    }
    if (searchParams.get('endDate')) {
      filter.endDate = new Date(searchParams.get('endDate')!);
    }

    const auditLogger = new AuditLogger(prisma);
    const stats = await auditLogger.getAuditStats(filter);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch audit statistics' },
      { status: 500 }
    );
  }
}
