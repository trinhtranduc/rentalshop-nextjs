import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils/api';
import {API} from '@rentalshop/constants';

interface IntegrityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface IntegrityReport {
  overall: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  checks: IntegrityCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: IntegrityCheck[] = [];
  
  try {
    console.log('🔍 Starting data integrity checks...');

    // 1. Order-Customer Relationship Integrity
    await checkOrderCustomerIntegrity(checks);
    
    // 2. Order-Product Relationship Integrity
    await checkOrderProductIntegrity(checks);
    
    // 3. User-Outlet Assignment Integrity
    await checkUserOutletIntegrity(checks);
    
    // 4. Product Stock Consistency
    await checkProductStockConsistency(checks);
    
    // 5. Payment-Order Relationship Integrity
    await checkPaymentOrderIntegrity(checks);
    
    // 6. Audit Log Completeness
    await checkAuditLogCompleteness(checks);
    
    // 7. Data Consistency Checks
    await checkDataConsistency(checks);
    
    // 8. Orphaned Records Check
    await checkOrphanedRecords(checks);

    // Calculate summary
    const summary = {
      total: checks.length,
      passed: checks.filter(c => c.status === 'pass').length,
      failed: checks.filter(c => c.status === 'fail').length,
      warnings: checks.filter(c => c.status === 'warning').length
    };

    // Determine overall status
    const criticalFailures = checks.filter(c => c.status === 'fail' && c.severity === 'critical');
    const highFailures = checks.filter(c => c.status === 'fail' && c.severity === 'high');
    
    let overall: 'healthy' | 'degraded' | 'critical';
    if (criticalFailures.length > 0) {
      overall = 'critical';
    } else if (highFailures.length > 0 || summary.failed > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    const report: IntegrityReport = {
      overall,
      timestamp: new Date().toISOString(),
      checks,
      summary
    };

    console.log(`✅ Integrity check completed: ${summary.passed}/${summary.total} passed`);

    return NextResponse.json(report);

  } catch (error) {
    console.error('❌ Integrity check failed:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

async function checkOrderCustomerIntegrity(checks: IntegrityCheck[]) {
  try {
    // Check for orders with invalid customer references
    const invalidOrders = await prisma.$queryRaw`
      SELECT o.id, o."orderNumber", o."customerId"
      FROM "Order" o
      LEFT JOIN "Customer" c ON o."customerId" = c.id
      WHERE o."customerId" IS NOT NULL AND c.id IS NULL
    ` as Array<{ id: string; orderNumber: string; customerId: string }>;

    if (invalidOrders.length > 0) {
      checks.push({
        name: 'order_customer_integrity',
        status: 'fail',
        code: "INVALID_ORDER_CUSTOMER_REFS", message: `Found ${invalidOrders.length} orders with invalid customer references`,
        severity: 'high',
        details: { invalidOrders: invalidOrders.slice(0, 5) } // Show first 5
      });
    } else {
      checks.push({
        name: 'order_customer_integrity',
        status: 'pass',
        code: 'ALL_ORDERS_VALID_CUSTOMERS',
        message: 'All orders have valid customer references',
        severity: 'medium'
      });
    }
  } catch (error) {
    checks.push({
      name: 'order_customer_integrity',
      status: 'fail',
      code: 'CHECK_ORDER_CUSTOMER_INTEGRITY_FAILED',
        message: 'Failed to check order-customer integrity',
      severity: 'high',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function checkOrderProductIntegrity(checks: IntegrityCheck[]) {
  try {
    // Check for order items with invalid product references
    const invalidOrderItems = await prisma.$queryRaw`
      SELECT oi.id, oi."orderId", oi."productId"
      FROM "OrderItem" oi
      LEFT JOIN "Product" p ON oi."productId" = p.id
      WHERE p.id IS NULL
    ` as Array<{ id: string; orderId: string; productId: string }>;

    if (invalidOrderItems.length > 0) {
      checks.push({
        name: 'order_product_integrity',
        status: 'fail',
        code: "INVALID_ORDER_ITEM_PRODUCT_REFS", message: `Found ${invalidOrderItems.length} order items with invalid product references`,
        severity: 'high',
        details: { invalidOrderItems: invalidOrderItems.slice(0, 5) }
      });
    } else {
      checks.push({
        name: 'order_product_integrity',
        status: 'pass',
        code: 'ALL_ORDER_ITEMS_VALID_PRODUCTS',
        message: 'All order items have valid product references',
        severity: 'medium'
      });
    }
  } catch (error) {
    checks.push({
      name: 'order_product_integrity',
      status: 'fail',
      code: 'CHECK_ORDER_PRODUCT_INTEGRITY_FAILED',
        message: 'Failed to check order-product integrity',
      severity: 'high',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function checkUserOutletIntegrity(checks: IntegrityCheck[]) {
  try {
    // Check for users assigned to non-existent outlets
    const invalidUserAssignments = await prisma.$queryRaw`
      SELECT u.id, u.email, u."outletId"
      FROM "User" u
      LEFT JOIN "Outlet" o ON u."outletId" = o.id
      WHERE u."outletId" IS NOT NULL AND o.id IS NULL
    ` as Array<{ id: string; email: string; outletId: string }>;

    if (invalidUserAssignments.length > 0) {
      checks.push({
        name: 'user_outlet_integrity',
        status: 'fail',
        code: "INVALID_USER_OUTLET_ASSIGNMENTS", message: `Found ${invalidUserAssignments.length} users assigned to non-existent outlets`,
        severity: 'high',
        details: { invalidAssignments: invalidUserAssignments.slice(0, 5) }
      });
    } else {
      checks.push({
        name: 'user_outlet_integrity',
        status: 'pass',
        code: 'ALL_USERS_VALID_OUTLETS',
        message: 'All users have valid outlet assignments',
        severity: 'medium'
      });
    }
  } catch (error) {
    checks.push({
      name: 'user_outlet_integrity',
      status: 'fail',
      code: 'CHECK_USER_OUTLET_INTEGRITY_FAILED',
        message: 'Failed to check user-outlet integrity',
      severity: 'high',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function checkProductStockConsistency(checks: IntegrityCheck[]) {
  try {
    // Check for products with negative stock
    const negativeStock = await prisma.$queryRaw`
      SELECT p.id, p.name, os.stock
      FROM "Product" p
      JOIN "OutletStock" os ON p.id = os."productId"
      WHERE os.stock < 0
    ` as Array<{ id: string; name: string; stock: number }>;

    if (negativeStock.length > 0) {
      checks.push({
        name: 'product_stock_consistency',
        status: 'fail',
        code: "NEGATIVE_STOCK_DETECTED", message: `Found ${negativeStock.length} products with negative stock`,
        severity: 'high',
        details: { negativeStock: negativeStock.slice(0, 5) }
      });
    } else {
      checks.push({
        name: 'product_stock_consistency',
        status: 'pass',
        code: 'ALL_PRODUCTS_VALID_LEVELS',
        message: 'All products have valid stock levels',
        severity: 'medium'
      });
    }

    // Check for products with inconsistent available vs stock
    const inconsistentStock = await prisma.$queryRaw`
      SELECT p.id, p.name, os.stock, os.renting, os.available
      FROM "Product" p
      JOIN "OutletStock" os ON p.id = os."productId"
      WHERE os.available != (os.stock - os.renting)
    ` as Array<{ id: string; name: string; stock: number; renting: number; available: number }>;

    if (inconsistentStock.length > 0) {
      checks.push({
        name: 'product_available_consistency',
        status: 'warning',
        code: "INCONSISTENT_STOCK_DETECTED", message: `Found ${inconsistentStock.length} products with inconsistent available stock calculations`,
        severity: 'medium',
        details: { inconsistentStock: inconsistentStock.slice(0, 5) }
      });
    } else {
      checks.push({
        name: 'product_available_consistency',
        status: 'pass',
        code: 'ALL_PRODUCTS_VALID_STOCK',
        message: 'All products have consistent available stock calculations',
        severity: 'low'
      });
    }
  } catch (error) {
    checks.push({
      name: 'product_stock_consistency',
      status: 'fail',
      code: 'CHECK_PRODUCT_STOCK_FAILED',
        message: 'Failed to check product stock consistency',
      severity: 'high',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function checkPaymentOrderIntegrity(checks: IntegrityCheck[]) {
  try {
    // Check for payments with invalid order references
    const invalidPayments = await prisma.$queryRaw`
      SELECT p.id, p."orderId", p.amount
      FROM "Payment" p
      LEFT JOIN "Order" o ON p."orderId" = o.id
      WHERE o.id IS NULL
    ` as Array<{ id: string; orderId: string; amount: number }>;

    if (invalidPayments.length > 0) {
      checks.push({
        name: 'payment_order_integrity',
        status: 'fail',
        code: "INVALID_PAYMENT_ORDER_REFS", message: `Found ${invalidPayments.length} payments with invalid order references`,
        severity: 'high',
        details: { invalidPayments: invalidPayments.slice(0, 5) }
      });
    } else {
      checks.push({
        name: 'payment_order_integrity',
        status: 'pass',
        code: 'ALL_PAYMENTS_VALID_ORDERS',
        message: 'All payments have valid order references',
        severity: 'medium'
      });
    }
  } catch (error) {
    checks.push({
      name: 'payment_order_integrity',
      status: 'fail',
      code: 'CHECK_PAYMENT_ORDER_INTEGRITY_FAILED',
        message: 'Failed to check payment-order integrity',
      severity: 'high',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function checkAuditLogCompleteness(checks: IntegrityCheck[]) {
  try {
    // Check for recent operations without audit logs
    const recentOperations = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "Order" o
      WHERE o."createdAt" > NOW() - INTERVAL '1 day'
    ` as Array<{ count: bigint }>;

    const recentAuditLogs = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "AuditLog" a
      WHERE a."createdAt" > NOW() - INTERVAL '1 day'
      AND a."entityType" = 'Order'
    ` as Array<{ count: bigint }>;

    const operationsCount = Number(recentOperations[0].count);
    const auditLogsCount = Number(recentAuditLogs[0].count);

    if (operationsCount > 0 && auditLogsCount === 0) {
      checks.push({
        name: 'audit_log_completeness',
        status: 'warning',
        code: 'AUDIT_LOG_MISSING',
        message: 'Recent operations found without corresponding audit logs',
        severity: 'medium',
        details: { operationsCount, auditLogsCount }
      });
    } else {
      checks.push({
        name: 'audit_log_completeness',
        status: 'pass',
        code: 'AUDIT_LOG_WORKING',
        message: 'Audit logging appears to be working correctly',
        severity: 'low',
        details: { operationsCount, auditLogsCount }
      });
    }
  } catch (error) {
    checks.push({
      name: 'audit_log_completeness',
      status: 'fail',
      code: 'CHECK_AUDIT_LOG_FAILED',
        message: 'Failed to check audit log completeness',
      severity: 'medium',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function checkDataConsistency(checks: IntegrityCheck[]) {
  try {
    // Check for orders with zero total amount
    const zeroAmountOrders = await prisma.$queryRaw`
      SELECT o.id, o."orderNumber", o."totalAmount"
      FROM "Order" o
      WHERE o."totalAmount" = 0 AND o."orderType" != 'CANCELLED'
    ` as Array<{ id: string; orderNumber: string; totalAmount: number }>;

    if (zeroAmountOrders.length > 0) {
      checks.push({
        name: 'order_amount_consistency',
        status: 'warning',
        code: "ZERO_AMOUNT_ORDERS_DETECTED", message: `Found ${zeroAmountOrders.length} non-cancelled orders with zero amount`,
        severity: 'medium',
        details: { zeroAmountOrders: zeroAmountOrders.slice(0, 5) }
      });
    } else {
      checks.push({
        name: 'order_amount_consistency',
        status: 'pass',
        code: 'ALL_ORDERS_VALID_AMOUNTS',
        message: 'All non-cancelled orders have valid amounts',
        severity: 'low'
      });
    }
  } catch (error) {
    checks.push({
      name: 'data_consistency',
      status: 'fail',
      code: 'CHECK_DATA_CONSISTENCY_FAILED',
        message: 'Failed to check data consistency',
      severity: 'medium',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function checkOrphanedRecords(checks: IntegrityCheck[]) {
  try {
    // Check for orphaned order items
    const orphanedOrderItems = await prisma.$queryRaw`
      SELECT oi.id, oi."orderId"
      FROM "OrderItem" oi
      LEFT JOIN "Order" o ON oi."orderId" = o.id
      WHERE o.id IS NULL
    ` as Array<{ id: string; orderId: string }>;

    if (orphanedOrderItems.length > 0) {
      checks.push({
        name: 'orphaned_order_items',
        status: 'fail',
        code: "ORPHANED_ORDER_ITEMS_DETECTED", message: `Found ${orphanedOrderItems.length} orphaned order items`,
        severity: 'high',
        details: { orphanedItems: orphanedOrderItems.slice(0, 5) }
      });
    } else {
      checks.push({
        name: 'orphaned_order_items',
        status: 'pass',
        code: 'NO_ORPHANED_ORDER_ITEMS',
        message: 'No orphaned order items found',
        severity: 'medium'
      });
    }
  } catch (error) {
    checks.push({
      name: 'orphaned_records',
      status: 'fail',
      code: 'CHECK_ORPHANED_RECORDS_FAILED',
        message: 'Failed to check for orphaned records',
      severity: 'medium',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
