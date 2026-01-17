// ============================================================================
// REVENUE CALCULATOR UTILITY TESTS
// ============================================================================
// Comprehensive tests for revenue calculator utility functions
// Tests both calculateOrderRevenueByStatus and getOrderRevenueEvents
// Based on tests/income-daily-test-cases.md
// Matches the logic in apps/api/app/api/analytics/income/daily/route.ts

const {
  calculateOrderRevenueByStatus,
  getOrderRevenueEvents,
  calculateOrderRevenue,
  getFutureRevenueEvents,
  getRevenueByDate,
  calculateRevenueByDate,
  getOrderRevenueForDate,
  calculatePeriodRevenue,
  calculatePeriodRevenueBatch
} = require('../packages/utils/src/core/revenue-calculator');

const { ORDER_STATUS, ORDER_TYPE } = require('../packages/constants/src/index.ts');

// Helper to create date range
const createDateRange = (startDate, endDate) => [
  new Date(startDate),
  new Date(endDate)
];

describe('Revenue Calculator Utility', () => {
  // ============================================================================
  // calculateOrderRevenueByStatus TESTS
  // ============================================================================
  describe('calculateOrderRevenueByStatus', () => {
    describe('SALE Orders', () => {
      it('should return totalAmount for SALE order', () => {
        const order = {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.COMPLETED,
          totalAmount: 500000,
          createdAt: '2026-01-16T10:00:00Z'
        };

        const revenue = calculateOrderRevenueByStatus(order);
        expect(revenue).toBe(500000);
      });

      it('should return 0 for CANCELLED SALE order', () => {
        const order = {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.CANCELLED,
          totalAmount: 500000,
          createdAt: '2026-01-16T10:00:00Z'
        };

        const revenue = calculateOrderRevenueByStatus(order);
        expect(revenue).toBe(0);
      });
    });

    describe('RENT Orders - RESERVED Status', () => {
      it('should return depositAmount when not same day pickup/return', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: '2026-01-16T10:00:00Z',
          pickedUpAt: null,
          returnedAt: null
        };

        const revenue = calculateOrderRevenueByStatus(order);
        expect(revenue).toBe(200000);
      });

      it('should return 0 when same day pickup', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: '2026-01-16T10:00:00Z',
          pickedUpAt: '2026-01-16T14:00:00Z', // same day
          returnedAt: null
        };

        const revenue = calculateOrderRevenueByStatus(order);
        expect(revenue).toBe(0); // Deposit không tính riêng vì cùng ngày pickup
      });

      it('should return 0 when same day return', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 0,
          damageFee: 50000,
          createdAt: '2026-01-16T10:00:00Z',
          pickedUpAt: null,
          returnedAt: '2026-01-16T18:00:00Z' // same day
        };

        const revenue = calculateOrderRevenueByStatus(order);
        expect(revenue).toBe(0); // Deposit không tính riêng vì cùng ngày return
      });
    });

    describe('RENT Orders - PICKUPED Status', () => {
      it('should return totalAmount + securityDeposit when same day pickup (Case 1)', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: '2026-01-16T10:00:00Z',
          pickedUpAt: '2026-01-16T14:00:00Z', // same day
          returnedAt: null
        };

        const revenue = calculateOrderRevenueByStatus(order);
        expect(revenue).toBe(1100000); // 800k + 300k = 1,100k (KHÔNG trừ depositAmount)
      });

      it('should return totalAmount - depositAmount + securityDeposit when different day pickup (Case 2)', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: '2026-01-16T10:00:00Z',
          pickedUpAt: '2026-01-17T14:00:00Z', // different day
          returnedAt: null
        };

        const revenue = calculateOrderRevenueByStatus(order);
        expect(revenue).toBe(900000); // 800k - 200k + 300k = 900k (trừ depositAmount vì đã thu riêng)
      });
    });

    describe('RENT Orders - RETURNED Status', () => {
      it('should return totalAmount + damageFee for RETURNED order (always, regardless of dates)', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 100000,
          createdAt: '2026-01-16T10:00:00Z',
          pickedUpAt: '2026-01-17T14:00:00Z',
          returnedAt: '2026-01-18T18:00:00Z'
        };

        const revenue = calculateOrderRevenueByStatus(order);
        expect(revenue).toBe(900000); // 800k + 100k = 900k (tổng doanh thu thực tế)
      });

      it('should return totalAmount + damageFee for same day return', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 50000,
          createdAt: '2026-01-16T10:00:00Z',
          pickedUpAt: '2026-01-16T14:00:00Z', // same day
          returnedAt: '2026-01-16T18:00:00Z' // same day
        };

        const revenue = calculateOrderRevenueByStatus(order);
        expect(revenue).toBe(850000); // 800k + 50k = 850k
      });
    });

    describe('RENT Orders - CANCELLED Status', () => {
      it('should return 0 for CANCELLED order', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.CANCELLED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: '2026-01-16T10:00:00Z',
          pickedUpAt: null,
          returnedAt: null
        };

        const revenue = calculateOrderRevenueByStatus(order);
        expect(revenue).toBe(0);
      });
    });
  });

  // ============================================================================
  // getOrderRevenueEvents TESTS (Daily Income Analytics Logic)
  // ============================================================================
  describe('getOrderRevenueEvents - Daily Income Analytics Logic', () => {
    describe('RENT Orders - Complete Lifecycle', () => {
      it('should create deposit event when order is created (RESERVED)', () => {
        // Scenario: Order created on 2026-01-16
        // totalAmount: 800k, depositAmount: 200k
        // Expected: Revenue = 200k on 2026-01-16
        
        const [startDate, endDate] = createDateRange('2026-01-16T00:00:00Z', '2026-01-16T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 0,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: null,
          returnedAt: null
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(1);
        expect(events[0].revenue).toBe(200000);
        expect(events[0].revenueType).toBe('RENT_DEPOSIT');
        expect(events[0].date.toISOString()).toContain('2026-01-16');
      });

      it('should create pickup event when order is picked up (PICKUPED) - different day', () => {
        // Scenario: Order created on 2026-01-16, picked up on 2026-01-17
        // totalAmount: 800k, depositAmount: 200k (already paid), securityDeposit: 300k
        // Expected: Revenue = 800 - 200 + 300 = 900k on 2026-01-17 (trừ depositAmount vì đã thu riêng)
        
        const [startDate, endDate] = createDateRange('2026-01-17T00:00:00Z', '2026-01-17T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-17T14:00:00Z'),
          pickedUpAt: new Date('2026-01-17T14:00:00Z'),
          returnedAt: null
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(1);
        expect(events[0].revenue).toBe(900000); // 800 - 200 + 300 = 900k (trừ depositAmount vì đã thu riêng)
        expect(events[0].revenueType).toBe('RENT_PICKUP');
        expect(events[0].date.toISOString()).toContain('2026-01-17');
      });

      it('should create pickup event when order is picked up (PICKUPED) - same day', () => {
        // Scenario: Order created and picked up on 2026-01-16
        // totalAmount: 800k, depositAmount: 200k, securityDeposit: 300k
        // Expected: Revenue = 800 + 300 = 1100k on 2026-01-16 (KHÔNG trừ depositAmount)
        
        const [startDate, endDate] = createDateRange('2026-01-16T00:00:00Z', '2026-01-16T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-16T14:00:00Z'),
          pickedUpAt: new Date('2026-01-16T14:00:00Z'),
          returnedAt: null
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(1);
        expect(events[0].revenue).toBe(1100000); // 800 + 300 = 1100k (KHÔNG trừ depositAmount)
        expect(events[0].revenueType).toBe('RENT_PICKUP');
        expect(events[0].date.toISOString()).toContain('2026-01-16');
      });

      it('should create return event when order is returned (RETURNED) - different day', () => {
        // Scenario: Order returned on 2026-01-18 (created 16/01, picked up 17/01)
        // securityDeposit: 300k, damageFee: 400k
        // Expected: Revenue = 400 - 300 = 100k (dương = thu thêm phí hư hỏng) on 2026-01-18
        
        const [startDate, endDate] = createDateRange('2026-01-18T00:00:00Z', '2026-01-18T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 400000,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-18T16:00:00Z'),
          pickedUpAt: new Date('2026-01-17T14:00:00Z'),
          returnedAt: new Date('2026-01-18T16:00:00Z')
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(1);
        expect(events[0].revenue).toBe(100000); // 400 - 300 = 100k (thu thêm phí hư hỏng)
        expect(events[0].revenueType).toBe('RENT_RETURN');
        expect(events[0].description).toBe('Thu phí hư hỏng');
        expect(events[0].date.toISOString()).toContain('2026-01-18');
      });

      it('should create return event when order is returned (RETURNED) - same day', () => {
        // Scenario: Order created, picked up and returned on 2026-01-16
        // totalAmount: 800k, damageFee: 50k
        // Expected: Revenue = 800 + 50 = 850k on 2026-01-16 (KHÔNG tính deposit và pickup riêng)
        
        const [startDate, endDate] = createDateRange('2026-01-16T00:00:00Z', '2026-01-16T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 50000,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-16T16:00:00Z'),
          pickedUpAt: new Date('2026-01-16T14:00:00Z'),
          returnedAt: new Date('2026-01-16T16:00:00Z')
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(1);
        expect(events[0].revenue).toBe(850000); // 800 + 50 = 850k (KHÔNG tính deposit và pickup riêng)
        expect(events[0].revenueType).toBe('RENT_RETURN');
        expect(events[0].description).toBe('Thuê và trả trong cùng ngày');
        expect(events[0].date.toISOString()).toContain('2026-01-16');
      });

      it('should create negative return event when security deposit > damage fee (refund)', () => {
        // Scenario: Order returned on 2026-01-18
        // securityDeposit: 300k, damageFee: 100k
        // Expected: Revenue = 100 - 300 = -200k (negative = hoàn tiền cọc) on 2026-01-18
        
        const [startDate, endDate] = createDateRange('2026-01-18T00:00:00Z', '2026-01-18T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 100000,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-18T16:00:00Z'),
          pickedUpAt: new Date('2026-01-17T14:00:00Z'),
          returnedAt: new Date('2026-01-18T16:00:00Z')
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(1);
        expect(events[0].revenue).toBe(-200000); // 100 - 300 = -200k (trả lại cho khách)
        expect(events[0].revenueType).toBe('RENT_RETURN');
        expect(events[0].description).toBe('Hoàn tiền cọc');
      });

      it('should create multiple events for order lifecycle across different days', () => {
        // Scenario: Order created 16/01, picked up 17/01, returned 18/01
        // Query date range: 16/01 - 18/01
        // Expected: 3 events (deposit, pickup, return)
        
        const [startDate, endDate] = createDateRange('2026-01-16T00:00:00Z', '2026-01-18T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 400000,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-18T16:00:00Z'),
          pickedUpAt: new Date('2026-01-17T14:00:00Z'),
          returnedAt: new Date('2026-01-18T16:00:00Z')
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(3);
        
        // Event 1: Deposit on 16/01
        const depositEvent = events.find(e => e.revenueType === 'RENT_DEPOSIT');
        expect(depositEvent).toBeDefined();
        expect(depositEvent.revenue).toBe(200000);
        expect(depositEvent.date.toISOString()).toContain('2026-01-16');
        
        // Event 2: Pickup on 17/01
        const pickupEvent = events.find(e => e.revenueType === 'RENT_PICKUP');
        expect(pickupEvent).toBeDefined();
        expect(pickupEvent.revenue).toBe(900000); // 800 - 200 + 300 = 900k (trừ depositAmount)
        expect(pickupEvent.date.toISOString()).toContain('2026-01-17');
        
        // Event 3: Return on 18/01
        const returnEvent = events.find(e => e.revenueType === 'RENT_RETURN');
        expect(returnEvent).toBeDefined();
        expect(returnEvent.revenue).toBe(100000); // 400 - 300 = 100k (thu thêm phí hư hỏng)
        expect(returnEvent.date.toISOString()).toContain('2026-01-18');
      });
    });

    describe('Order Updates - Orders should appear after updates', () => {
      it('should show order with revenue = 0 if depositAmount = 0', () => {
        // Scenario: Order created with no deposit
        // Expected: Revenue = 0 (chưa thu tiền cọc, doanh thu = depositAmount = 0)
        
        const [startDate, endDate] = createDateRange('2026-01-16T00:00:00Z', '2026-01-16T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 0, // No deposit collected
          securityDeposit: 0,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: null,
          returnedAt: null
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(1);
        expect(events[0].revenue).toBe(0); // depositAmount = 0, revenue = 0
        expect(events[0].revenueType).toBe('RENT_DEPOSIT');
        expect(events[0].description).toBe('Thu tiền cọc');
      });

      it('should show order after status update (RESERVED -> PICKUPED)', () => {
        // Scenario: Order created 16/01, updated to PICKUPED on 17/01
        // Query date range: 16/01 - 17/01
        // Expected: 2 events (deposit on 16/01, pickup on 17/01)
        
        const [startDate, endDate] = createDateRange('2026-01-16T00:00:00Z', '2026-01-17T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED, // Updated status
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-17T14:00:00Z'),
          pickedUpAt: new Date('2026-01-17T14:00:00Z'), // Updated on 17/01
          returnedAt: null
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(2);
        expect(events.some(e => e.revenueType === 'RENT_DEPOSIT')).toBe(true);
        expect(events.some(e => e.revenueType === 'RENT_PICKUP')).toBe(true);
      });
    });

    describe('SALE Orders', () => {
      it('should create revenue event when SALE order is created', () => {
        const [startDate, endDate] = createDateRange('2026-01-16T00:00:00Z', '2026-01-16T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.COMPLETED,
          totalAmount: 500000,
          depositAmount: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-16T10:00:00Z')
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(1);
        expect(events[0].revenue).toBe(500000);
        expect(events[0].revenueType).toBe('SALE');
      });

      it('should create negative event when SALE order is cancelled (offset to 0)', () => {
        const [startDate, endDate] = createDateRange('2026-01-17T00:00:00Z', '2026-01-17T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.CANCELLED,
          totalAmount: 500000,
          depositAmount: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-17T14:00:00Z') // Cancelled on 17/01
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(1);
        expect(events[0].revenue).toBe(-500000); // Negative to offset
        expect(events[0].revenueType).toBe('SALE_CANCELLED');
      });
    });

    describe('CANCELLED Orders', () => {
      it('should offset deposit when RESERVED order is cancelled', () => {
        const [startDate, endDate] = createDateRange('2026-01-17T00:00:00Z', '2026-01-17T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.CANCELLED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 0,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-17T14:00:00Z'), // Cancelled on 17/01
          pickedUpAt: null,
          returnedAt: null
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(1);
        expect(events[0].revenue).toBe(-200000); // Hoàn lại tiền cọc
        expect(events[0].revenueType).toBe('RENT_CANCELLED');
        expect(events[0].description).toBe('Đơn hủy (hoàn lại)');
      });

      it('should offset everything when PICKUPED order is cancelled - different day pickup', () => {
        const [startDate, endDate] = createDateRange('2026-01-18T00:00:00Z', '2026-01-18T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.CANCELLED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-18T14:00:00Z'), // Cancelled on 18/01
          pickedUpAt: new Date('2026-01-17T14:00:00Z'), // Was picked up (different day)
          returnedAt: null
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(1);
        // Tổng đã thu: cọc (200k) + tiền lấy hàng (800-200+300 = 900k) = 1100k
        // Hoàn lại: -1100k
        expect(events[0].revenue).toBe(-1100000);
        expect(events[0].revenueType).toBe('RENT_CANCELLED');
        expect(events[0].description).toBe('Đơn hủy (hoàn lại)');
      });

      it('should offset everything when PICKUPED order is cancelled - same day pickup', () => {
        const [startDate, endDate] = createDateRange('2026-01-17T00:00:00Z', '2026-01-17T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.CANCELLED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: new Date('2026-01-17T10:00:00Z'),
          updatedAt: new Date('2026-01-17T16:00:00Z'), // Cancelled on 17/01
          pickedUpAt: new Date('2026-01-17T14:00:00Z'), // Was picked up (same day)
          returnedAt: null
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(1);
        // Tổng đã thu: pickup revenue (800+300 = 1100k) - KHÔNG tính deposit riêng
        // Hoàn lại: -1100k
        expect(events[0].revenue).toBe(-1100000);
        expect(events[0].revenueType).toBe('RENT_CANCELLED');
        expect(events[0].description).toBe('Đơn hủy (hoàn lại)');
      });
    });

    describe('Edge Cases', () => {
      it('should not create event if order was cancelled at creation time', () => {
        const [startDate, endDate] = createDateRange('2026-01-16T00:00:00Z', '2026-01-16T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.CANCELLED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 0,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-16T10:00:00Z'), // Same time = cancelled at creation
          pickedUpAt: null,
          returnedAt: null
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(0); // No event if cancelled at creation
      });

      it('should create pickup event when order picked up in range (even if created before range)', () => {
        // Scenario: Order created 15/01, picked up 16/01
        // Query date range: 16/01
        // Expected: Pickup event on 16/01 (order should appear)
        
        const [startDate, endDate] = createDateRange('2026-01-16T00:00:00Z', '2026-01-16T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: new Date('2026-01-15T10:00:00Z'), // Created before range
          updatedAt: new Date('2026-01-16T14:00:00Z'),
          pickedUpAt: new Date('2026-01-16T14:00:00Z'), // Picked up in range
          returnedAt: null
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(1); // Should have pickup event
        expect(events[0].revenueType).toBe('RENT_PICKUP');
        expect(events[0].revenue).toBe(900000); // 800 - 200 + 300 = 900k (trừ depositAmount vì đã thu riêng, tạo 15/01, pickup 16/01 = khác ngày)
        expect(events[0].date.toISOString()).toContain('2026-01-16');
      });

      it('should only include events within date range', () => {
        // Query only 16/01, but order was created 15/01 and picked up 17/01
        const [startDate, endDate] = createDateRange('2026-01-16T00:00:00Z', '2026-01-16T23:59:59Z');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: new Date('2026-01-15T10:00:00Z'), // Before range
          updatedAt: new Date('2026-01-17T14:00:00Z'),
          pickedUpAt: new Date('2026-01-17T14:00:00Z'), // After range
          returnedAt: null
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);
        
        expect(events).toHaveLength(0); // No events in range
      });
    });

    describe('RENT Orders - Case 1: Same Day Pickup', () => {
      it('should NOT create deposit event when pickup same day (Case 1)', () => {
        const [startDate, endDate] = createDateRange('2026-01-16', '2026-01-18');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 100000,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: new Date('2026-01-16T14:00:00Z'), // same day
          returnedAt: new Date('2026-01-17T18:00:00Z'),
          updatedAt: new Date('2026-01-17T18:00:00Z')
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);

        // Should NOT have deposit event (vì cùng ngày pickup)
        const depositEvents = events.filter(e => e.revenueType === 'RENT_DEPOSIT');
        expect(depositEvents).toHaveLength(0);

        // Should have pickup event with totalAmount + securityDeposit
        const pickupEvents = events.filter(e => e.revenueType === 'RENT_PICKUP');
        expect(pickupEvents).toHaveLength(1);
        expect(pickupEvents[0].revenue).toBe(1100000); // 800k + 300k = 1,100k
      });

      it('should create return event with damageFee - securityDeposit when different day return', () => {
        const [startDate, endDate] = createDateRange('2026-01-16', '2026-01-18');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 100000,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: new Date('2026-01-16T14:00:00Z'), // same day pickup
          returnedAt: new Date('2026-01-17T18:00:00Z'), // different day return
          updatedAt: new Date('2026-01-17T18:00:00Z')
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);

        const returnEvents = events.filter(e => e.revenueType === 'RENT_RETURN');
        expect(returnEvents).toHaveLength(1);
        expect(returnEvents[0].revenue).toBe(-200000); // 100k - 300k = -200k (trả lại cho khách)
      });
    });

    describe('RENT Orders - Case 2: Different Day Pickup', () => {
      it('should create deposit event when pickup different day (Case 2)', () => {
        const [startDate, endDate] = createDateRange('2026-01-16', '2026-01-18');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 100000,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: new Date('2026-01-17T14:00:00Z'), // different day
          returnedAt: null,
          updatedAt: new Date('2026-01-17T14:00:00Z')
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);

        // Should have deposit event
        const depositEvents = events.filter(e => e.revenueType === 'RENT_DEPOSIT');
        expect(depositEvents).toHaveLength(1);
        expect(depositEvents[0].revenue).toBe(200000);

        // Should have pickup event with totalAmount - depositAmount + securityDeposit
        const pickupEvents = events.filter(e => e.revenueType === 'RENT_PICKUP');
        expect(pickupEvents).toHaveLength(1);
        expect(pickupEvents[0].revenue).toBe(900000); // 800k - 200k + 300k = 900k
      });
    });

    describe('RENT Orders - Case 4: Same Day Return', () => {
      it('should NOT create deposit/pickup events when return same day (Case 4)', () => {
        const [startDate, endDate] = createDateRange('2026-01-16', '2026-01-17');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 50000,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: new Date('2026-01-16T14:00:00Z'), // same day
          returnedAt: new Date('2026-01-16T18:00:00Z'), // same day return
          updatedAt: new Date('2026-01-16T18:00:00Z')
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);

        // Should NOT have deposit event (vì cùng ngày return)
        const depositEvents = events.filter(e => e.revenueType === 'RENT_DEPOSIT');
        expect(depositEvents).toHaveLength(0);

        // Should NOT have pickup event (vì cùng ngày return)
        const pickupEvents = events.filter(e => e.revenueType === 'RENT_PICKUP');
        expect(pickupEvents).toHaveLength(0);

        // Should have return event with totalAmount + damageFee
        const returnEvents = events.filter(e => e.revenueType === 'RENT_RETURN');
        expect(returnEvents).toHaveLength(1);
        expect(returnEvents[0].revenue).toBe(850000); // 800k + 50k = 850k
        expect(returnEvents[0].description).toBe('Thuê và trả trong cùng ngày');
      });
    });

    describe('RENT Orders - Case 6: All Same Day', () => {
      it('should only create return event when all same day', () => {
        const [startDate, endDate] = createDateRange('2026-01-16', '2026-01-17');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 50000,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: new Date('2026-01-16T14:00:00Z'),
          returnedAt: new Date('2026-01-16T18:00:00Z'), // all same day
          updatedAt: new Date('2026-01-16T18:00:00Z')
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);

        // Should only have return event
        expect(events).toHaveLength(1);
        expect(events[0].revenueType).toBe('RENT_RETURN');
        expect(events[0].revenue).toBe(850000); // 800k + 50k = 850k
      });
    });

    describe('RENT Orders - CANCELLED', () => {
      it('should create negative event for CANCELLED order after pickup', () => {
        const [startDate, endDate] = createDateRange('2026-01-16', '2026-01-19');
        
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.CANCELLED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: new Date('2026-01-17T14:00:00Z'), // picked up
          returnedAt: null,
          updatedAt: new Date('2026-01-18T10:00:00Z') // cancelled later
        };

        const events = getOrderRevenueEvents(order, startDate, endDate);

        // Should have deposit, pickup, and cancelled events
        const cancelledEvents = events.filter(e => e.revenueType === 'RENT_CANCELLED');
        expect(cancelledEvents).toHaveLength(1);
        
        // Total collected = deposit + pickup = 200k + (800k - 200k + 300k) = 1,100k
        expect(cancelledEvents[0].revenue).toBe(-1100000); // Negative (refund)
      });
    });
  });

  // ============================================================================
  // calculateOrderRevenue TESTS
  // ============================================================================
  describe('calculateOrderRevenue', () => {
    it('should sum all revenue events', () => {
      const order = {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.RETURNED,
        totalAmount: 800000,
        depositAmount: 200000,
        securityDeposit: 300000,
        damageFee: 100000,
        createdAt: new Date('2026-01-16T10:00:00Z'),
        pickedUpAt: new Date('2026-01-17T14:00:00Z'),
        returnedAt: new Date('2026-01-18T18:00:00Z'),
        updatedAt: new Date('2026-01-18T18:00:00Z')
      };

      const totalRevenue = calculateOrderRevenue(order);

      // calculateOrderRevenue doesn't take date range, it calculates all events
      // Deposit: 200k + Pickup: (800k - 200k + 300k) = 900k + Return: (100k - 300k) = -200k
      // Total: 200k + 900k - 200k = 900k
      expect(totalRevenue).toBe(900000);
    });

    it('should return totalAmount + damageFee for same day return', () => {
      const order = {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.RETURNED,
        totalAmount: 800000,
        depositAmount: 200000,
        securityDeposit: 300000,
        damageFee: 50000,
        createdAt: new Date('2026-01-16T10:00:00Z'),
        pickedUpAt: new Date('2026-01-16T14:00:00Z'),
        returnedAt: new Date('2026-01-16T18:00:00Z'), // same day
        updatedAt: new Date('2026-01-16T18:00:00Z')
      };

      const totalRevenue = calculateOrderRevenue(order);

      // Only return event: 800k + 50k = 850k
      expect(totalRevenue).toBe(850000);
    });
  });

  // ============================================================================
  // getOrderRevenueForDate TESTS (Smart Revenue Calculation by Date)
  // ============================================================================
  describe('getOrderRevenueForDate', () => {
    describe('Case 1: Order đã RETURNED và targetDate sau returnedAt (quá khứ)', () => {
      it('should return totalAmount + damageFee for returned order in the past', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 100000,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: new Date('2026-01-17T14:00:00Z'),
          returnedAt: new Date('2026-01-18T16:00:00Z'),
          updatedAt: new Date('2026-01-18T16:00:00Z')
        };

        // targetDate sau ngày trả (quá khứ)
        const targetDate = new Date('2026-01-20T00:00:00Z');
        const revenue = getOrderRevenueForDate(order, targetDate);

        // Nên return totalAmount + damageFee (tổng doanh thu thực tế cuối cùng)
        expect(revenue).toBe(900000); // 800k + 100k
      });

      it('should return totalAmount + damageFee even if different day return', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 50000,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: new Date('2026-01-17T14:00:00Z'),
          returnedAt: new Date('2026-01-18T16:00:00Z'),
          updatedAt: new Date('2026-01-18T16:00:00Z')
        };

        // targetDate sau ngày trả
        const targetDate = new Date('2026-01-25T00:00:00Z');
        const revenue = getOrderRevenueForDate(order, targetDate);

        // Luôn return totalAmount + damageFee (tổng doanh thu thực tế)
        expect(revenue).toBe(850000); // 800k + 50k
      });
    });

    describe('Case 2: Order đã RETURNED và targetDate = returnedAt (ngày trả hàng)', () => {
      it('should return totalAmount + damageFee for same day return', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 50000,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: new Date('2026-01-16T14:00:00Z'), // same day
          returnedAt: new Date('2026-01-16T18:00:00Z'), // same day return
          updatedAt: new Date('2026-01-16T18:00:00Z')
        };

        // targetDate = returnedAt (ngày trả hàng)
        const targetDate = new Date('2026-01-16T12:00:00Z');
        const revenue = getOrderRevenueForDate(order, targetDate);

        // Same day return: totalAmount + damageFee
        expect(revenue).toBe(850000); // 800k + 50k
      });

      it('should return damageFee - securityDeposit for different day return', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 400000,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: new Date('2026-01-17T14:00:00Z'),
          returnedAt: new Date('2026-01-18T16:00:00Z'), // different day
          updatedAt: new Date('2026-01-18T16:00:00Z')
        };

        // targetDate = returnedAt (ngày trả hàng)
        const targetDate = new Date('2026-01-18T12:00:00Z');
        const revenue = getOrderRevenueForDate(order, targetDate);

        // Different day return: damageFee - securityDeposit
        expect(revenue).toBe(100000); // 400k - 300k = 100k (thu thêm phí hư hỏng)
      });
    });

    describe('Case 3: targetDate là tương lai - Future Pickup', () => {
      it('should return future pickup revenue for RESERVED order with pickupPlanAt', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: null,
          returnedAt: null,
          pickupPlanAt: new Date('2026-01-25T14:00:00Z'), // Future pickup
          updatedAt: new Date('2026-01-16T10:00:00Z')
        };

        // targetDate = pickupPlanAt (tương lai)
        const targetDate = new Date('2026-01-25T12:00:00Z');
        const revenue = getOrderRevenueForDate(order, targetDate);

        // Future pickup revenue = totalAmount - depositAmount
        expect(revenue).toBe(600000); // 800k - 200k
      });

      it('should return 0 if targetDate is future but not pickupPlanAt date', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: null,
          returnedAt: null,
          pickupPlanAt: new Date('2026-01-25T14:00:00Z'),
          updatedAt: new Date('2026-01-16T10:00:00Z')
        };

        // targetDate khác pickupPlanAt
        const targetDate = new Date('2026-01-30T12:00:00Z');
        const revenue = getOrderRevenueForDate(order, targetDate);

        // Không có future income cho ngày này
        expect(revenue).toBe(0);
      });
    });

    describe('Case 4: targetDate là tương lai - Future Return', () => {
      it('should return future return revenue for PICKUPED order with returnPlanAt', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 100000, // Estimated damage fee
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: new Date('2026-01-17T14:00:00Z'),
          returnedAt: null,
          returnPlanAt: new Date('2026-01-28T16:00:00Z'), // Future return
          updatedAt: new Date('2026-01-17T14:00:00Z')
        };

        // targetDate = returnPlanAt (tương lai)
        const targetDate = new Date('2026-01-28T12:00:00Z');
        const revenue = getOrderRevenueForDate(order, targetDate);

        // Future return revenue = damageFee - securityDeposit
        expect(revenue).toBe(-200000); // 100k - 300k = -200k (hoàn tiền cọc)
      });

      it('should return positive future return revenue if damageFee > securityDeposit', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 500000, // High damage fee
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: new Date('2026-01-17T14:00:00Z'),
          returnedAt: null,
          returnPlanAt: new Date('2026-01-28T16:00:00Z'),
          updatedAt: new Date('2026-01-17T14:00:00Z')
        };

        // targetDate = returnPlanAt (tương lai)
        const targetDate = new Date('2026-01-28T12:00:00Z');
        const revenue = getOrderRevenueForDate(order, targetDate);

        // Future return revenue = damageFee - securityDeposit (dương = thu thêm)
        expect(revenue).toBe(200000); // 500k - 300k = 200k (thu phí hư hỏng)
      });
    });

    describe('Case 5: targetDate trong quá khứ/hiện tại - Real Events', () => {
      it('should return deposit revenue for RESERVED order on createdAt date', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: null,
          returnedAt: null,
          updatedAt: new Date('2026-01-16T10:00:00Z')
        };

        // targetDate = createdAt (quá khứ)
        const targetDate = new Date('2026-01-16T12:00:00Z');
        const revenue = getOrderRevenueForDate(order, targetDate);

        // Deposit revenue
        expect(revenue).toBe(200000);
      });

      it('should return pickup revenue for PICKUPED order on pickedUpAt date', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: new Date('2026-01-17T14:00:00Z'), // different day
          returnedAt: null,
          updatedAt: new Date('2026-01-17T14:00:00Z')
        };

        // targetDate = pickedUpAt (quá khứ)
        const targetDate = new Date('2026-01-17T12:00:00Z');
        const revenue = getOrderRevenueForDate(order, targetDate);

        // Pickup revenue = totalAmount - depositAmount + securityDeposit
        expect(revenue).toBe(900000); // 800k - 200k + 300k
      });

      it('should return pickup revenue for same day pickup', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: new Date('2026-01-16T14:00:00Z'), // same day
          returnedAt: null,
          updatedAt: new Date('2026-01-16T14:00:00Z')
        };

        // targetDate = pickedUpAt (same day)
        const targetDate = new Date('2026-01-16T12:00:00Z');
        const revenue = getOrderRevenueForDate(order, targetDate);

        // Same day pickup: totalAmount + securityDeposit (KHÔNG trừ depositAmount)
        expect(revenue).toBe(1100000); // 800k + 300k
      });
    });

    describe('Edge Cases', () => {
      it('should return 0 for CANCELLED order', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.CANCELLED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          pickedUpAt: null,
          returnedAt: null,
          updatedAt: new Date('2026-01-17T14:00:00Z')
        };

        const targetDate = new Date('2026-01-17T12:00:00Z');
        const revenue = getOrderRevenueForDate(order, targetDate);

        // CANCELLED order should return negative event (refund)
        // But if no events in that date, return 0
        expect(revenue).toBeLessThanOrEqual(0);
      });

      it('should return 0 for SALE order on future date', () => {
        const order = {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.COMPLETED,
          totalAmount: 500000,
          depositAmount: 0,
          createdAt: new Date('2026-01-16T10:00:00Z'),
          updatedAt: new Date('2026-01-16T10:00:00Z')
        };

        // Future date
        const targetDate = new Date('2026-01-25T12:00:00Z');
        const revenue = getOrderRevenueForDate(order, targetDate);

        // SALE orders don't have future income
        expect(revenue).toBe(0);
      });

      it('should handle order with no dates correctly', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: null,
          pickedUpAt: null,
          returnedAt: null,
          updatedAt: null
        };

        const targetDate = new Date('2026-01-16T12:00:00Z');
        const revenue = getOrderRevenueForDate(order, targetDate);

        // Should return 0 if no dates
        expect(revenue).toBe(0);
      });
    });
  });

  // ============================================================================
  // calculatePeriodRevenue TESTS
  // ============================================================================
  describe('calculatePeriodRevenue', () => {
    describe('Real Income (Past/Current Events)', () => {
      it('should calculate real income for SALE order in period', () => {
        const order = {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.COMPLETED,
          totalAmount: 500000,
          depositAmount: 0,
          securityDeposit: 0,
          damageFee: 0,
          createdAt: '2026-01-15T10:00:00Z',
          pickedUpAt: null,
          returnedAt: null,
          updatedAt: null
        };

        const periodStart = new Date('2026-01-15T00:00:00Z');
        const periodEnd = new Date('2026-01-15T23:59:59Z');

        const { realIncome, futureIncome } = calculatePeriodRevenue(order, periodStart, periodEnd);

        expect(realIncome).toBe(500000);
        expect(futureIncome).toBe(0);
      });

      it('should calculate real income for RENT order with deposit in period', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: '2026-01-15T10:00:00Z',
          pickedUpAt: '2026-01-16T14:00:00Z', // different day
          returnedAt: null,
          updatedAt: null
        };

        const periodStart = new Date('2026-01-15T00:00:00Z');
        const periodEnd = new Date('2026-01-15T23:59:59Z');

        const { realIncome, futureIncome } = calculatePeriodRevenue(order, periodStart, periodEnd);

        expect(realIncome).toBe(200000); // Deposit only
        expect(futureIncome).toBe(0);
      });

      it('should calculate real income for RENT order with pickup in period', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: '2026-01-15T10:00:00Z',
          pickedUpAt: '2026-01-16T14:00:00Z', // different day
          returnedAt: null,
          updatedAt: null
        };

        const periodStart = new Date('2026-01-16T00:00:00Z');
        const periodEnd = new Date('2026-01-16T23:59:59Z');

        const { realIncome, futureIncome } = calculatePeriodRevenue(order, periodStart, periodEnd);

        // Pickup revenue: totalAmount - depositAmount + securityDeposit
        expect(realIncome).toBe(800000 - 200000 + 300000); // 900000
        expect(futureIncome).toBe(0);
      });

      it('should calculate real income for RENT order with return in period', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 50000,
          createdAt: '2026-01-15T10:00:00Z',
          pickedUpAt: '2026-01-16T14:00:00Z',
          returnedAt: '2026-01-17T16:00:00Z', // different day return
          updatedAt: null
        };

        const periodStart = new Date('2026-01-17T00:00:00Z');
        const periodEnd = new Date('2026-01-17T23:59:59Z');

        const { realIncome, futureIncome } = calculatePeriodRevenue(order, periodStart, periodEnd);

        // Return revenue: damageFee - securityDeposit
        expect(realIncome).toBe(50000 - 300000); // -250000 (hoàn tiền cọc)
        expect(futureIncome).toBe(0);
      });

      it('should calculate real income for same day return', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 50000,
          createdAt: '2026-01-15T10:00:00Z',
          pickedUpAt: '2026-01-15T14:00:00Z', // same day
          returnedAt: '2026-01-15T18:00:00Z', // same day
          updatedAt: null
        };

        const periodStart = new Date('2026-01-15T00:00:00Z');
        const periodEnd = new Date('2026-01-15T23:59:59Z');

        const { realIncome, futureIncome } = calculatePeriodRevenue(order, periodStart, periodEnd);

        // Same day return: totalAmount + damageFee
        expect(realIncome).toBe(800000 + 50000); // 850000
        expect(futureIncome).toBe(0);
      });

      it('should handle CANCELLED order with refund', () => {
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.CANCELLED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: '2026-01-15T10:00:00Z',
          pickedUpAt: '2026-01-16T14:00:00Z',
          returnedAt: null,
          updatedAt: '2026-01-17T16:00:00Z' // cancelled
        };

        const periodStart = new Date('2026-01-17T00:00:00Z');
        const periodEnd = new Date('2026-01-17T23:59:59Z');

        const { realIncome, futureIncome } = calculatePeriodRevenue(order, periodStart, periodEnd);

        // Cancelled: refund all collected (negative revenue)
        // Collected: depositAmount + (totalAmount - depositAmount + securityDeposit)
        // = 200000 + (800000 - 200000 + 300000) = 1100000
        expect(realIncome).toBe(-1100000); // Refund
        expect(futureIncome).toBe(0);
      });
    });

    describe('Future Income (Future Events)', () => {
      it('should calculate future income for RESERVED order with future pickup', () => {
        const now = new Date();
        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + 5); // 5 days in future

        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: '2026-01-15T10:00:00Z',
          pickedUpAt: null,
          returnedAt: null,
          pickupPlanAt: futureDate.toISOString(),
          returnPlanAt: null,
          updatedAt: null
        };

        const periodStart = new Date(futureDate);
        periodStart.setHours(0, 0, 0, 0);
        const periodEnd = new Date(futureDate);
        periodEnd.setHours(23, 59, 59, 999);

        const { realIncome, futureIncome } = calculatePeriodRevenue(order, periodStart, periodEnd);

        // Future pickup revenue: totalAmount - depositAmount
        expect(realIncome).toBe(0);
        expect(futureIncome).toBe(800000 - 200000); // 600000
      });

      it('should calculate future income for PICKUPED order with future return', () => {
        const now = new Date();
        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + 5); // 5 days in future

        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 50000, // Estimated damage fee
          createdAt: '2026-01-15T10:00:00Z',
          pickedUpAt: '2026-01-16T14:00:00Z',
          returnedAt: null,
          pickupPlanAt: null,
          returnPlanAt: futureDate.toISOString(),
          updatedAt: null
        };

        const periodStart = new Date(futureDate);
        periodStart.setHours(0, 0, 0, 0);
        const periodEnd = new Date(futureDate);
        periodEnd.setHours(23, 59, 59, 999);

        const { realIncome, futureIncome } = calculatePeriodRevenue(order, periodStart, periodEnd);

        // Future return revenue: damageFee - securityDeposit
        expect(realIncome).toBe(0);
        expect(futureIncome).toBe(50000 - 300000); // -250000 (hoàn tiền cọc)
      });

      it('should return 0 for future income if pickupPlanAt is not in period', () => {
        const now = new Date();
        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + 5);

        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: '2026-01-15T10:00:00Z',
          pickedUpAt: null,
          returnedAt: null,
          pickupPlanAt: futureDate.toISOString(),
          returnPlanAt: null,
          updatedAt: null
        };

        // Period is different from pickupPlanAt
        const periodStart = new Date('2026-01-20T00:00:00Z');
        const periodEnd = new Date('2026-01-20T23:59:59Z');

        const { realIncome, futureIncome } = calculatePeriodRevenue(order, periodStart, periodEnd);

        expect(realIncome).toBe(0);
        expect(futureIncome).toBe(0); // No future events in this period
      });
    });

    describe('Mixed Real and Future Income', () => {
      it('should calculate both real and future income in same period', () => {
        const now = new Date();
        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + 5);

        // Order with real event (deposit) and future event (pickup)
        const order = {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: '2026-01-15T10:00:00Z', // Real event
          pickedUpAt: null,
          returnedAt: null,
          pickupPlanAt: futureDate.toISOString(), // Future event
          returnPlanAt: null,
          updatedAt: null
        };

        // Period includes both dates
        const periodStart = new Date('2026-01-15T00:00:00Z');
        const periodEnd = new Date(futureDate);
        periodEnd.setHours(23, 59, 59, 999);

        const { realIncome, futureIncome } = calculatePeriodRevenue(order, periodStart, periodEnd);

        // Real income: deposit on createdAt
        expect(realIncome).toBe(200000);
        // Future income: pickup on futureDate
        expect(futureIncome).toBe(800000 - 200000); // 600000
      });
    });
  });

  // ============================================================================
  // calculatePeriodRevenueBatch TESTS
  // ============================================================================
  describe('calculatePeriodRevenueBatch', () => {
    it('should calculate revenue for multiple orders', () => {
      const orders = [
        {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.COMPLETED,
          totalAmount: 500000,
          depositAmount: 0,
          securityDeposit: 0,
          damageFee: 0,
          createdAt: '2026-01-15T10:00:00Z',
          pickedUpAt: null,
          returnedAt: null,
          updatedAt: null
        },
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: '2026-01-15T11:00:00Z',
          pickedUpAt: null,
          returnedAt: null,
          updatedAt: null
        }
      ];

      const periodStart = new Date('2026-01-15T00:00:00Z');
      const periodEnd = new Date('2026-01-15T23:59:59Z');

      const { realIncome, futureIncome } = calculatePeriodRevenueBatch(orders, periodStart, periodEnd);

      // Order 1: 500000 (SALE)
      // Order 2: 200000 (deposit)
      expect(realIncome).toBe(500000 + 200000); // 700000
      expect(futureIncome).toBe(0);
    });

    it('should aggregate real and future income separately', () => {
      const now = new Date();
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + 5);

      const orders = [
        {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.COMPLETED,
          totalAmount: 500000,
          depositAmount: 0,
          securityDeposit: 0,
          damageFee: 0,
          createdAt: '2026-01-15T10:00:00Z',
          pickedUpAt: null,
          returnedAt: null,
          updatedAt: null
        },
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: '2026-01-15T11:00:00Z',
          pickedUpAt: null,
          returnedAt: null,
          pickupPlanAt: futureDate.toISOString(),
          returnPlanAt: null,
          updatedAt: null
        }
      ];

      const periodStart = new Date('2026-01-15T00:00:00Z');
      const periodEnd = new Date(futureDate);
      periodEnd.setHours(23, 59, 59, 999);

      const { realIncome, futureIncome } = calculatePeriodRevenueBatch(orders, periodStart, periodEnd);

      // Real income: 500000 (SALE) + 200000 (deposit) = 700000
      expect(realIncome).toBe(700000);
      // Future income: 600000 (future pickup)
      expect(futureIncome).toBe(600000);
    });

    it('should handle empty orders array', () => {
      const orders = [];
      const periodStart = new Date('2026-01-15T00:00:00Z');
      const periodEnd = new Date('2026-01-15T23:59:59Z');

      const { realIncome, futureIncome } = calculatePeriodRevenueBatch(orders, periodStart, periodEnd);

      expect(realIncome).toBe(0);
      expect(futureIncome).toBe(0);
    });

    it('should handle orders with no events in period', () => {
      const orders = [
        {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.COMPLETED,
          totalAmount: 500000,
          depositAmount: 0,
          securityDeposit: 0,
          damageFee: 0,
          createdAt: '2026-01-10T10:00:00Z', // Before period
          pickedUpAt: null,
          returnedAt: null,
          updatedAt: null
        }
      ];

      const periodStart = new Date('2026-01-15T00:00:00Z');
      const periodEnd = new Date('2026-01-15T23:59:59Z');

      const { realIncome, futureIncome } = calculatePeriodRevenueBatch(orders, periodStart, periodEnd);

      expect(realIncome).toBe(0);
      expect(futureIncome).toBe(0);
    });

    it('should handle complex scenario with multiple order types and statuses', () => {
      const now = new Date();
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + 5);

      const orders = [
        // SALE order
        {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.COMPLETED,
          totalAmount: 500000,
          depositAmount: 0,
          securityDeposit: 0,
          damageFee: 0,
          createdAt: '2026-01-15T10:00:00Z',
          pickedUpAt: null,
          returnedAt: null,
          updatedAt: null
        },
        // RENT order with deposit
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 800000,
          depositAmount: 200000,
          securityDeposit: 300000,
          damageFee: 0,
          createdAt: '2026-01-15T11:00:00Z',
          pickedUpAt: null,
          returnedAt: null,
          updatedAt: null
        },
        // RENT order with future pickup (created before period to avoid deposit event)
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 1000000,
          depositAmount: 300000,
          securityDeposit: 400000,
          damageFee: 0,
          createdAt: '2026-01-10T12:00:00Z', // Created before period to avoid deposit event
          pickedUpAt: null,
          returnedAt: null,
          pickupPlanAt: futureDate.toISOString(),
          returnPlanAt: null,
          updatedAt: null
        }
      ];

      const periodStart = new Date('2026-01-15T00:00:00Z');
      const periodEnd = new Date(futureDate);
      periodEnd.setHours(23, 59, 59, 999);

      const { realIncome, futureIncome } = calculatePeriodRevenueBatch(orders, periodStart, periodEnd);

      // Real income: 500000 (SALE) + 200000 (deposit) = 700000
      expect(realIncome).toBe(700000);
      // Future income: 1000000 - 300000 = 700000 (future pickup)
      expect(futureIncome).toBe(700000);
    });
  });
});
