// ============================================================================
// DAILY INCOME ANALYTICS LOGIC TESTS
// ============================================================================
// Tests for daily income calculation logic based on timestamps
// Matches the logic in apps/api/app/api/analytics/income/daily/route.ts

const { ORDER_STATUS, ORDER_TYPE } = require('../packages/constants/src');

/**
 * Simulate the getOrderRevenueEvents function from route.ts
 * Generate revenue events based on TIMESTAMPS in the date range
 */
const getOrderRevenueEvents = (order, dateRangeStart, dateRangeEnd) => {
  const events = [];

  if (order.orderType === ORDER_TYPE.SALE) {
    // SALE orders: revenue is totalAmount on createdAt date IF created in range
    if (order.createdAt) {
      const createdDate = new Date(order.createdAt);
      if (createdDate >= dateRangeStart && createdDate <= dateRangeEnd) {
        const wasCancelledAtCreation = order.status === ORDER_STATUS.CANCELLED && 
          (!order.updatedAt || new Date(order.updatedAt).getTime() === createdDate.getTime());
        
        if (!wasCancelledAtCreation) {
          events.push({
            revenue: order.totalAmount || 0,
            date: createdDate,
            description: 'Sale order created',
            revenueType: 'SALE'
          });
        }
      }
    }

    // SALE order cancellation: negative revenue on updatedAt date
    if (order.status === ORDER_STATUS.CANCELLED && order.updatedAt) {
      const cancelledDate = new Date(order.updatedAt);
      if (cancelledDate >= dateRangeStart && cancelledDate <= dateRangeEnd) {
        const createdDate = order.createdAt ? new Date(order.createdAt) : null;
        if (createdDate && createdDate < cancelledDate) {
          events.push({
            revenue: -(order.totalAmount || 0),
            date: cancelledDate,
            description: 'Sale order cancelled (refund)',
            revenueType: 'SALE_CANCELLED'
          });
        }
      }
    }
  } else {
    // RENT orders: track events by timestamp
    
    // 1. RESERVED: Deposit collected when order is CREATED (createdAt within range)
    if (order.createdAt) {
      const createdDate = new Date(order.createdAt);
      if (createdDate >= dateRangeStart && createdDate <= dateRangeEnd) {
        const wasCancelledAtCreation = order.status === ORDER_STATUS.CANCELLED && 
          (!order.updatedAt || new Date(order.updatedAt).getTime() === createdDate.getTime());
        
        if (!wasCancelledAtCreation) {
          events.push({
            revenue: order.depositAmount || 0,
            date: createdDate,
            description: 'Rental deposit collected',
            revenueType: 'RENT_DEPOSIT'
          });
        }
      }
    }

    // 2. PICKUPED: Additional payment when order is PICKED UP (pickedUpAt within range)
    if (order.pickedUpAt) {
      const pickupDate = new Date(order.pickedUpAt);
      if (pickupDate >= dateRangeStart && pickupDate <= dateRangeEnd) {
        const pickupRevenue = (order.totalAmount || 0) - (order.depositAmount || 0) + (order.securityDeposit || 0);
        events.push({
          revenue: pickupRevenue,
          date: pickupDate,
          description: 'Rental pickup payment',
          revenueType: 'RENT_PICKUP'
        });
      }
    }

    // 3. RETURNED: Final settlement when order is RETURNED (returnedAt within range)
    if (order.returnedAt) {
      const returnDate = new Date(order.returnedAt);
      if (returnDate >= dateRangeStart && returnDate <= dateRangeEnd) {
        const returnRevenue = (order.damageFee || 0) - (order.securityDeposit || 0);
        events.push({
          revenue: returnRevenue,
          date: returnDate,
          description: returnRevenue > 0 
            ? 'Rental return (damage fee)' 
            : returnRevenue < 0 
              ? 'Rental return (security deposit refund)' 
              : 'Rental return (no additional fee)',
          revenueType: 'RENT_RETURN'
        });
      }
    }

    // 4. CANCELLED: Refund when order is CANCELLED (updatedAt within range and status is CANCELLED)
    if (order.status === ORDER_STATUS.CANCELLED && order.updatedAt) {
      const cancelledDate = new Date(order.updatedAt);
      if (cancelledDate >= dateRangeStart && cancelledDate <= dateRangeEnd) {
        const createdDate = order.createdAt ? new Date(order.createdAt) : null;
        const pickupDate = order.pickedUpAt ? new Date(order.pickedUpAt) : null;
        
        let refundAmount = 0;
        if (pickupDate && pickupDate < cancelledDate) {
          refundAmount = -((order.totalAmount || 0) - (order.depositAmount || 0) + (order.securityDeposit || 0));
        } else if (createdDate && createdDate < cancelledDate) {
          refundAmount = -(order.depositAmount || 0);
        }
        
        if (refundAmount !== 0) {
          events.push({
            revenue: refundAmount,
            date: cancelledDate,
            description: 'Rental order cancelled (refund)',
            revenueType: 'RENT_CANCELLED'
          });
        }
      }
    }
  }

  return events;
};

