/**
 * Test Product Stock Management Logic
 * 
 * Tests for:
 * 1. SALE order stock decrease when COMPLETED/PICKUPED
 * 2. SALE order stock rollback when CANCELLED
 * 3. RENT order renting update through status transitions
 * 4. Availability check with rental dates
 */

const { PrismaClient } = require('@prisma/client');
const { ORDER_TYPE, ORDER_STATUS } = require('@rentalshop/constants');
const { updateOutletStockForOrder } = require('../packages/database/src/product');

const prisma = new PrismaClient();

// Helper function to get outlet stock
async function getOutletStock(productId, outletId) {
  const outletStock = await prisma.outletStock.findUnique({
    where: {
      productId_outletId: {
        productId,
        outletId,
      },
    },
  });
  return outletStock;
}

// Helper function to create test data
async function createTestData() {
  // Create merchant
  const merchant = await prisma.merchant.create({
    data: {
      name: 'Test Merchant',
      email: 'test@merchant.com',
      phone: '1234567890',
    },
  });

  // Create outlet
  const outlet = await prisma.outlet.create({
    data: {
      name: 'Test Outlet',
      address: 'Test Address',
      merchantId: merchant.id,
    },
  });

  // Create product
  const product = await prisma.product.create({
    data: {
      name: 'Test Product',
      merchantId: merchant.id,
      rentPrice: 100,
      salePrice: 500,
    },
  });

  // Create outlet stock with initial stock
  const outletStock = await prisma.outletStock.create({
    data: {
      productId: product.id,
      outletId: outlet.id,
      stock: 10,
      available: 10,
      renting: 0,
    },
  });

  return { merchant, outlet, product, outletStock };
}

// Helper function to cleanup test data
async function cleanupTestData(merchantId) {
  await prisma.merchant.delete({
    where: { id: merchantId },
  });
}

