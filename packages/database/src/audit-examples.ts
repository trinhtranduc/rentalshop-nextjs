/**
 * Audit Logging Examples
 * 
 * This file demonstrates how to use the audit logging system in different scenarios.
 * Copy these patterns into your API routes and business logic.
 */

import { getAuditLogger, extractAuditContext, AuditContext } from './audit';
import { prisma } from './index';

// Example 1: Logging user login
export async function logUserLogin(
  request: Request,
  user: any,
  success: boolean = true
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.logLogin(
    user.id,
    user.email,
    user.role,
    context,
    success
  );
}

// Example 2: Logging user logout
export async function logUserLogout(
  request: Request,
  user: any
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.logLogout(
    user.id,
    user.email,
    context
  );
}

// Example 3: Logging product creation
export async function logProductCreation(
  request: Request,
  user: any,
  product: any
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.logCreate(
    'Product',
    product.id,
    product.name,
    {
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      merchantId: product.merchantId
    },
    context,
    `Created product: ${product.name}`
  );
}

// Example 4: Logging product update
export async function logProductUpdate(
  request: Request,
  user: any,
  productId: string,
  oldProduct: any,
  newProduct: any
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.logUpdate(
    'Product',
    productId,
    newProduct.name,
    {
      name: oldProduct.name,
      description: oldProduct.description,
      price: oldProduct.price,
      category: oldProduct.category
    },
    {
      name: newProduct.name,
      description: newProduct.description,
      price: newProduct.price,
      category: newProduct.category
    },
    context,
    `Updated product: ${newProduct.name}`
  );
}

// Example 5: Logging order creation
export async function logOrderCreation(
  request: Request,
  user: any,
  order: any
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.logCreate(
    'Order',
    order.id,
    order.orderNumber,
    {
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount,
      customerId: order.customerId,
      outletId: order.outletId
    },
    context,
    `Created ${order.orderType} order: ${order.orderNumber}`
  );
}

// Example 6: Logging order status change
export async function logOrderStatusChange(
  request: Request,
  user: any,
  order: any,
  oldStatus: string,
  newStatus: string
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.logUpdate(
    'Order',
    order.id,
    order.orderNumber,
    { status: oldStatus },
    { status: newStatus },
    context,
    `Changed order status from ${oldStatus} to ${newStatus}: ${order.orderNumber}`
  );
}

// Example 7: Logging customer creation
export async function logCustomerCreation(
  request: Request,
  user: any,
  customer: any
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.logCreate(
    'Customer',
    customer.id,
    `${customer.firstName} ${customer.lastName}`,
    {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      merchantId: customer.merchantId
    },
    context,
    `Created customer: ${customer.firstName} ${customer.lastName}`
  );
}

// Example 8: Logging user creation
export async function logUserCreation(
  request: Request,
  user: any,
  newUser: any
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.logCreate(
    'User',
    newUser.id,
    newUser.email,
    {
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      merchantId: newUser.merchantId,
      outletId: newUser.outletId
    },
    context,
    `Created user: ${newUser.email} with role ${newUser.role}`
  );
}

// Example 9: Logging user role change
export async function logUserRoleChange(
  request: Request,
  user: any,
  targetUser: any,
  oldRole: string,
  newRole: string
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.logUpdate(
    'User',
    targetUser.id,
    targetUser.email,
    { role: oldRole },
    { role: newRole },
    context,
    `Changed user role from ${oldRole} to ${newRole}: ${targetUser.email}`
  );
}

// Example 10: Logging security events
export async function logSecurityEvent(
  request: Request,
  user: any,
  event: string,
  details: string,
  severity: 'WARNING' | 'ERROR' | 'CRITICAL' = 'WARNING'
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.logSecurityEvent(
    event,
    'Security',
    user?.id || 'anonymous',
    context,
    severity,
    details
  );
}

