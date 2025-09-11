/**
 * Test endpoint to simulate customer update with audit logging (no authentication required)
 * This is for testing purposes only - remove in production
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createAuditHelper } from '@rentalshop/utils';
import { captureAuditContext } from '@rentalshop/middleware';
import {API} from '@rentalshop/constants';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test Customer Update - Starting...');
    
    // Capture audit context
    const auditContext = await captureAuditContext(request);
    console.log('✅ Audit context captured:', auditContext);
    
    // Simulate user data (normally from JWT token)
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'ADMIN',
      merchantId: 'test-merchant-id',
      outletId: 'test-outlet-id'
    };
    
    // Simulate customer data
    const existingCustomer = {
      id: 'test-customer-id',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '1234567890'
    };
    
    const updatedCustomer = {
      id: 'test-customer-id',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '1234567890'
    };
    
    console.log('🔍 About to test audit logging with:', {
      entityType: 'Customer',
      entityId: updatedCustomer.id,
      oldValues: existingCustomer,
      newValues: updatedCustomer,
      user: mockUser,
      auditContext: auditContext
    });
    
    // Test audit logging
    try {
      console.log('🔍 Creating audit helper...');
      const auditHelper = createAuditHelper(prisma);
      console.log('✅ Audit helper created');
      
      console.log('🔍 Calling auditHelper.logUpdate...');
      await auditHelper.logUpdate({
        entityType: 'Customer',
        entityId: updatedCustomer.id,
        entityName: `${updatedCustomer.firstName} ${updatedCustomer.lastName}`,
        oldValues: existingCustomer,
        newValues: updatedCustomer,
        description: `Test customer updated: ${existingCustomer.firstName} ${existingCustomer.lastName} -> ${updatedCustomer.firstName} ${updatedCustomer.lastName}`,
        context: {
          ...auditContext,
          userId: mockUser.id,
          userEmail: mockUser.email,
          userRole: mockUser.role,
          merchantId: mockUser.merchantId,
          outletId: mockUser.outletId
        }
      });
      console.log('✅ Audit logging completed successfully');
      
      // Check if audit log was actually created
      console.log('🔍 Checking if audit log was created...');
      const auditLogs = await prisma.auditLog.findMany({
        where: { entityId: updatedCustomer.id },
        orderBy: { createdAt: 'desc' },
        take: 1
      });
      console.log('📊 Found audit logs:', auditLogs.length);
      if (auditLogs.length > 0) {
        console.log('✅ Latest audit log:', auditLogs[0]);
      } else {
        console.log('❌ No audit log found for entityId:', updatedCustomer.id);
      }
      
    } catch (auditError) {
      console.error('❌ Audit logging failed:', auditError);
      console.error('❌ Audit error stack:', auditError.stack);
      throw auditError;
    }
    
    console.log('✅ Test customer update completed');
    
    // Get debug information
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityId: updatedCustomer.id },
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    
    return NextResponse.json({
      success: true,
      message: 'Test customer update with audit logging completed successfully',
      testData: {
        entityId: updatedCustomer.id,
        oldName: `${existingCustomer.firstName} ${existingCustomer.lastName}`,
        newName: `${updatedCustomer.firstName} ${updatedCustomer.lastName}`,
        user: mockUser,
        auditContext: auditContext
      },
      debug: {
        auditLogsFound: auditLogs.length,
        latestAuditLog: auditLogs[0] || null
      }
    });
    
  } catch (error) {
    console.error('❌ Test customer update error:', error);
    return NextResponse.json(
      { success: false, error: error.message, stack: error.stack },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
