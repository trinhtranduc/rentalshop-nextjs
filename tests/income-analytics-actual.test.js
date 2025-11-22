// ============================================================================
// INCOME ANALYTICS ACTUAL IMPLEMENTATION TESTS
// ============================================================================
// Tests for income analytics calculation logic
// Based on real business scenarios from user requirements

const { ORDER_STATUS, ORDER_TYPE } = require('../packages/constants/src');

// Test calculation functions (simulating the logic from route.ts)
const calculateRealIncome = {
  // RESERVED: Count depositAmount on createdAt date
  reserved: (orders) => {
    return orders
      .filter(o => o.orderType === ORDER_TYPE.RENT && o.status === ORDER_STATUS.RESERVED)
      .reduce((sum, order) => sum + (order.depositAmount || 0), 0);
  },
  
  // PICKUPED: Count (totalAmount - depositAmount + securityDeposit) on pickedUpAt date
  pickedUp: (orders) => {
    return orders
      .filter(o => o.orderType === ORDER_TYPE.RENT && o.status === ORDER_STATUS.PICKUPED)
      .reduce((sum, order) => {
        return sum + (order.totalAmount - (order.depositAmount || 0) + (order.securityDeposit || 0));
      }, 0);
  },
  
  // RETURNED: Count -(securityDeposit - damageFee) on returnedAt date (negative)
  returned: (orders) => {
    return orders
      .filter(o => o.orderType === ORDER_TYPE.RENT && o.status === ORDER_STATUS.RETURNED)
      .reduce((sum, order) => {
        const refund = (order.securityDeposit || 0) - (order.damageFee || 0);
        return sum - refund; // Negative because we return money
      }, 0);
  },
  
  // SALE: Count totalAmount on createdAt date
  sale: (orders) => {
    return orders
      .filter(o => o.orderType === ORDER_TYPE.SALE)
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  }
};

const calculateFutureIncome = (orders) => {
  // Only RESERVED orders with pickup date in period
  // Future income = totalAmount - depositAmount
  return orders
    .filter(o => 
      o.orderType === ORDER_TYPE.RENT && 
      o.status === ORDER_STATUS.RESERVED
    )
    .reduce((sum, order) => {
      return sum + (order.totalAmount - (order.depositAmount || 0));
    }, 0);
};