// Example 11: Logging payment events
export async function logPaymentEvent(
  request: Request,
  user: any,
  payment: any,
  action: 'CREATE' | 'UPDATE' | 'DELETE'
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  const paymentData = {
    amount: payment.amount,
    method: payment.method,
    type: payment.type,
    status: payment.status,
    orderId: payment.orderId
  };

  switch (action) {
    case 'CREATE':
      await auditLogger.logCreate(
        'Payment',
        payment.id,
        `Payment ${payment.reference || payment.id}`,
        paymentData,
        context,
        `Created payment: ${payment.amount} ${payment.method}`
      );
      break;
    case 'UPDATE':
      await auditLogger.logUpdate(
        'Payment',
        payment.id,
        `Payment ${payment.reference || payment.id}`,
        paymentData,
        paymentData,
        context,
        `Updated payment: ${payment.amount} ${payment.method}`
      );
      break;
    case 'DELETE':
      await auditLogger.logDelete(
        'Payment',
        payment.id,
        `Payment ${payment.reference || payment.id}`,
        paymentData,
        context,
        `Deleted payment: ${payment.amount} ${payment.method}`
      );
      break;
  }
}

// Example 12: Logging settings changes
export async function logSettingsChange(
  request: Request,
  user: any,
  settingType: 'system' | 'merchant' | 'user',
  setting: any,
  oldValue: any,
  newValue: any
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.logUpdate(
    `${settingType.charAt(0).toUpperCase() + settingType.slice(1)}Setting`,
    setting.id,
    setting.key,
    { value: oldValue },
    { value: newValue },
    context,
    `Updated ${settingType} setting: ${setting.key}`
  );
}

// Example 13: Logging data export
export async function logDataExport(
  request: Request,
  user: any,
  exportType: string,
  recordCount: number
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.log({
    action: 'EXPORT',
    entityType: 'Data',
    entityId: exportType,
    entityName: `${exportType} export`,
    newValues: {
      exportType,
      recordCount,
      timestamp: new Date().toISOString()
    },
    severity: 'INFO',
    category: 'BUSINESS',
    description: `Exported ${recordCount} ${exportType} records`,
    context
  });
}

// Example 14: Logging data import
export async function logDataImport(
  request: Request,
  user: any,
  importType: string,
  recordCount: number,
  successCount: number,
  errorCount: number
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.log({
    action: 'IMPORT',
    entityType: 'Data',
    entityId: importType,
    entityName: `${importType} import`,
    newValues: {
      importType,
      recordCount,
      successCount,
      errorCount,
      timestamp: new Date().toISOString()
    },
    severity: errorCount > 0 ? 'WARNING' : 'INFO',
    category: 'BUSINESS',
    description: `Imported ${successCount}/${recordCount} ${importType} records (${errorCount} errors)`,
    context
  });
}

// Example 15: Logging system maintenance
export async function logSystemMaintenance(
  request: Request,
  user: any,
  action: string,
  details: string
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.log({
    action: 'CUSTOM',
    entityType: 'System',
    entityId: 'maintenance',
    entityName: 'System Maintenance',
    newValues: {
      action,
      details,
      timestamp: new Date().toISOString()
    },
    severity: 'INFO',
    category: 'SYSTEM',
    description: `System maintenance: ${action} - ${details}`,
    context
  });
}

// Example 16: Using audit logging in API route handler
export async function exampleApiHandler(request: Request, user: any) {
  try {
    // Your business logic here
    const result = await someBusinessOperation();
    
    // Log successful operation
    const auditLogger = getAuditLogger(prisma);
    const context = extractAuditContext(request, user);
    
    await auditLogger.log({
      action: 'CREATE',
      entityType: 'Example',
      entityId: result.id,
      entityName: result.name,
      newValues: result,
      severity: 'INFO',
      category: 'BUSINESS',
      description: `Created example: ${result.name}`,
      context
    });
    
    return result;
  } catch (error) {
    // Log error
    const auditLogger = getAuditLogger(prisma);
    const context = extractAuditContext(request, user);
    
    await auditLogger.log({
      action: 'CUSTOM',
      entityType: 'Error',
      entityId: 'api-error',
      entityName: 'API Error',
      severity: 'ERROR',
      category: 'SYSTEM',
      description: `API error: ${error.message}`,
      context
    });
    
    throw error;
  }
}

// Helper function for business operations (placeholder)
async function someBusinessOperation() {
  // Your business logic here
  return { id: '123', name: 'Example' };
}
