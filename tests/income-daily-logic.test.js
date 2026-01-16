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
            description: 'Đơn bán được tạo',
            revenueType: 'SALE'
          });
        }
      }
    }

    // SALE order cancellation: create negative event to offset revenue (ensure total revenue = 0)
    if (order.status === ORDER_STATUS.CANCELLED && order.updatedAt) {
      const cancelledDate = new Date(order.updatedAt);
      if (cancelledDate >= dateRangeStart && cancelledDate <= dateRangeEnd) {
        const createdDate = order.createdAt ? new Date(order.createdAt) : null;
        if (createdDate && createdDate < cancelledDate) {
          events.push({
            revenue: -(order.totalAmount || 0),
            date: cancelledDate,
            description: 'Đơn bán bị hủy (hoàn lại)',
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
            description: 'Thu tiền cọc',
            revenueType: 'RENT_DEPOSIT'
          });
        }
      }
    }

    // 2. PICKUPED: Additional payment when order is PICKED UP
    // Doanh thu = totalAmount - depositAmount + securityDeposit
    // Tìm ngày lấy hàng: ưu tiên pickedUpAt, nếu không có thì dùng createdAt hoặc updatedAt
    let pickupDate = null;
    
    if (order.pickedUpAt) {
      const pickedUpDate = new Date(order.pickedUpAt);
      if (pickedUpDate >= dateRangeStart && pickedUpDate <= dateRangeEnd) {
        pickupDate = pickedUpDate;
      }
    }
    
    // Nếu không có pickedUpAt trong khoảng, kiểm tra createdAt hoặc updatedAt
    if (!pickupDate && order.status === ORDER_STATUS.PICKUPED) {
      if (order.createdAt) {
        const createdDate = new Date(order.createdAt);
        if (createdDate >= dateRangeStart && createdDate <= dateRangeEnd) {
          pickupDate = createdDate;
        }
      }
      if (!pickupDate && order.updatedAt) {
        const updatedDate = new Date(order.updatedAt);
        if (updatedDate >= dateRangeStart && updatedDate <= dateRangeEnd) {
          pickupDate = updatedDate;
        }
      }
    }
    
    // Tạo event nếu tìm thấy ngày lấy hàng trong khoảng
    if (pickupDate) {
      const pickupRevenue = (order.totalAmount || 0) - (order.depositAmount || 0) + (order.securityDeposit || 0);
      events.push({
        revenue: pickupRevenue,
        date: pickupDate,
        description: 'Thu tiền khi lấy hàng',
        revenueType: 'RENT_PICKUP'
      });
    }

    // 3. RETURNED: Final settlement when order is RETURNED (returnedAt within range)
    // Doanh thu = securityDeposit - damageFee
    // - Dương: thu thêm phí hư hỏng (damageFee > securityDeposit)
    // - Âm: hoàn tiền cọc (securityDeposit > damageFee)
    if (order.returnedAt) {
      const returnDate = new Date(order.returnedAt);
      if (returnDate >= dateRangeStart && returnDate <= dateRangeEnd) {
        const returnRevenue = (order.securityDeposit || 0) - (order.damageFee || 0);
        events.push({
          revenue: returnRevenue,
          date: returnDate,
          description: returnRevenue > 0 
            ? 'Hoàn tiền cọc' 
            : returnRevenue < 0 
              ? 'Thu phí hư hỏng' 
              : 'Không có phát sinh',
          revenueType: 'RENT_RETURN'
        });
      }
    }

    // 4. CANCELLED: Create negative events to offset revenue (ensure total revenue = 0)
    if (order.status === ORDER_STATUS.CANCELLED && order.updatedAt) {
      const cancelledDate = new Date(order.updatedAt);
      if (cancelledDate >= dateRangeStart && cancelledDate <= dateRangeEnd) {
        const createdDate = order.createdAt ? new Date(order.createdAt) : null;
        const pickupDate = order.pickedUpAt ? new Date(order.pickedUpAt) : null;
        
        // Calculate total revenue collected before cancellation to offset
        let totalCollected = 0;
        
        if (pickupDate && pickupDate < cancelledDate) {
          // Order was picked up: collected deposit + pickup payment
          totalCollected = (order.depositAmount || 0) + 
                          ((order.totalAmount || 0) - (order.depositAmount || 0) + (order.securityDeposit || 0));
        } else if (createdDate && createdDate < cancelledDate) {
          // Order was only reserved: collected deposit only
          totalCollected = order.depositAmount || 0;
        }
        
        // Tạo event âm để hoàn lại
        if (totalCollected > 0) {
          events.push({
            revenue: -totalCollected,
            date: cancelledDate,
            description: 'Đơn hủy (hoàn lại)',
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
      // Expected: Revenue = 300 - 400 = -100k (negative = thu thêm phí hư hỏng) on 2026-01-18
      
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
      expect(events[0].revenue).toBe(-100000); // 300 - 400 = -100k (thu thêm phí hư hỏng)
      expect(events[0].revenueType).toBe('RENT_RETURN');
      expect(events[0].description).toBe('Thu phí hư hỏng');
      expect(events[0].date.toISOString()).toContain('2026-01-18');
    });

    it('should create positive return event when security deposit > damage fee (refund)', () => {
      // Scenario: Order returned on 2026-01-18
      // securityDeposit: 300k, damageFee: 100k
      // Expected: Revenue = 300 - 100 = 200k (positive = hoàn tiền cọc) on 2026-01-18
      
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
      expect(events[0].revenue).toBe(200000); // 300 - 100 = 200k (hoàn tiền cọc)
      expect(events[0].revenueType).toBe('RENT_RETURN');
      expect(events[0].description).toBe('Hoàn tiền cọc');
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
      expect(returnEvent.revenue).toBe(-100000); // 300 - 400 = -100k (thu thêm phí hư hỏng)
      expect(returnEvent.date.toISOString()).toContain('2026-01-18');
    });
  });

  describe('Order Updates - Orders should appear after updates', () => {
    it('should show order with revenue = 0 if depositAmount = 0', () => {
      // Scenario: Order created with no deposit
      // Expected: Revenue = 0 (chưa thu tiền cọc, doanh thu = depositAmount = 0)
      
      const startDate = new Date('2026-01-16T00:00:00Z');
      const endDate = new Date('2026-01-16T23:59:59Z');
      
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

    it('should create negative event when SALE order is cancelled (offset to 0)', () => {
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
      expect(events[0].revenue).toBe(-500000); // Negative to offset
      expect(events[0].revenueType).toBe('SALE_CANCELLED');
    });
  });

  describe('CANCELLED Orders', () => {
    it('should offset deposit when RESERVED order is cancelled', () => {
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
      expect(events[0].revenue).toBe(-200000); // Hoàn lại tiền cọc
      expect(events[0].revenueType).toBe('RENT_CANCELLED');
      expect(events[0].description).toBe('Đơn hủy (hoàn lại)');
    });

    it('should offset everything when PICKUPED order is cancelled', () => {
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
      // Tổng đã thu: cọc (200k) + tiền lấy hàng (800-200+300 = 900k) = 1100k
      // Hoàn lại: -1100k
      expect(events[0].revenue).toBe(-1100000);
      expect(events[0].revenueType).toBe('RENT_CANCELLED');
      expect(events[0].description).toBe('Đơn hủy (hoàn lại)');
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

    it('should create pickup event when order picked up in range (even if created before range)', () => {
      // Scenario: Order created 15/01, picked up 16/01
      // Query date range: 16/01
      // Expected: Pickup event on 16/01 (order should appear)
      
      const startDate = new Date('2026-01-16T00:00:00Z');
      const endDate = new Date('2026-01-16T23:59:59Z');
      
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
      expect(events[0].revenue).toBe(900000); // (800 - 200) + 300 = 900k
      expect(events[0].date.toISOString()).toContain('2026-01-16');
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
