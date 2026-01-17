/**
 * Revenue Calculator Utility
 * 
 * Single source of truth for calculating order revenue based on order type, status, and dates.
 * Implements logic from tests/income-daily-test-cases.md
 * 
 * QUY TẮC TÍNH DOANH THU:
 * 
 * THEO STATUS (calculateOrderRevenueByStatus):
 * 1. SALE: totalAmount on createdAt date
 * 2. RENT - RESERVED: depositAmount on createdAt date (if not same day pickup)
 * 3. RENT - PICKUPED:
 *    - Same day pickup: totalAmount + securityDeposit (KHÔNG trừ depositAmount)
 *    - Different day: totalAmount - depositAmount + securityDeposit (trừ depositAmount vì đã thu riêng)
 * 4. RENT - RETURNED: totalAmount + damageFee (đơn đã hoàn tất, tính tổng doanh thu thực tế)
 * 5. CANCELLED: revenue = 0 (hoàn lại toàn bộ đã thu)
 * 
 * THEO DATES (getOrderRevenueEvents):
 * - Phân bổ revenue theo từng event (deposit, pickup, return) theo ngày
 * - Same day return: totalAmount + damageFee (KHÔNG tính deposit và pickup riêng)
 * - Different day return: damageFee - securityDeposit (đã tính deposit + pickup riêng)
 * 
 * REVENUE DỰ KIẾN (getFutureRevenueEvents):
 * - Future Pickup: totalAmount - depositAmount cho đơn RESERVED có pickupPlanAt trong tương lai
 * - Future Return: damageFee - securityDeposit cho đơn PICKUPED có returnPlanAt trong tương lai
 * 
 * THEO DATE (getOrderRevenueForDate):
 * - Smart logic để tính revenue cho một ngày cụ thể
 * - Nếu order đã RETURNED (quá khứ): totalAmount + damageFee (tổng doanh thu thực tế)
 * - Nếu date tương lai: tính future income dựa vào pickupPlanAt và returnPlanAt
 * - Nếu date quá khứ/hiện tại: tính real events đã xảy ra trong ngày đó
 */

import { ORDER_STATUS, ORDER_TYPE } from '@rentalshop/constants';
import { getUTCDateKey } from './date';

export interface OrderRevenueData {
  orderType: string;
  status: string;
  totalAmount: number;
  depositAmount: number;
  securityDeposit: number;
  damageFee: number;
  createdAt: Date | string | null;
  pickedUpAt: Date | string | null;
  returnedAt: Date | string | null;
  pickupPlanAt?: Date | string | null; // For future pickup revenue calculation
  returnPlanAt?: Date | string | null; // For future return revenue calculation
  updatedAt?: Date | string | null;
}

export interface RevenueEvent {
  revenue: number;
  date: Date;
  description: string;
  revenueType: 'SALE' | 'RENT_DEPOSIT' | 'RENT_PICKUP' | 'RENT_RETURN' | 'RENT_CANCELLED' | 'SALE_CANCELLED' | 'RENT_FUTURE_PICKUP' | 'RENT_FUTURE_RETURN';
}

/**
 * Check if two dates are on the same day (using UTC date key)
 */
function isSameDay(date1: Date | string | null, date2: Date | string | null): boolean {
  if (!date1 || !date2) return false;
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return getUTCDateKey(d1) === getUTCDateKey(d2);
}

/**
 * Get revenue events for an order within a date range (theo dates - phân bổ theo từng event)
 * 
 * Dùng cho: Analytics theo ngày/tháng, tracking từng event (deposit, pickup, return)
 * 
 * Logic:
 * - SALE: totalAmount tại ngày createdAt
 * - RENT - RESERVED: depositAmount tại ngày createdAt (nếu không cùng ngày pickup/return)
 * - RENT - PICKUPED:
 *   + Pickup cùng ngày với tạo: totalAmount + securityDeposit (KHÔNG trừ depositAmount)
 *   + Pickup khác ngày: totalAmount - depositAmount + securityDeposit
 * - RENT - RETURNED:
 *   + Return cùng ngày: totalAmount + damageFee (KHÔNG tính deposit/pickup riêng)
 *   + Return khác ngày: damageFee - securityDeposit (đã tính deposit + pickup riêng)
 * - CANCELLED: Refund tất cả đã thu
 * 
 * @param order Order data
 * @param dateRangeStart Start of date range (optional, defaults to checking all dates)
 * @param dateRangeEnd End of date range (optional, defaults to checking all dates)
 * @returns Array of revenue events
 */
