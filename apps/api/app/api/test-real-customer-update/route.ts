import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createAuditHelper } from '@rentalshop/utils';
import { captureAuditContext, getAuditContext } from '@rentalshop/middleware';
import {API} from '@rentalshop/constants';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test Real Customer Update - Starting...');
    
    // Capture audit context
    captureAuditContext(request);
    
    // Get a real customer from the database
    const realCustomer = await prisma.customer.findFirst({
      where: { isActive: true },
      include: { merchant: true }
    });
    
    if (!realCustomer) {
      return NextResponse.json({
        success: false,
        message: 'No active customers found in database'
      });
    }
    
    console.log('✅ Found real customer:', {
      id: realCustomer.id,
      publicId: realCustomer.publicId,
      name: `${realCustomer.firstName} ${realCustomer.lastName}`,
      email: realCustomer.email
    });
    
    // Create mock user and audit context
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'ADMIN',
      merchantId: realCustomer.merchantId,
      outletId: null
    };
    
    const auditContext = getAuditContext();
    
    // Simulate updating the customer
    const updatedCustomer = {
      ...realCustomer,
      firstName: realCustomer.firstName + ' Updated',
      lastName: realCustomer.lastName + ' Test',
      updatedAt: new Date()
    };
    
    console.log('🔍 About to test audit logging with real customer:', {
      entityType: 'Customer',
      entityId: realCustomer.id,
      oldName: `${realCustomer.firstName} ${realCustomer.lastName}`,
      newName: `${updatedCustomer.firstName} ${updatedCustomer.lastName}`,
      user: mockUser,
      auditContext: auditContext
    });
    
    // Test audit logging
    const auditHelper = createAuditHelper(prisma);
    
    await auditHelper.logUpdate({
      entityType: 'Customer',
      entityId: realCustomer.id,
      entityName: `${updatedCustomer.firstName} ${updatedCustomer.lastName}`,
      oldValues: realCustomer,
      newValues: updatedCustomer,
      description: `Real customer updated: ${realCustomer.firstName} ${realCustomer.lastName} -> ${updatedCustomer.firstName} ${updatedCustomer.lastName}`,
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
    
    // Check if audit log was created
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityId: realCustomer.id },
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    
    console.log('📊 Found audit logs:', auditLogs.length);
    if (auditLogs.length > 0) {
      console.log('✅ Latest audit log:', auditLogs[0]);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Real customer update audit logging test completed successfully',
      testData: {
        customerId: realCustomer.id,
        customerPublicId: realCustomer.publicId,
        oldName: `${realCustomer.firstName} ${realCustomer.lastName}`,
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
    console.error('❌ Test real customer update error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
  }
}
