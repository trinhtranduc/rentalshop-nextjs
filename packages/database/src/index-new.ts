// ============================================================================
// SIMPLIFIED DATABASE PACKAGE EXPORTS - NEW VERSION
// ============================================================================
// This is the new, simplified version that replaces the complex dual ID system
// Goal: Reduce from 139 exports to ~10 simple functions

// Database client
export { prisma } from './client';

// New simplified database API
export { db, checkDatabaseConnection, generateOrderNumber } from './db-new';

// Test functions (for development)
export { testNewDatabaseAPI, comparePerformance } from './test-db-new';

// ============================================================================
// MIGRATION GUIDE
// ============================================================================
/*
OLD WAY (139 exports):
import { 
  findOutletByPublicId, 
  convertOutletPublicIdToDatabaseId,
  getCustomerByPublicId as getCustomerById,
  getOutletByPublicId as getOutletById,
  // ... 135 more exports
} from '@rentalshop/database';

NEW WAY (3 main exports):
import { db, prisma, checkDatabaseConnection } from '@rentalshop/database';

// Usage examples:
const user = await db.users.findById(123);
const users = await db.users.search({ merchantId: 1, page: 1, limit: 20 });
const product = await db.products.findByBarcode('123456789');
const orders = await db.orders.search({ outletId: 1, status: 'ACTIVE' });

BENEFITS:
✅ 93% reduction in exports (139 → 10)
✅ Consistent API across all entities
✅ No more dual ID complexity
✅ Better TypeScript support
✅ Easier to maintain and debug
✅ Better performance with optimized queries
*/