export function getOrderRevenueEvents(
  order: OrderRevenueData,
  dateRangeStart?: Date,
  dateRangeEnd?: Date
): RevenueEvent[] {
  const events: RevenueEvent[] = [];

  // Helper to check if date is in range
  const isInRange = (date: Date | string | null): boolean => {
    if (!date || !dateRangeStart || !dateRangeEnd) return true;
    const d = typeof date === 'string' ? new Date(date) : date;
    return d >= dateRangeStart && d <= dateRangeEnd;
  };

  // Convert dates to Date objects
  const createdAt = order.createdAt ? new Date(order.createdAt) : null;
  const pickedUpAt = order.pickedUpAt ? new Date(order.pickedUpAt) : null;
  const returnedAt = order.returnedAt ? new Date(order.returnedAt) : null;
  const updatedAt = order.updatedAt ? new Date(order.updatedAt) : null;

  // Extract values with defaults
  const totalAmount = order.totalAmount || 0;
  const depositAmount = order.depositAmount || 0;
  const securityDeposit = order.securityDeposit || 0;
  const damageFee = order.damageFee || 0;

  // ============================================================================
  // SALE ORDERS
  // ============================================================================
  if (order.orderType === ORDER_TYPE.SALE) {
    // SALE: totalAmount on createdAt date
    if (createdAt && isInRange(createdAt)) {
      // Skip if cancelled at creation (no revenue)
      const wasCancelledAtCreation = order.status === ORDER_STATUS.CANCELLED &&
        (!updatedAt || updatedAt.getTime() === createdAt.getTime());

      if (!wasCancelledAtCreation) {
        events.push({
          revenue: totalAmount,
          date: createdAt,
          description: 'Đơn bán được tạo',
          revenueType: 'SALE'
        });
      }
    }

    // SALE CANCELLED: refund total amount
    if (order.status === ORDER_STATUS.CANCELLED && updatedAt && isInRange(updatedAt)) {
      if (createdAt && createdAt < updatedAt) {
        events.push({
          revenue: -totalAmount,
          date: updatedAt,
          description: 'Đơn bán bị hủy (hoàn lại)',
          revenueType: 'SALE_CANCELLED'
        });
      }
    }
  }
  // ============================================================================
  // RENT ORDERS
  // ============================================================================
  else {
    // Check same day flags
    const isSameDayPickup = isSameDay(createdAt, pickedUpAt);
    const isSameDayReturn = isSameDay(pickedUpAt || createdAt, returnedAt);

    // 1. RESERVED (Deposit): depositAmount on createdAt date
    // LƯU Ý:
    // - Nếu thuê và trả cùng ngày: không tạo deposit event (chỉ tính return)
    // - Nếu pickup cùng ngày với tạo đơn: không tạo deposit event (đã bao gồm trong pickup revenue)
    if (!isSameDayReturn && !isSameDayPickup && createdAt && isInRange(createdAt)) {
      // Skip if cancelled at creation
      const wasCancelledAtCreation = order.status === ORDER_STATUS.CANCELLED &&
        (!updatedAt || updatedAt.getTime() === createdAt.getTime());

      if (!wasCancelledAtCreation) {
        events.push({
          revenue: depositAmount,
          date: createdAt,
          description: 'Thu tiền cọc',
          revenueType: 'RENT_DEPOSIT'
        });
      }
    }

    // 2. PICKUPED: Revenue when picking up
    // - Same day pickup: totalAmount + securityDeposit (KHÔNG trừ depositAmount)
    // - Different day: totalAmount - depositAmount + securityDeposit (trừ depositAmount vì đã thu riêng)
    // LƯU Ý: 
    // - Nếu thuê và trả cùng ngày, không tạo pickup event (chỉ tính return)
    // - Nếu cancelled cùng ngày với pickup, không tạo pickup event riêng (chỉ tính cancelled)
    const isSameDayCancelled = order.status === ORDER_STATUS.CANCELLED && updatedAt && pickedUpAt
      ? isSameDay(pickedUpAt, updatedAt)
      : false;

    if (!isSameDayReturn && !isSameDayCancelled && pickedUpAt && isInRange(pickedUpAt)) {
      let pickupRevenue: number;
      if (isSameDayPickup) {
        // Same day pickup: totalAmount + securityDeposit (KHÔNG trừ depositAmount)
        pickupRevenue = totalAmount + securityDeposit;
      } else {
        // Different day: totalAmount - depositAmount + securityDeposit (trừ depositAmount vì đã thu riêng)
        pickupRevenue = totalAmount - depositAmount + securityDeposit;
      }

      events.push({
        revenue: pickupRevenue,
        date: pickedUpAt,
        description: 'Thu tiền khi lấy hàng',
        revenueType: 'RENT_PICKUP'
      });
    }

    // 3. RETURNED: Final payment when returning
    // - Same day return: totalAmount + damageFee (KHÔNG tính deposit và pickup riêng)
    // - Different day: damageFee - securityDeposit
    //   * Dương: hoàn tiền cọc (securityDeposit > damageFee = trả lại cho khách)
    //   * Âm: thu thêm phí hư hỏng (damageFee > securityDeposit)
    if (returnedAt && isInRange(returnedAt)) {
      let returnRevenue: number;
      let description: string;

      if (isSameDayReturn) {
        // Same day return: totalAmount + damageFee (KHÔNG tính deposit và pickup riêng)
        returnRevenue = totalAmount + damageFee;
        description = 'Thuê và trả trong cùng ngày';
      } else {
        // Different day: damageFee - securityDeposit
        // Note: âm vì securityDeposit đã thu ở pickup, giờ trừ đi
        returnRevenue = damageFee - securityDeposit;
        if (returnRevenue > 0) {
          description = 'Thu phí hư hỏng';
        } else if (returnRevenue < 0) {
          description = 'Hoàn tiền cọc';
        } else {
          description = 'Không có phát sinh';
        }
      }

      events.push({
        revenue: returnRevenue,
        date: returnedAt,
        description,
        revenueType: 'RENT_RETURN'
      });
    }

    // 4. CANCELLED: Refund all collected amounts
    if (order.status === ORDER_STATUS.CANCELLED && updatedAt && isInRange(updatedAt)) {
      let totalCollected = 0;

      if (pickedUpAt && pickedUpAt < updatedAt) {
        // Already picked up: calculate total collected
        if (isSameDayPickup) {
          // Pickup same day as created: pickup revenue already included deposit
          totalCollected = totalAmount + securityDeposit; // Note: không trừ depositAmount vì đã bao gồm
        } else {
          // Pickup different day: deposit separately + pickup revenue
          totalCollected = depositAmount + (totalAmount - depositAmount + securityDeposit);
        }
      } else if (createdAt && createdAt < updatedAt) {
        // Only deposited: only deposit amount
        totalCollected = depositAmount;
      }

      // Create negative event to refund
      if (totalCollected > 0) {
        events.push({
          revenue: -totalCollected,
          date: updatedAt,
          description: 'Đơn hủy (hoàn lại)',
          revenueType: 'RENT_CANCELLED'
        });
      }
    }
  }

  return events;
}

