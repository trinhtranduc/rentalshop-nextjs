/**
 * Test endpoint to check audit logs (no authentication required)
 * This is for testing purposes only - remove in production
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking audit logs...');
    
    // Get the latest audit logs
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        publicId: true,
        action: true,
        entityType: true,
        entityId: true,
        entityName: true,
        description: true,
        createdAt: true,
        userEmail: true,
        userRole: true
      }
    });
    
    console.log('✅ Found audit logs:', auditLogs.length);
    
    return NextResponse.json({
      success: true,
      message: `Found ${auditLogs.length} audit logs`,
      auditLogs: auditLogs
    });
    
  } catch (error) {
    console.error('❌ Error checking audit logs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
