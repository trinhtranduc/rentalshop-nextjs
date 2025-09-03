/**
 * Test endpoint for audit logging (no authentication required)
 * This is for testing purposes only - remove in production
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createAuditHelper } from '@rentalshop/utils';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test Audit Endpoint - Starting test...');
    
    // Test audit logging directly without creating real data
    console.log('🔍 Testing audit logging...');
    
    const auditHelper = createAuditHelper(prisma);
    
    // Test data
    const testEntityId = 'test-entity-id';
    const oldValues = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    };
    const newValues = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com'
    };
    
    console.log('🔍 About to call auditHelper.logUpdate...');
    
    try {
      await auditHelper.logUpdate({
        entityType: 'Customer',
        entityId: testEntityId,
        entityName: `${newValues.firstName} ${newValues.lastName}`,
        oldValues: oldValues,
        newValues: newValues,
        description: `Test customer updated: ${oldValues.firstName} ${oldValues.lastName} -> ${newValues.firstName} ${newValues.lastName}`,
        context: {
          userId: 'test-user-id',
          userEmail: 'test@example.com',
          userRole: 'ADMIN',
          merchantId: 'test-merchant-id',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          sessionId: 'test-session',
          requestId: 'test-request'
        }
      });
      console.log('✅ auditHelper.logUpdate completed successfully');
    } catch (auditError) {
      console.error('❌ auditHelper.logUpdate failed:', auditError);
      throw auditError;
    }
    
    console.log('✅ Audit logging test completed');
    
    return NextResponse.json({
      success: true,
      message: 'Audit logging test completed successfully',
      testData: {
        entityId: testEntityId,
        oldName: `${oldValues.firstName} ${oldValues.lastName}`,
        newName: `${newValues.firstName} ${newValues.lastName}`
      }
    });
    
  } catch (error) {
    console.error('❌ Test audit endpoint error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