/**
 * Calculate total revenue for an order (sum of all revenue events)
 * 
 * @param order Order data
 * @returns Total revenue
 */
export function calculateOrderRevenue(order: OrderRevenueData): number {
  const events = getOrderRevenueEvents(order);
  return events.reduce((sum, event) => sum + event.revenue, 0);
}

/**
 * Get future revenue events for orders (revenue dự kiến - pickup và return trong tương lai)
 * 
 * Dùng cho: Tính doanh thu dự kiến sẽ thu khi khách lấy hàng và trả hàng trong khoảng thời gian
 * 
 * Logic:
 * 1. Future Pickup Revenue (pickupPlanAt trong tương lai):
 *    - Chỉ tính đơn RESERVED (chưa pickup) có pickupPlanAt trong date range
 *    - Future pickup revenue = totalAmount - depositAmount (số tiền dự kiến sẽ thu khi pickup)
 *    - Không tính đơn PICKUPED (đã thu rồi)
 * 
 * 2. Future Return Revenue (returnPlanAt trong tương lai):
 *    - Chỉ tính đơn PICKUPED (đã lấy hàng) có returnPlanAt trong date range
 *    - Future return revenue = damageFee - securityDeposit (ước tính sẽ thu/hoàn khi return)
 *      * Dương: ước tính thu phí hư hỏng (damageFee > securityDeposit)
 *      * Âm: ước tính hoàn tiền cọc (securityDeposit > damageFee)
 * 
 * @param order Order data
 * @param dateRangeStart Start of date range (required for future revenue)
 * @param dateRangeEnd End of date range (required for future revenue)
 * @returns Array of future revenue events
 */
