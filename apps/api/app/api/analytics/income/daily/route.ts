import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { ORDER_STATUS, ORDER_TYPE, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, normalizeDateToISO, getUTCDateKey, getOrderRevenueEvents } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/income/daily - Lấy doanh thu theo ngày với chi tiết đơn hàng
 * 
 * TRẢ VỀ:
 * - Doanh thu tổng theo từng ngày
 * - Danh sách đơn hàng với doanh thu từng đơn
 * - Số đơn mới được tạo trong ngày
 * 
 * QUY TẮC TÍNH DOANH THU:
 * 1. Đơn cọc (RESERVED - khi tạo đơn): depositAmount
 *    - LƯU Ý: Nếu pickup cùng ngày với tạo đơn, KHÔNG tạo deposit event riêng (đã bao gồm trong pickup revenue)
 * 2. Đơn lấy (PICKUPED - khi khách lấy hàng):
 *    - Nếu pickup cùng ngày với tạo đơn: totalAmount + securityDeposit - depositAmount (đã bao gồm deposit)
 *    - Nếu pickup khác ngày: totalAmount + securityDeposit (tính deposit riêng)
 * 3. Đơn trả (RETURNED - khi khách trả hàng):
 *    - Nếu thuê và trả trong cùng 1 ngày: totalAmount + damageFee
 *    - Nếu khác ngày: securityDeposit - damageFee
 *      * Dương: hoàn tiền cọc (securityDeposit > damageFee)
 *      * Âm: thu thêm phí hư hỏng (damageFee > securityDeposit)
 * 4. Đơn hủy (CANCELLED): revenue = 0 (hoàn lại toàn bộ đã thu)
 * 
 * ĐIỀU KIỆN LỌC:
 * - Chỉ lấy đơn có thay đổi trạng thái trong khoảng thời gian (create, pickup, return, cancel)
 * - Mỗi sự kiện thay đổi trạng thái tạo một revenue event riêng
 * 
 * PHÂN QUYỀN:
 * - ADMIN, MERCHANT, OUTLET_ADMIN: Xem toàn bộ analytics (analytics.view.revenue)
 * - OUTLET_STAFF: Chỉ xem doanh thu theo ngày (analytics.view.revenue.daily)
 * - Nguồn phân quyền: ROLE_PERMISSIONS trong packages/auth/src/core.ts
 */