describe('Product Stock Management Tests', () => {
  let testData;

  beforeAll(async () => {
    testData = await createTestData();
  });

  afterAll(async () => {
    await cleanupTestData(testData.merchant.id);
    await prisma.$disconnect();
  });

  describe('SALE Order Stock Management', () => {
    test('SALE order should decrease stock when status changes to COMPLETED', async () => {
      const { product, outlet } = testData;
      
      // Create SALE order
      const order = await prisma.order.create({
        data: {
          orderNumber: 'ORD-TEST-001',
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 500,
          outletId: outlet.id,
          orderItems: {
            create: {
              productId: product.id,
              quantity: 2,
              unitPrice: 500,
              totalPrice: 1000,
            },
          },
        },
      });

      // Get initial stock
      const initialStock = await getOutletStock(product.id, outlet.id);
      expect(initialStock.stock).toBe(10);
      expect(initialStock.available).toBe(10);

      // Update order status to COMPLETED
      await updateOutletStockForOrder(
        order.id,
        ORDER_STATUS.RESERVED,
        ORDER_STATUS.COMPLETED,
        ORDER_TYPE.SALE,
        outlet.id,
        [{ productId: product.id, quantity: 2 }]
      );

      // Verify stock decreased
      const updatedStock = await getOutletStock(product.id, outlet.id);
      expect(updatedStock.stock).toBe(8); // 10 - 2
      expect(updatedStock.available).toBe(8); // Should equal stock - renting (0)

      // Cleanup
      await prisma.order.delete({ where: { id: order.id } });
    });

    test('SALE order should rollback stock when CANCELLED after COMPLETED', async () => {
      const { product, outlet } = testData;
      
      // Create SALE order that's already COMPLETED
      const order = await prisma.order.create({
        data: {
          orderNumber: 'ORD-TEST-002',
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.COMPLETED,
          totalAmount: 500,
          outletId: outlet.id,
          orderItems: {
            create: {
              productId: product.id,
              quantity: 3,
              unitPrice: 500,
              totalPrice: 1500,
            },
          },
        },
      });

      // First, set stock to reflect completed order
      await prisma.outletStock.update({
        where: {
          productId_outletId: {
            productId: product.id,
            outletId: outlet.id,
          },
        },
        data: {
          stock: 7, // 10 - 3
          available: 7,
        },
      });

      // Cancel the order
      await updateOutletStockForOrder(
        order.id,
        ORDER_STATUS.COMPLETED,
        ORDER_STATUS.CANCELLED,
        ORDER_TYPE.SALE,
        outlet.id,
        [{ productId: product.id, quantity: 3 }]
      );

      // Verify stock rolled back
      const updatedStock = await getOutletStock(product.id, outlet.id);
      expect(updatedStock.stock).toBe(10); // 7 + 3
      expect(updatedStock.available).toBe(10);

      // Cleanup
      await prisma.order.delete({ where: { id: order.id } });
    });
  });

  describe('RENT Order Renting Management', () => {
    test('RENT order should update renting when status changes from RESERVED to PICKUPED', async () => {
      const { product, outlet } = testData;
      
      // Reset stock
      await prisma.outletStock.update({
        where: {
          productId_outletId: {
            productId: product.id,
            outletId: outlet.id,
          },
        },
        data: {
          stock: 10,
          available: 10,
          renting: 0,
        },
      });

      // Create RENT order
      const order = await prisma.order.create({
        data: {
          orderNumber: 'ORD-TEST-003',
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 200,
          outletId: outlet.id,
          orderItems: {
            create: {
              productId: product.id,
              quantity: 2,
              unitPrice: 100,
              totalPrice: 200,
            },
          },
        },
      });

      // Reserve: should decrease available
      await updateOutletStockForOrder(
        order.id,
        null, // No old status (new order)
        ORDER_STATUS.RESERVED,
        ORDER_TYPE.RENT,
        outlet.id,
        [{ productId: product.id, quantity: 2 }]
      );

      let stock = await getOutletStock(product.id, outlet.id);
      expect(stock.available).toBe(8); // 10 - 2
      expect(stock.renting).toBe(0); // Not picked up yet

      // Pickup: should increase renting
      await updateOutletStockForOrder(
        order.id,
        ORDER_STATUS.RESERVED,
        ORDER_STATUS.PICKUPED,
        ORDER_TYPE.RENT,
        outlet.id,
        [{ productId: product.id, quantity: 2 }]
      );

      stock = await getOutletStock(product.id, outlet.id);
      expect(stock.renting).toBe(2); // Now rented
      expect(stock.available).toBe(8); // Still 8 (10 - 2 renting)
      expect(stock.stock).toBe(10); // Stock unchanged

      // Cleanup
      await prisma.order.delete({ where: { id: order.id } });
    });

    test('RENT order should update renting when status changes from PICKUPED to RETURNED', async () => {
      const { product, outlet } = testData;
      
      // Set up: order already picked up
      await prisma.outletStock.update({
        where: {
          productId_outletId: {
            productId: product.id,
            outletId: outlet.id,
          },
        },
        data: {
          stock: 10,
          available: 8,
          renting: 2,
        },
      });

      const order = await prisma.order.create({
        data: {
          orderNumber: 'ORD-TEST-004',
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 200,
          outletId: outlet.id,
          orderItems: {
            create: {
              productId: product.id,
              quantity: 2,
              unitPrice: 100,
              totalPrice: 200,
            },
          },
        },
      });

      // Return: should decrease renting and increase available
      await updateOutletStockForOrder(
        order.id,
        ORDER_STATUS.PICKUPED,
        ORDER_STATUS.RETURNED,
        ORDER_TYPE.RENT,
        outlet.id,
        [{ productId: product.id, quantity: 2 }]
      );

      const stock = await getOutletStock(product.id, outlet.id);
      expect(stock.renting).toBe(0); // No longer rented
      expect(stock.available).toBe(10); // Back to full stock
      expect(stock.stock).toBe(10); // Stock unchanged

      // Cleanup
      await prisma.order.delete({ where: { id: order.id } });
    });

    test('RENT order should rollback when CANCELLED after PICKUPED', async () => {
      const { product, outlet } = testData;
      
      // Set up: order already picked up
      await prisma.outletStock.update({
        where: {
          productId_outletId: {
            productId: product.id,
            outletId: outlet.id,
          },
        },
        data: {
          stock: 10,
          available: 8,
          renting: 2,
        },
      });

      const order = await prisma.order.create({
        data: {
          orderNumber: 'ORD-TEST-005',
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 200,
          outletId: outlet.id,
          orderItems: {
            create: {
              productId: product.id,
              quantity: 2,
              unitPrice: 100,
              totalPrice: 200,
            },
          },
        },
      });

      // Cancel: should rollback renting and available
      await updateOutletStockForOrder(
        order.id,
        ORDER_STATUS.PICKUPED,
        ORDER_STATUS.CANCELLED,
        ORDER_TYPE.RENT,
        outlet.id,
        [{ productId: product.id, quantity: 2 }]
      );

      const stock = await getOutletStock(product.id, outlet.id);
      expect(stock.renting).toBe(0); // Rolled back
      expect(stock.available).toBe(10); // Rolled back
      expect(stock.stock).toBe(10); // Stock unchanged

      // Cleanup
      await prisma.order.delete({ where: { id: order.id } });
    });
  });
});

// Run tests if executed directly
if (require.main === module) {
  console.log('🧪 Running Product Stock Management Tests...\n');
  
  // Note: These are integration tests that require a database connection
  // Run with: node tests/product-stock-management.test.js
  // Or use a test runner like Jest
  
  console.log('⚠️  These tests require Jest or similar test runner');
  console.log('⚠️  Make sure database is accessible and test data can be created');
}