export function getFutureRevenueEvents(
  order: OrderRevenueData,
  dateRangeStart: Date,
  dateRangeEnd: Date
): RevenueEvent[] {
  const events: RevenueEvent[] = [];

  // Only calculate future revenue for RENT orders
  if (order.orderType !== ORDER_TYPE.RENT) {
    return events;
  }

  const totalAmount = order.totalAmount || 0;
  const depositAmount = order.depositAmount || 0;
  const securityDeposit = order.securityDeposit || 0;
  const damageFee = order.damageFee || 0;

  // 1. Future Pickup Revenue: Đơn RESERVED có pickupPlanAt trong tương lai
  if (order.status === ORDER_STATUS.RESERVED && order.pickupPlanAt) {
    const pickupPlanAt = typeof order.pickupPlanAt === 'string' 
      ? new Date(order.pickupPlanAt) 
      : order.pickupPlanAt;

    // Check if pickupPlanAt is within date range (and in the future)
    const now = new Date();
    if (pickupPlanAt >= dateRangeStart && pickupPlanAt <= dateRangeEnd && pickupPlanAt > now) {
      // Future pickup revenue = totalAmount - depositAmount (amount expected to receive on pickup day)
      const futurePickupRevenue = totalAmount - depositAmount;

      if (futurePickupRevenue > 0) {
        events.push({
          revenue: futurePickupRevenue,
          date: pickupPlanAt,
          description: 'Doanh thu dự kiến khi lấy hàng',
          revenueType: 'RENT_FUTURE_PICKUP'
        });
      }
    }
  }

  // 2. Future Return Revenue: Đơn PICKUPED có returnPlanAt trong tương lai
  if (order.status === ORDER_STATUS.PICKUPED && order.returnPlanAt) {
    const returnPlanAt = typeof order.returnPlanAt === 'string' 
      ? new Date(order.returnPlanAt) 
      : order.returnPlanAt;

    // Check if returnPlanAt is within date range (and in the future)
    const now = new Date();
    if (returnPlanAt >= dateRangeStart && returnPlanAt <= dateRangeEnd && returnPlanAt > now) {
      // Future return revenue = damageFee - securityDeposit (ước tính sẽ thu/hoàn khi return)
      // Note: Đây là ước tính vì damageFee chưa biết chính xác, có thể là 0 hoặc ước tính
      const futureReturnRevenue = damageFee - securityDeposit;
      
      // Only add event if there's actual revenue (positive or negative)
      // If damageFee is 0 (chưa có hư hỏng), thì revenue = -securityDeposit (sẽ hoàn tiền cọc)
      let description: string;
      if (futureReturnRevenue > 0) {
        description = 'Ước tính thu phí hư hỏng khi trả hàng';
      } else if (futureReturnRevenue < 0) {
        description = 'Ước tính hoàn tiền cọc khi trả hàng';
      } else {
        description = 'Ước tính không có phát sinh khi trả hàng';
      }

      events.push({
        revenue: futureReturnRevenue,
        date: returnPlanAt,
        description,
        revenueType: 'RENT_FUTURE_RETURN'
      });
    }
  }

  return events;
}