export const GET = withPermissions(['analytics.view.revenue', 'analytics.view.revenue.daily'])(async (request, { user, userScope }) => {
  console.log(`💰 GET /api/analytics/income/daily - User: ${user.email}`);
  
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        ResponseBuilder.error('MISSING_REQUIRED_FIELD'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // Parse date string - treat as UTC date to match database timezone
    // Similar to calendar API: parse as UTC, then use wider range to capture all potentially relevant orders
    // "2026-03-07" should be treated as 2026-03-07 00:00:00 UTC
    // But orders are stored with time component (e.g., "2026-03-07T17:00:00.000Z" = 2026-03-08 00:00:00 VN)
    // So we need a wider range to capture all potentially relevant orders
    const startOfDayUTC = new Date(startDate + 'T00:00:00.000Z');
    const endOfDayUTC = new Date(endDate + 'T23:59:59.999Z');
    
    // Use wider UTC range to capture orders that might shift due to timezone
    // Previous day's start UTC to capture orders that might be in previous UTC day but local date matches
    const previousDayStartUTC = new Date(startOfDayUTC);
    previousDayStartUTC.setUTCDate(previousDayStartUTC.getUTCDate() - 1);
    // Next day's end UTC to capture orders that might be in next UTC day but local date matches
    const nextDayEndUTC = new Date(endOfDayUTC);
    nextDayEndUTC.setUTCDate(nextDayEndUTC.getUTCDate() + 1);
    
    // Use the wider range for query, but keep original range for filtering
    const queryStart = previousDayStartUTC;
    const queryEnd = nextDayEndUTC;
    const filterStart = startOfDayUTC;
    const filterEnd = endOfDayUTC;
    
    console.log('📅 Daily Income date range (UTC):', { 
      dateStr: `${startDate} to ${endDate}`,
      queryRange: `${queryStart.toISOString()} to ${queryEnd.toISOString()}`,
      filterRange: `${filterStart.toISOString()} to ${filterEnd.toISOString()}`
    });
    
    // Validate date range
    if (isNaN(filterStart.getTime()) || isNaN(filterEnd.getTime())) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_DATE_FORMAT'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    if (filterStart > filterEnd) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_INPUT'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // ============================================================================
    // XÂY DỰNG ĐIỀU KIỆN QUERY: Lấy các đơn có thay đổi trạng thái trong khoảng thời gian
    // ============================================================================
    // IMPORTANT: Use OR conditions to include orders created BEFORE period but picked up/returned DURING period
    // Đảm bảo chỉ lấy đơn phát sinh trong ngày (có thay đổi trạng thái):
    // - CREATE: Đơn được tạo (createdAt trong khoảng)
    // - PICKUPED: Đơn được lấy (pickedUpAt trong khoảng) - CRITICAL: includes orders created before period
    // - RETURNED: Đơn được trả (returnedAt trong khoảng) - CRITICAL: includes orders created/picked up before period
    // - CANCELLED: Đơn bị hủy (status = CANCELLED và updatedAt trong khoảng)
    // - COMPLETED: Đơn bán hoàn thành (SALE orders, status = COMPLETED và updatedAt trong khoảng)
    const ordersWhereClause: any = {
      deletedAt: null, // Exclude soft-deleted orders
      OR: [
        // Đơn được tạo trong khoảng thời gian (use wider range for query)
        {
          createdAt: {
            gte: queryStart,
            lte: queryEnd
          }
        },
        // Đơn được lấy trong khoảng thời gian (CRITICAL: includes orders created before period)
        // Use wider range to capture orders that might shift due to timezone
        {
          pickedUpAt: {
            gte: queryStart,
            lte: queryEnd,
            not: null
          }
        },
        // Đơn được trả trong khoảng thời gian (CRITICAL: includes orders created/picked up before period)
        // Use wider range to capture orders that might shift due to timezone
        {
          returnedAt: {
            gte: queryStart,
            lte: queryEnd,
            not: null
          }
        },
        // Đơn bị hủy trong khoảng thời gian
        {
          AND: [
            { status: ORDER_STATUS.CANCELLED },
            { updatedAt: { gte: queryStart, lte: queryEnd } }
          ]
        },
        // Đơn bán hoàn thành trong khoảng thời gian
        {
          AND: [
            { orderType: ORDER_TYPE.SALE },
            { status: ORDER_STATUS.COMPLETED },
            { updatedAt: { gte: queryStart, lte: queryEnd } }
          ]
        }
      ]
    };

    // ============================================================================
    // ÁP DỤNG LỌC THEO PHẠM VI NGƯỜI DÙNG
    // ============================================================================
    if (userScope.outletId) {
      // Nhân viên cửa hàng: chỉ xem đơn của cửa hàng mình
      const outletObj = await db.outlets.findById(userScope.outletId);
      if (outletObj) {
        ordersWhereClause.outletId = outletObj.id;
      }
    } else if (userScope.merchantId) {
      // Chủ cửa hàng: xem đơn của tất cả cửa hàng trong merchant
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) {
        ordersWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
      }
    }
    // ADMIN: không có filter (xem tất cả dữ liệu)

    // ============================================================================
    // LẤY TẤT CẢ ĐƠN HÀNG CÓ THAY ĐỔI TRẠNG THÁI TRONG KHOẢNG THỜI GIAN
    // ============================================================================
    // Query directly from Prisma with OR conditions to get ALL orders with events in period
    // This ensures orders created before period but picked up/returned during period are included
    const allOrders = await prisma.order.findMany({
      where: ordersWhereClause,
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        securityDeposit: true,
        damageFee: true,
        lateFee: true,
        discountType: true,
        discountValue: true,
        discountAmount: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        pickedUpAt: true,
        returnedAt: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      },
      take: 10000 // Large limit to get all orders
    });

    console.log(`💰 Daily Income: Found ${allOrders.length} orders with events in query range ${queryStart.toISOString()} - ${queryEnd.toISOString()}`);

    // Use getOrderRevenueEvents from revenue-calculator.ts (single source of truth)

    // ============================================================================
    // NHÓM ĐƠN HÀNG THEO NGÀY VÀ TÍNH DOANH THU
    // ============================================================================
    const dailyDataMap = new Map<string, {
      date: string; // YYYY/MM/DD format (standardized)
      dateISO: string; // Full ISO string at midnight UTC (for frontend formatting)
      dateObj: Date;
      totalRevenue: number; // Tổng doanh thu trong ngày
      depositRefund: number; // Tổng tiền thế chân thu được trong ngày (tính theo ngày phát sinh: RESERVED hoặc PICKUPED)
      totalCollateral: number; // Tổng tiền thế chân (chỉ tính cho đơn đã PICKUPED)
      totalCollateralPlan: number; // Tổng tiền thế chân dự kiến (chỉ tính cho đơn RESERVED có pickupPlanAt trong tương lai)
      newOrderCount: number; // Số đơn mới được tạo trong ngày
      orders: Array<{
        id: number;
        orderNumber: string;
        orderType: string;
        status: string;
        revenue: number; // Doanh thu của sự kiện này
        revenueType: string; // Loại doanh thu (RENT_DEPOSIT, RENT_PICKUP, etc.)
        description: string; // Mô tả sự kiện
        revenueDate: string; // ISO string với timestamp đầy đủ
        customerName?: string;
        customerPhone?: string;
        outletName?: string;
        totalAmount: number;
        depositAmount: number;
        securityDeposit: number; // Tiền cọc an toàn
        damageFee: number; // Phí hư hỏng
      }>;
    }>();

    // Theo dõi đơn đã được đếm để tránh đếm trùng
    const newOrdersCounted = new Set<string>();
    // Theo dõi đơn đã được thêm vào danh sách orders để tránh duplicate
    // Key: `${order.id}-${dateKey}` -> order entry trong danh sách
    const ordersInList = new Map<string, {
      index: number;
      revenue: number;
      events: Array<{ revenueType: string; description: string; revenueDate: string }>;
    }>();

    // Xử lý từng đơn hàng
    for (const order of allOrders) {
      // Prepare order data for revenue calculator
      const orderData = {
        orderType: order.orderType,
        status: order.status,
        totalAmount: order.totalAmount || 0,
        depositAmount: order.depositAmount || 0,
        securityDeposit: order.securityDeposit || 0,
        damageFee: order.damageFee || 0,
        createdAt: order.createdAt,
        pickedUpAt: order.pickedUpAt,
        returnedAt: order.returnedAt,
        pickupPlanAt: order.pickupPlanAt,
        returnPlanAt: order.returnPlanAt,
        updatedAt: order.updatedAt
      };

      // Lấy tất cả revenue events của đơn này dựa trên timestamp trong khoảng
      // Use getOrderRevenueEvents from revenue-calculator.ts (single source of truth)
      // Use filterStart and filterEnd (not queryStart/queryEnd) to only include events in the actual period
      const revenueEvents = getOrderRevenueEvents(orderData, filterStart, filterEnd);

      // Xử lý từng revenue event
      for (const event of revenueEvents) {
        // Chỉ bao gồm nếu ngày revenue trong khoảng filter (actual period)
        if (event.date < filterStart || event.date > filterEnd) {
          continue;
        }

        // Format ngày thành YYYY/MM/DD để nhóm
        const dateKey = getUTCDateKey(event.date);
        // Chuẩn hóa ngày về midnight UTC
        const dateISO = normalizeDateToISO(event.date);
        const dateObj = new Date(dateISO);

        // Tạo hoặc lấy entry theo ngày
        if (!dailyDataMap.has(dateKey)) {
          dailyDataMap.set(dateKey, {
            date: dateKey,
            dateISO: dateISO,
            dateObj,
            totalRevenue: 0,
            depositRefund: 0, // Tiền thế chân trả lại
            totalCollateral: 0, // Tổng tiền thế chân (chỉ tính cho đơn đã PICKUPED)
            totalCollateralPlan: 0, // Tổng tiền thế chân dự kiến (chỉ tính cho đơn RESERVED có pickupPlanAt trong tương lai)
            newOrderCount: 0,
            orders: []
          });
        }

        const dailyData = dailyDataMap.get(dateKey)!;

        // Cộng doanh thu vào tổng ngày
        dailyData.totalRevenue += event.revenue;

        // Kiểm tra xem đơn đã được thêm vào danh sách chưa
        const orderKey = `${order.id}-${dateKey}`;
        const existingOrder = ordersInList.get(orderKey);

        if (existingOrder) {
          // Đơn đã tồn tại: cộng dồn revenue và thêm event vào danh sách
          const orderEntry = dailyData.orders[existingOrder.index];
          existingOrder.revenue += event.revenue;
          existingOrder.events.push({
            revenueType: event.revenueType,
            description: event.description,
            revenueDate: event.date.toISOString()
          });
          
          // Cập nhật entry trong danh sách
          orderEntry.revenue = existingOrder.revenue;
          // Nếu có nhiều events, đánh dấu là MULTIPLE và tạo description tổng hợp
          if (existingOrder.events.length > 1) {
            orderEntry.revenueType = 'MULTIPLE';
            // Tạo description từ danh sách các events (loại bỏ trùng lặp)
            const uniqueDescriptions = [...new Set(existingOrder.events.map(e => e.description))];
            orderEntry.description = uniqueDescriptions.join(' + ');
            // Giữ revenueDate là ngày của event đầu tiên (sớm nhất)
          }
        } else {
          // Đơn chưa tồn tại: thêm mới vào danh sách
          // IMPORTANT: findManyLightweight flattens customer/outlet data into direct fields
          // Use customerName, customerPhone, outletName (NOT order.customer.firstName)
          const orderWithRelations = order as any;
          
          const orderIndex = dailyData.orders.length;
          dailyData.orders.push({
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            status: order.status,
            revenue: event.revenue,
            revenueType: event.revenueType,
            description: event.description,
            revenueDate: event.date.toISOString(),
            // Use flattened fields from findManyLightweight (dòng 1745-1750 trong order.ts)
            customerName: orderWithRelations.customerName || undefined,
            customerPhone: orderWithRelations.customerPhone || undefined,
            outletName: orderWithRelations.outletName || undefined,
            totalAmount: order.totalAmount || 0,
            depositAmount: order.depositAmount || 0,
            securityDeposit: order.securityDeposit || 0,
            damageFee: order.damageFee || 0
          });

          // Lưu vào map để theo dõi
          ordersInList.set(orderKey, {
            index: orderIndex,
            revenue: event.revenue,
            events: [{
              revenueType: event.revenueType,
              description: event.description,
              revenueDate: event.date.toISOString()
            }]
          });
        }
      }

      // ============================================================================
      // ĐẾM ĐƠN MỚI: Đếm số đơn được tạo trong ngày
      // ============================================================================
      // Đếm tất cả đơn được tạo trong khoảng thời gian, bất kể trạng thái hiện tại
      // (vì đơn tạo hôm nay vẫn được tính dù sau đó bị lấy/trả/hủy)
      if (order.createdAt) {
        const createdDate = new Date(order.createdAt);
        if (createdDate >= filterStart && createdDate <= filterEnd) {
          const dateKey = getUTCDateKey(createdDate);
          const orderKey = `${order.orderNumber}-${dateKey}`;
          
          // Chỉ đếm một lần mỗi đơn mỗi ngày
          if (!newOrdersCounted.has(orderKey)) {
            if (dailyDataMap.has(dateKey)) {
              const dailyData = dailyDataMap.get(dateKey)!;
              
              // Kiểm tra xem đơn có bị hủy ngay khi tạo không
              const wasCancelledAtCreation = order.status === ORDER_STATUS.CANCELLED && 
                (!order.updatedAt || new Date(order.updatedAt).getTime() === createdDate.getTime());
              
              // Chỉ đếm nếu đơn không bị hủy ngay khi tạo
              // (đơn bị hủy sau đó vẫn được tính là đơn mới)
              if (!wasCancelledAtCreation) {
                dailyData.newOrderCount += 1;
                newOrdersCounted.add(orderKey);
              }
            }
          }
        }
      }

      // ============================================================================
      // TÍNH TIỀN THẾ CHÂN THU ĐƯỢC: Tính theo ngày phát sinh
      // ============================================================================
      // Tính securityDeposit dựa vào ngày phát sinh (ngày thu tiền cọc)
      // - RESERVED: Tính nếu có securityDeposit và createdAt trong period
      // - PICKUPED: Tính nếu có securityDeposit và pickedUpAt trong period
      // - RETURNED: KHÔNG tính (đã trả lại)
      // - CANCELLED: KHÔNG tính (đã hoàn lại)
      if (order.orderType === ORDER_TYPE.RENT) {
        const securityDeposit = order.securityDeposit || 0;
        if (securityDeposit > 0) {
          // Tính khi RESERVED: Nếu có securityDeposit và createdAt trong period
          if (
            order.status === ORDER_STATUS.RESERVED &&
            order.createdAt
          ) {
            const createdDate = new Date(order.createdAt);
            if (createdDate >= filterStart && createdDate <= filterEnd) {
              const dateKey = getUTCDateKey(createdDate);
              if (dailyDataMap.has(dateKey)) {
                const dailyData = dailyDataMap.get(dateKey)!;
                dailyData.depositRefund += securityDeposit;
              }
            }
          }
          
          // Tính khi PICKUPED: Nếu có securityDeposit và pickedUpAt trong period
          if (
            order.status === ORDER_STATUS.PICKUPED &&
            order.pickedUpAt
          ) {
            const pickedUpDate = new Date(order.pickedUpAt);
            if (pickedUpDate >= filterStart && pickedUpDate <= filterEnd) {
              const dateKey = getUTCDateKey(pickedUpDate);
              if (dailyDataMap.has(dateKey)) {
                const dailyData = dailyDataMap.get(dateKey)!;
                dailyData.depositRefund += securityDeposit;
              }
            }
          }
          
          // KHÔNG tính khi RETURNED hoặc CANCELLED (đã trả lại/hoàn lại)
        }
      }
      
      // ============================================================================
      // TÍNH TỔNG TIỀN THẾ CHÂN: Chỉ tính cho đơn đã PICKUPED
      // ============================================================================
      if (order.orderType === ORDER_TYPE.RENT && order.status === ORDER_STATUS.PICKUPED) {
        const securityDeposit = order.securityDeposit || 0;
        if (securityDeposit > 0 && order.pickedUpAt) {
          const pickedUpDate = new Date(order.pickedUpAt);
          if (pickedUpDate >= filterStart && pickedUpDate <= filterEnd) {
            const dateKey = getUTCDateKey(pickedUpDate);
            if (dailyDataMap.has(dateKey)) {
              const dailyData = dailyDataMap.get(dateKey)!;
              dailyData.totalCollateral += securityDeposit;
            }
          }
        }
      }
    }

    // ============================================================================
    // TÍNH LẠI TỔNG TIỀN THẾ CHÂN: Query riêng để đảm bảo tính đúng
    // ============================================================================
    // VẤN ĐỀ: findManyLightweight filter theo createdAt, không phải pickedUpAt
    // Nên cần query riêng với filter pickedUpAt để tính totalCollateral chính xác
    // Query tất cả orders có status PICKUPED và được pickup trong period
    const collateralWhereClause: any = {
      orderType: ORDER_TYPE.RENT,
      status: ORDER_STATUS.PICKUPED,
      pickedUpAt: {
        gte: queryStart,
        lte: queryEnd,
        not: null
      },
      deletedAt: null
    };
    
    // Apply outlet filtering
    if (userScope.outletId) {
      const outletObj = await db.outlets.findById(userScope.outletId);
      if (outletObj) {
        collateralWhereClause.outletId = outletObj.id;
      }
    } else if (userScope.merchantId) {
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) {
        collateralWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
      }
    }
    
    // Query orders trực tiếp từ Prisma để tính totalCollateral chính xác
    const collateralOrders = await prisma.order.findMany({
      where: collateralWhereClause,
      select: {
        securityDeposit: true,
        pickedUpAt: true
      }
    });
    
    // Tính lại totalCollateral và cập nhật vào dailyDataMap
    // Reset totalCollateral trước
    for (const dailyData of dailyDataMap.values()) {
      dailyData.totalCollateral = 0;
    }
    
    // Tính lại từ query riêng
    for (const order of collateralOrders) {
      if (order.pickedUpAt) {
        const pickedUpDate = new Date(order.pickedUpAt);
        const dateKey = getUTCDateKey(pickedUpDate);
        if (dailyDataMap.has(dateKey)) {
          const dailyData = dailyDataMap.get(dateKey)!;
          dailyData.totalCollateral += (order.securityDeposit || 0);
        }
      }
    }
    
    console.log(`💰 Daily Total Collateral recalculated: ${collateralOrders.length} PICKUPED orders in query range ${queryStart.toISOString()} - ${queryEnd.toISOString()}`);

    // ============================================================================
    // TÍNH TỔNG TIỀN THẾ CHÂN DỰ KIẾN: Query riêng cho đơn RESERVED có pickupPlanAt trong tương lai
    // ============================================================================
    // Query tất cả orders có status RESERVED, có securityDeposit, và pickupPlanAt trong tương lai
    const now = new Date();
    const collateralPlanWhereClause: any = {
      orderType: ORDER_TYPE.RENT,
      status: ORDER_STATUS.RESERVED,
      pickupPlanAt: {
        gte: now, // Chỉ tính cho đơn có pickupPlanAt trong tương lai
        not: null
      },
      deletedAt: null
    };
    
    // Apply outlet filtering
    if (userScope.outletId) {
      const outletObj = await db.outlets.findById(userScope.outletId);
      if (outletObj) {
        collateralPlanWhereClause.outletId = outletObj.id;
      }
    } else if (userScope.merchantId) {
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) {
        collateralPlanWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
      }
    }
    
    // Query orders trực tiếp từ Prisma để tính totalCollateralPlan chính xác
    const collateralPlanOrders = await prisma.order.findMany({
      where: collateralPlanWhereClause,
      select: {
        securityDeposit: true,
        pickupPlanAt: true
      }
    });
    
    // Tính totalCollateralPlan và cập nhật vào dailyDataMap theo pickupPlanAt
    // Reset totalCollateralPlan trước
    for (const dailyData of dailyDataMap.values()) {
      dailyData.totalCollateralPlan = 0;
    }
    
    // Tính lại từ query riêng - group theo pickupPlanAt date
    for (const order of collateralPlanOrders) {
      if (order.pickupPlanAt) {
        const pickupPlanDate = new Date(order.pickupPlanAt);
        const dateKey = getUTCDateKey(pickupPlanDate);
        // Chỉ tính nếu pickupPlanAt nằm trong period được filter (actual period)
        if (pickupPlanDate >= filterStart && pickupPlanDate <= filterEnd && dailyDataMap.has(dateKey)) {
          const dailyData = dailyDataMap.get(dateKey)!;
          dailyData.totalCollateralPlan += (order.securityDeposit || 0);
        }
      }
    }
    
    console.log(`💰 Daily Total Collateral Plan calculated: ${collateralPlanOrders.length} RESERVED orders (pickupPlanAt in future)`);

    // ============================================================================
    // CHUYỂN ĐỔI MAP THÀNH ARRAY VÀ SẮP XẾP THEO NGÀY
    // ============================================================================
    const dailyDataArray = Array.from(dailyDataMap.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(({ dateObj, ...rest }) => ({
        ...rest,
        // date: YYYY/MM/DD format (standardized)
        // dateISO: Full ISO string at midnight UTC (for locale formatting)
      }));

    return NextResponse.json(
      ResponseBuilder.success('DAILY_INCOME_SUCCESS', {
        startDate: startDate,
        endDate: endDate,
        days: dailyDataArray,
        summary: {
          totalDays: dailyDataArray.length,
          totalRevenue: dailyDataArray.reduce((sum, day) => sum + day.totalRevenue, 0),
          totalDepositRefund: dailyDataArray.reduce((sum, day) => sum + day.depositRefund, 0), // Tổng tiền thế chân thu được
          totalCollateral: dailyDataArray.reduce((sum, day) => sum + (day.totalCollateral || 0), 0), // Tổng tiền thế chân (chỉ tính cho đơn đã PICKUPED)
          totalCollateralPlan: dailyDataArray.reduce((sum, day) => sum + (day.totalCollateralPlan || 0), 0), // Tổng tiền thế chân dự kiến (chỉ tính cho đơn RESERVED có pickupPlanAt trong tương lai)
          totalNewOrders: dailyDataArray.reduce((sum, day) => sum + day.newOrderCount, 0),
          totalOrders: dailyDataArray.reduce((sum, day) => sum + day.orders.length, 0)
        }
      })
    );

  } catch (error) {
    console.error('Error fetching daily income:', error);
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';