describe('Daily Income Analytics Logic - Timestamp Based', () => {

  describe('RENT Orders - Complete Lifecycle', () => {
    it('should create deposit event when order is created (RESERVED)', () => {
      // Scenario: Order created on 2026-01-16
      // totalAmount: 800k, depositAmount: 200k
      // Expected: Revenue = 200k on 2026-01-16
      
      const startDate = new Date('2026-01-16T00:00:00Z');
      const endDate = new Date('2026-01-16T23:59:59Z');
      
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

    it('should create pickup event when order is picked up (PICKUPED)', () => {
      // Scenario: Order created on 2026-01-16, picked up on 2026-01-17
      // totalAmount: 800k, depositAmount: 200k (already paid), securityDeposit: 300k
      // Expected: Revenue = (800 - 200) + 300 = 900k on 2026-01-17
      
      const startDate = new Date('2026-01-17T00:00:00Z');
      const endDate = new Date('2026-01-17T23:59:59Z');
      
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
      expect(events[0].revenue).toBe(900000); // (800 - 200) + 300 = 900k
      expect(events[0].revenueType).toBe('RENT_PICKUP');
      expect(events[0].date.toISOString()).toContain('2026-01-17');
    });

    it('should create return event when order is returned (RETURNED)', () => {
      // Scenario: Order returned on 2026-01-18
      // securityDeposit: 300k, damageFee: 400k
      // Expected: Revenue = 400 - 300 = 100k (positive = collect more) on 2026-01-18
      
      const startDate = new Date('2026-01-18T00:00:00Z');
      const endDate = new Date('2026-01-18T23:59:59Z');
      
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
      expect(events[0].revenue).toBe(100000); // 400 - 300 = 100k (collect more)
      expect(events[0].revenueType).toBe('RENT_RETURN');
      expect(events[0].description).toBe('Rental return (damage fee)');
      expect(events[0].date.toISOString()).toContain('2026-01-18');
    });

    it('should create negative return event when security deposit > damage fee (refund)', () => {
      // Scenario: Order returned on 2026-01-18
      // securityDeposit: 300k, damageFee: 100k
      // Expected: Revenue = 100 - 300 = -200k (negative = refund) on 2026-01-18
      
      const startDate = new Date('2026-01-18T00:00:00Z');
      const endDate = new Date('2026-01-18T23:59:59Z');
      
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
      expect(events[0].revenue).toBe(-200000); // 100 - 300 = -200k (refund)
      expect(events[0].revenueType).toBe('RENT_RETURN');
      expect(events[0].description).toBe('Rental return (security deposit refund)');
    });

    it('should create multiple events for order lifecycle across different days', () => {
      // Scenario: Order created 16/01, picked up 17/01, returned 18/01
      // Query date range: 16/01 - 18/01
      // Expected: 3 events (deposit, pickup, return)
      
      const startDate = new Date('2026-01-16T00:00:00Z');
      const endDate = new Date('2026-01-18T23:59:59Z');
      
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
      expect(pickupEvent.revenue).toBe(900000); // (800 - 200) + 300
      expect(pickupEvent.date.toISOString()).toContain('2026-01-17');
      
      // Event 3: Return on 18/01
      const returnEvent = events.find(e => e.revenueType === 'RENT_RETURN');
      expect(returnEvent).toBeDefined();
      expect(returnEvent.revenue).toBe(100000); // 400 - 300
      expect(returnEvent.date.toISOString()).toContain('2026-01-18');
    });
  });

  describe('Order Updates - Orders should appear after updates', () => {
    it('should show order even if depositAmount = 0', () => {
      // Scenario: Order created with no deposit
      // Expected: Still create event with revenue = 0
      
      const startDate = new Date('2026-01-16T00:00:00Z');
      const endDate = new Date('2026-01-16T23:59:59Z');
      
      const order = {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.RESERVED,
        totalAmount: 800000,
        depositAmount: 0, // No deposit
        securityDeposit: 0,
        damageFee: 0,
        createdAt: new Date('2026-01-16T10:00:00Z'),
        updatedAt: new Date('2026-01-16T10:00:00Z'),
        pickedUpAt: null,
        returnedAt: null
      };

      const events = getOrderRevenueEvents(order, startDate, endDate);
      
      expect(events).toHaveLength(1);
      expect(events[0].revenue).toBe(0);
      expect(events[0].revenueType).toBe('RENT_DEPOSIT');
    });

    it('should show order after status update (RESERVED -> PICKUPED)', () => {
      // Scenario: Order created 16/01, updated to PICKUPED on 17/01
      // Query date range: 16/01 - 17/01
      // Expected: 2 events (deposit on 16/01, pickup on 17/01)
      
      const startDate = new Date('2026-01-16T00:00:00Z');
      const endDate = new Date('2026-01-17T23:59:59Z');
      
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
      const startDate = new Date('2026-01-16T00:00:00Z');
      const endDate = new Date('2026-01-16T23:59:59Z');
      
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

    it('should create negative event when SALE order is cancelled', () => {
      const startDate = new Date('2026-01-17T00:00:00Z');
      const endDate = new Date('2026-01-17T23:59:59Z');
      
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
      expect(events[0].revenue).toBe(-500000);
      expect(events[0].revenueType).toBe('SALE_CANCELLED');
    });
  });

  describe('CANCELLED Orders', () => {
    it('should refund deposit when RESERVED order is cancelled', () => {
      const startDate = new Date('2026-01-17T00:00:00Z');
      const endDate = new Date('2026-01-17T23:59:59Z');
      
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
      expect(events[0].revenue).toBe(-200000); // Refund deposit
      expect(events[0].revenueType).toBe('RENT_CANCELLED');
    });

    it('should refund everything when PICKUPED order is cancelled', () => {
      const startDate = new Date('2026-01-18T00:00:00Z');
      const endDate = new Date('2026-01-18T23:59:59Z');
      
      const order = {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.CANCELLED,
        totalAmount: 800000,
        depositAmount: 200000,
        securityDeposit: 300000,
        damageFee: 0,
        createdAt: new Date('2026-01-16T10:00:00Z'),
        updatedAt: new Date('2026-01-18T14:00:00Z'), // Cancelled on 18/01
        pickedUpAt: new Date('2026-01-17T14:00:00Z'), // Was picked up
        returnedAt: null
      };

      const events = getOrderRevenueEvents(order, startDate, endDate);
      
      expect(events).toHaveLength(1);
      // Refund: -(total - deposit + security) = -(800 - 200 + 300) = -900k
      expect(events[0].revenue).toBe(-900000);
      expect(events[0].revenueType).toBe('RENT_CANCELLED');
    });
  });

  describe('Edge Cases', () => {
    it('should not create event if order was cancelled at creation time', () => {
      const startDate = new Date('2026-01-16T00:00:00Z');
      const endDate = new Date('2026-01-16T23:59:59Z');
      
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

    it('should only include events within date range', () => {
      // Query only 16/01, but order was created 15/01 and picked up 17/01
      const startDate = new Date('2026-01-16T00:00:00Z');
      const endDate = new Date('2026-01-16T23:59:59Z');
      
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
});