/**
 * Get all revenue events for an order on a specific date (revenue thực tế + dự kiến)
 * 
 * Dùng cho: Tính revenue cho một ngày cụ thể, bao gồm cả revenue thực tế và revenue dự kiến
 * 
 * Logic:
 * - Revenue thực tế: Các events đã xảy ra trong ngày (deposit, pickup, return, cancel)
 * - Revenue dự kiến: Các events sẽ xảy ra trong ngày (future pickup, future return)
 * 
 * @param order Order data
 * @param targetDate Date to calculate revenue for (specific date)
 * @returns Array of revenue events for that date (both real and future)
 */
export function getRevenueByDate(
  order: OrderRevenueData,
  targetDate: Date
): RevenueEvent[] {
  // Calculate start and end of target date
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Get real revenue events (đã xảy ra)
  const realEvents = getOrderRevenueEvents(order, startOfDay, endOfDay);

  // Get future revenue events (sẽ xảy ra trong ngày này)
  const futureEvents = getFutureRevenueEvents(order, startOfDay, endOfDay);

  // Combine all events
  return [...realEvents, ...futureEvents];
}

/**
 * Calculate total revenue for an order on a specific date (thực tế + dự kiến)
 * 
 * @param order Order data
 * @param targetDate Date to calculate revenue for
 * @returns Total revenue for that date (real + future)
 */
export function calculateRevenueByDate(
  order: OrderRevenueData,
  targetDate: Date
): number {
  const events = getRevenueByDate(order, targetDate);
  return events.reduce((sum, event) => sum + event.revenue, 0);
}

/**
 * Get order revenue for a specific date with smart logic
 * 
 * Logic thông minh:
 * 1. Nếu order đã RETURNED và returnedAt < targetDate (quá khứ):
 *    → Return totalAmount + damageFee (tổng doanh thu thực tế cuối cùng)
 *    → Không phân bổ theo events vì đơn đã hoàn tất
 * 
 * 2. Nếu targetDate là tương lai (so với now):
 *    → Tính future income dựa vào pickupPlanAt và returnPlanAt
 *    → Chỉ tính events trong tương lai
 * 
 * 3. Nếu targetDate trong quá khứ và order chưa return:
 *    → Tính real events đã xảy ra trong ngày đó
 *    → Sử dụng getOrderRevenueEvents với date range
 * 
 * 4. Nếu targetDate = returnedAt (ngày trả hàng):
 *    → Tính theo logic return event (same day hoặc different day)
 * 
 * @param order Order data
 * @param targetDate Date to calculate revenue for
 * @returns Revenue amount for that date
 */