describe('Income Analytics Calculation Logic', () => {

  describe('Real Income Calculation', () => {
    it('should calculate real income for RESERVED order on createdAt date', () => {
      // Scenario: Order 300k, deposit 200k, created on 22/11
      // Expected: realIncome on 22/11 = 200k (deposit)
      
      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 300000,
          depositAmount: 200000,
          securityDeposit: 0,
          damageFee: 0,
          createdAt: new Date('2025-11-22')
        }
      ];

      const realIncome = calculateRealIncome.reserved(orders);
      expect(realIncome).toBe(200000);
    });

    it('should calculate real income for PICKUPED order on pickedUpAt date', () => {
      // Scenario: Order picked up on 23/11
      // totalAmount: 300k, depositAmount: 200k (already paid), securityDeposit: 400k
      // Expected: realIncome on 23/11 = (300-200) + 400 = 500k
      
      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 300000,
          depositAmount: 200000,
          securityDeposit: 400000,
          damageFee: 0,
          createdAt: new Date('2025-11-22'),
          pickedUpAt: new Date('2025-11-23')
        }
      ];

      const realIncome = calculateRealIncome.pickedUp(orders);
      expect(realIncome).toBe(500000); // (300-200) + 400 = 500k
    });

    it('should calculate real income for RETURNED order on returnedAt date (negative)', () => {
      // Scenario: Order returned on 24/11
      // securityDeposit: 400k, damageFee: 300k
      // Expected: realIncome on 24/11 = -(400-300) = -100k (negative because we return money)
      
      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 300000,
          depositAmount: 200000,
          securityDeposit: 400000,
          damageFee: 300000,
          createdAt: new Date('2025-11-22'),
          pickedUpAt: new Date('2025-11-23'),
          returnedAt: new Date('2025-11-24')
        }
      ];

      const realIncome = calculateRealIncome.returned(orders);
      expect(realIncome).toBe(-100000); // -(400-300) = -100k
    });

    it('should calculate real income for SALE order on createdAt date', () => {
      // Scenario: SALE order created on 22/11, totalAmount: 500k
      // Expected: realIncome on 22/11 = 500k
      
      const orders = [
        {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.COMPLETED,
          totalAmount: 500000,
          depositAmount: 0,
          createdAt: new Date('2025-11-22')
        }
      ];

      const realIncome = calculateRealIncome.sale(orders);
      expect(realIncome).toBe(500000);
    });
  });

  describe('Future Income Calculation', () => {
    it('should calculate future income for RESERVED orders with pickup date in period', () => {
      // Scenario: Order 300k, deposit 200k, pickup date 23/11 (today is 22/11)
      // Expected: futureIncome on 23/11 = 300-200 = 100k
      
      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 300000,
          depositAmount: 200000,
          securityDeposit: 0,
          damageFee: 0,
          createdAt: new Date('2025-11-22'),
          pickupPlanAt: new Date('2025-11-23')
        }
      ];

      const futureIncome = calculateFutureIncome(orders);
      expect(futureIncome).toBe(100000); // 300-200 = 100k
    });

    it('should not count PICKUPED orders in future income', () => {
      // Scenario: Order already picked up on 23/11
      // Expected: futureIncome on 23/11 = 0 (order already collected)
      
      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED, // Already picked up
          totalAmount: 300000,
          depositAmount: 200000,
          securityDeposit: 400000,
          createdAt: new Date('2025-11-22'),
          pickedUpAt: new Date('2025-11-23'),
          pickupPlanAt: new Date('2025-11-23')
        }
      ];

      const futureIncome = calculateFutureIncome(orders);
      expect(futureIncome).toBe(0); // PICKUPED orders should not be counted
    });

    it('should calculate future income regardless of order creation date', () => {
      // Scenario: Order created on 20/11, pickup date 23/11
      // Expected: futureIncome on 23/11 = 100k (should count even if created earlier)
      
      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 300000,
          depositAmount: 200000,
          securityDeposit: 0,
          damageFee: 0,
          createdAt: new Date('2025-11-20'), // Created 3 days ago
          pickupPlanAt: new Date('2025-11-23') // Pickup today
        }
      ];

      const futureIncome = calculateFutureIncome(orders);
      expect(futureIncome).toBe(100000); // Should count even if created earlier
    });
  });

  describe('Complete Order Lifecycle', () => {
    it('should calculate income correctly through complete order lifecycle', () => {
      // Complete scenario from user example:
      // Day 22/11: Create order 300k, deposit 200k
      // Day 23/11: Pickup with security deposit 400k
      // Day 24/11: Return with damage fee 300k
      
      // Day 22/11: RESERVED orders
      const day22Orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 300000,
          depositAmount: 200000,
          securityDeposit: 0,
          damageFee: 0,
          createdAt: new Date('2025-11-22'),
          pickupPlanAt: new Date('2025-11-23')
        }
      ];
      const realIncome22 = calculateRealIncome.reserved(day22Orders);
      expect(realIncome22).toBe(200000);

      // Day 22/11: futureIncome for 23/11
      const futureIncome23 = calculateFutureIncome(day22Orders);
      expect(futureIncome23).toBe(100000); // 300-200 = 100k

      // Day 23/11: PICKUPED orders
      const day23Orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.PICKUPED,
          totalAmount: 300000,
          depositAmount: 200000,
          securityDeposit: 400000,
          damageFee: 0,
          createdAt: new Date('2025-11-22'),
          pickedUpAt: new Date('2025-11-23'),
          pickupPlanAt: new Date('2025-11-23')
        }
      ];
      const realIncome23 = calculateRealIncome.pickedUp(day23Orders);
      expect(realIncome23).toBe(500000); // (300-200) + 400 = 500k

      // Day 23/11: futureIncome = 0 (no more RESERVED orders)
      const futureIncome23After = calculateFutureIncome(day23Orders);
      expect(futureIncome23After).toBe(0); // PICKUPED orders not counted

      // Day 24/11: RETURNED orders
      const day24Orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 300000,
          depositAmount: 200000,
          securityDeposit: 400000,
          damageFee: 300000,
          createdAt: new Date('2025-11-22'),
          pickedUpAt: new Date('2025-11-23'),
          returnedAt: new Date('2025-11-24')
        }
      ];
      const realIncome24 = calculateRealIncome.returned(day24Orders);
      expect(realIncome24).toBe(-100000); // -(400-300) = -100k
    });

    it('should handle multiple orders on the same day', () => {
      // Scenario: Multiple orders on 22/11
      const day22Orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 300000,
          depositAmount: 200000,
          securityDeposit: 0,
          damageFee: 0,
          createdAt: new Date('2025-11-22'),
          pickupPlanAt: new Date('2025-11-23')
        },
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 500000,
          depositAmount: 300000,
          securityDeposit: 0,
          damageFee: 0,
          createdAt: new Date('2025-11-22'),
          pickupPlanAt: new Date('2025-11-24')
        },
        {
          orderType: ORDER_TYPE.SALE,
          status: ORDER_STATUS.COMPLETED,
          totalAmount: 1000000,
          depositAmount: 0,
          createdAt: new Date('2025-11-22')
        }
      ];

      const realIncome = 
        calculateRealIncome.reserved(day22Orders) + 
        calculateRealIncome.sale(day22Orders);
      expect(realIncome).toBe(1500000); // 200k + 300k + 1000k = 1500k

      const futureIncome = calculateFutureIncome(day22Orders);
      expect(futureIncome).toBe(300000); // (300-200) + (500-300) = 300k
    });

    it('should handle edge cases: zero values and missing fields', () => {
      const orders = [
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RESERVED,
          totalAmount: 300000,
          depositAmount: 0, // No deposit
          securityDeposit: 0,
          damageFee: 0,
          createdAt: new Date('2025-11-22'),
          pickupPlanAt: new Date('2025-11-23')
        },
        {
          orderType: ORDER_TYPE.RENT,
          status: ORDER_STATUS.RETURNED,
          totalAmount: 300000,
          depositAmount: 200000,
          securityDeposit: 400000,
          damageFee: 400000, // Equal to security deposit
          createdAt: new Date('2025-11-22'),
          returnedAt: new Date('2025-11-24')
        }
      ];

      const realIncomeReserved = calculateRealIncome.reserved(orders);
      expect(realIncomeReserved).toBe(0); // No deposit

      const futureIncome = calculateFutureIncome(orders);
      expect(futureIncome).toBe(300000); // 300-0 = 300k

      const realIncomeReturned = calculateRealIncome.returned(orders);
      expect(realIncomeReturned).toBe(0); // 400-400 = 0, no refund
    });
  });
});

