/**
 * Test endpoint to test database audit log creation directly (no authentication required)
 * This is for testing purposes only - remove in production
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {API} from '@rentalshop/constants';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Direct Database Audit Test - Starting...');
    
    // Test direct database audit log creation
    const testAuditLog = {
      publicId: 999999, // Use a high number to avoid conflicts
      action: 'UPDATE',
      entityType: 'Customer',
      entityId: 'test-db-entity-id',
      entityName: 'Test Database Customer',
      userId: null, // Use null to avoid foreign key constraint
      userEmail: 'test@example.com',
      userRole: 'ADMIN',
      merchantId: null, // Use null to avoid foreign key constraint
      outletId: null, // Use null to avoid foreign key constraint
      oldValues: JSON.stringify({ firstName: 'John', lastName: 'Doe' }),
      newValues: JSON.stringify({ firstName: 'Jane', lastName: 'Smith' }),
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
      sessionId: 'test-session',
      requestId: 'test-request',
      severity: 'INFO',
      category: 'BUSINESS',
      description: 'Direct database test audit log'
    };
    
    console.log('🔍 About to create audit log directly in database...');
    
    try {
      const createdAuditLog = await prisma.auditLog.create({
        data: testAuditLog
      });
      
      console.log('✅ Audit log created successfully:', createdAuditLog.id);
      
      // Verify it was created
      const foundAuditLog = await prisma.auditLog.findUnique({
        where: { id: createdAuditLog.id }
      });
      
      console.log('✅ Audit log found in database:', foundAuditLog ? 'YES' : 'NO');
      
      // Clean up
      await prisma.auditLog.delete({
        where: { id: createdAuditLog.id }
      });
      
      console.log('🧹 Test audit log cleaned up');
      
      return NextResponse.json({
        success: true,
        message: 'Direct database audit log test completed successfully',
        testData: {
          created: true,
          found: !!foundAuditLog,
          auditLogId: createdAuditLog.id
        }
      });
      
    } catch (dbError) {
      console.error('❌ Database audit log creation failed:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database audit log creation failed',
        details: dbError.message,
        stack: dbError.stack
      }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
    }
    
  } catch (error) {
    console.error('❌ Direct database audit test error:', error);
    return NextResponse.json(
      { success: false, error: error.message, stack: error.stack },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