export function getOrderRevenueForDate(
  order: OrderRevenueData,
  targetDate: Date
): number {
  const now = new Date();
  const targetDateKey = getUTCDateKey(targetDate);
  const nowDateKey = getUTCDateKey(now);

  // Convert dates to Date objects
  const createdAt = order.createdAt ? new Date(order.createdAt) : null;
  const pickedUpAt = order.pickedUpAt ? new Date(order.pickedUpAt) : null;
  const returnedAt = order.returnedAt ? new Date(order.returnedAt) : null;
  const pickupPlanAt = order.pickupPlanAt ? new Date(order.pickupPlanAt) : null;
  const returnPlanAt = order.returnPlanAt ? new Date(order.returnPlanAt) : null;

  const totalAmount = order.totalAmount || 0;
  const depositAmount = order.depositAmount || 0;
  const securityDeposit = order.securityDeposit || 0;
  const damageFee = order.damageFee || 0;

  // ============================================================================
  // CASE 1: Order đã RETURNED và returnedAt < targetDate (quá khứ)
  // ============================================================================
  if (order.status === ORDER_STATUS.RETURNED && returnedAt) {
    const returnedAtKey = getUTCDateKey(returnedAt);
    
    // Nếu order đã trả và targetDate sau ngày trả → return tổng doanh thu thực tế
    if (returnedAtKey < targetDateKey) {
      // Order đã hoàn tất trong quá khứ, return tổng doanh thu thực tế
      return totalAmount + damageFee;
    }
    
    // Nếu targetDate = returnedAt (ngày trả hàng) → tính theo return event logic
    if (returnedAtKey === targetDateKey) {
      // Tính theo logic return event (same day hoặc different day)
      const isSameDayReturn = isSameDay(pickedUpAt || createdAt, returnedAt);
      
      if (isSameDayReturn) {
        // Same day return: totalAmount + damageFee
        return totalAmount + damageFee;
      } else {
        // Different day return: damageFee - securityDeposit
        return damageFee - securityDeposit;
      }
    }
  }

  // ============================================================================
  // CASE 2: targetDate là tương lai (so với now)
  // ============================================================================
  if (targetDateKey > nowDateKey) {
    let futureRevenue = 0;

    // Future Pickup: Đơn RESERVED có pickupPlanAt = targetDate
    if (order.orderType === ORDER_TYPE.RENT && 
        order.status === ORDER_STATUS.RESERVED && 
        pickupPlanAt) {
      const pickupPlanAtKey = getUTCDateKey(pickupPlanAt);
      if (pickupPlanAtKey === targetDateKey) {
        // Future pickup revenue = totalAmount - depositAmount
        futureRevenue += totalAmount - depositAmount;
      }
    }

    // Future Return: Đơn PICKUPED có returnPlanAt = targetDate
    if (order.orderType === ORDER_TYPE.RENT && 
        order.status === ORDER_STATUS.PICKUPED && 
        returnPlanAt) {
      const returnPlanAtKey = getUTCDateKey(returnPlanAt);
      if (returnPlanAtKey === targetDateKey) {
        // Future return revenue = damageFee - securityDeposit
        futureRevenue += damageFee - securityDeposit;
      }
    }

    return futureRevenue;
  }

  // ============================================================================
  // CASE 3: targetDate trong quá khứ hoặc hiện tại (chưa return hoặc đang trong quá trình)
  // ============================================================================
  // Tính real events đã xảy ra trong ngày đó
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const events = getOrderRevenueEvents(order, startOfDay, endOfDay);
  return events.reduce((sum, event) => sum + event.revenue, 0);
}

/**
 * Calculate revenue for a period (date range) - Smart aggregation
 * 
 * Dùng cho: /api/analytics/income - Tính tổng revenue cho một period (month/day)
 * 
 * Logic:
 * - Lấy tất cả real revenue events trong period
 * - Lấy tất cả future revenue events trong period
 * - Phân tách real income (đã xảy ra) và future income (dự kiến)
 * - Return tổng hợp
 * 
 * @param order Order data
 * @param periodStart Start of period
 * @param periodEnd End of period
 * @returns Object with realIncome and futureIncome
 */
export function calculatePeriodRevenue(
  order: OrderRevenueData,
  periodStart: Date,
  periodEnd: Date
): { realIncome: number; futureIncome: number } {
  const now = new Date();
  const nowDateKey = getUTCDateKey(now);

  // Get real revenue events in period
  const realEvents = getOrderRevenueEvents(order, periodStart, periodEnd);
  
  // Get future revenue events in period
  const futureEvents = getFutureRevenueEvents(order, periodStart, periodEnd);

  let realIncome = 0;
  let futureIncome = 0;

  // Sum real income (events that have already occurred)
  for (const event of realEvents) {
    const eventDateKey = getUTCDateKey(event.date);
    
    if (eventDateKey <= nowDateKey) {
      // Past or current date: real income
      realIncome += event.revenue;
    } else {
      // Future date: future income (shouldn't happen for real events, but just in case)
      futureIncome += event.revenue;
    }
  }

  // Sum future income (events that will occur in the future)
  for (const event of futureEvents) {
    futureIncome += event.revenue;
  }

  return { realIncome, futureIncome };
}

/**
 * Calculate revenue for a period (date range) for multiple orders - Batch processing
 * 
 * Dùng cho: /api/analytics/income - Tính tổng revenue cho nhiều orders trong period
 * 
 * @param orders Array of order data
 * @param periodStart Start of period
 * @param periodEnd End of period
 * @returns Object with realIncome and futureIncome (aggregated)
 */
export function calculatePeriodRevenueBatch(
  orders: OrderRevenueData[],
  periodStart: Date,
  periodEnd: Date
): { realIncome: number; futureIncome: number } {
  let totalRealIncome = 0;
  let totalFutureIncome = 0;

  for (const order of orders) {
    const { realIncome, futureIncome } = calculatePeriodRevenue(order, periodStart, periodEnd);
    totalRealIncome += realIncome;
    totalFutureIncome += futureIncome;
  }

  return { realIncome: totalRealIncome, futureIncome: totalFutureIncome };
}

/**
 * Calculate revenue for a specific status (theo status hiện tại)
 * 
 * Dùng cho: Dashboard tổng hợp, báo cáo tổng doanh thu, tính nhanh theo status
 * 
 * Logic:
 * - SALE: totalAmount
 * - RENT - RESERVED: depositAmount (nếu không cùng ngày pickup/return)
 * - RENT - PICKUPED: 
 *   + Pickup cùng ngày: totalAmount + securityDeposit (KHÔNG trừ depositAmount)
 *   + Pickup khác ngày: totalAmount - depositAmount + securityDeposit
 * - RENT - RETURNED: totalAmount + damageFee (đơn đã hoàn tất, tổng doanh thu thực tế)
 * - CANCELLED: 0 (hoàn lại)
 * 
 * @param order Order data
 * @returns Revenue for current status
 */
export function calculateOrderRevenueByStatus(order: OrderRevenueData): number {
  if (order.orderType === ORDER_TYPE.SALE) {
    if (order.status === ORDER_STATUS.CANCELLED) {
      return 0; // Cancelled = refunded
    }
    return order.totalAmount || 0;
  }

  // RENT order
  const createdAt = order.createdAt ? new Date(order.createdAt) : null;
  const pickedUpAt = order.pickedUpAt ? new Date(order.pickedUpAt) : null;
  const returnedAt = order.returnedAt ? new Date(order.returnedAt) : null;

  const isSameDayPickup = isSameDay(createdAt, pickedUpAt);
  const isSameDayReturn = isSameDay(pickedUpAt || createdAt, returnedAt);

  switch (order.status) {
    case ORDER_STATUS.RESERVED:
      // RESERVED: depositAmount (nếu không cùng ngày pickup/return)
      // Nếu pickup cùng ngày với tạo đơn, KHÔNG tính deposit riêng (đã bao gồm trong pickup revenue)
      // Nếu return cùng ngày, KHÔNG tính deposit riêng (chỉ tính return revenue)
      if (!isSameDayReturn && !isSameDayPickup) {
        return order.depositAmount || 0;
      }
      return 0;

    case ORDER_STATUS.PICKUPED:
      // PICKUPED: tính revenue khi lấy hàng
      // - Pickup cùng ngày với tạo đơn: totalAmount + securityDeposit (KHÔNG trừ depositAmount)
      // - Pickup khác ngày: totalAmount - depositAmount + securityDeposit (trừ depositAmount vì đã thu riêng)
      if (isSameDayPickup) {
        // Same day pickup: totalAmount + securityDeposit (KHÔNG trừ depositAmount)
        return (order.totalAmount || 0) + (order.securityDeposit || 0);
      } else {
        // Different day: totalAmount - depositAmount + securityDeposit (trừ depositAmount vì đã thu riêng)
        return (order.totalAmount || 0) - (order.depositAmount || 0) + (order.securityDeposit || 0);
      }

    case ORDER_STATUS.RETURNED:
      // RETURNED: đơn đã hoàn tất, tính tổng doanh thu thực tế cuối cùng
      // Luôn tính totalAmount + damageFee (bất kể pickup/return có cùng ngày hay không)
      // Lý do: Đơn đã hoàn tất, tổng doanh thu thực tế = totalAmount + damageFee
      return (order.totalAmount || 0) + (order.damageFee || 0);

    case ORDER_STATUS.CANCELLED:
      return 0; // Cancelled = refunded

    default:
      return 0;
  }
}
