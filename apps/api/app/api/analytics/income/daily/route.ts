import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
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

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set time to end of day for end date
    end.setHours(23, 59, 59, 999);
    
    // Validate date range
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_DATE_FORMAT'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    if (start > end) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_INPUT'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // ============================================================================
    // XÂY DỰNG ĐIỀU KIỆN QUERY: Lấy các đơn có thay đổi trạng thái trong khoảng thời gian
    // ============================================================================
    // Đảm bảo chỉ lấy đơn phát sinh trong ngày (có thay đổi trạng thái):
    // - CREATE: Đơn được tạo (createdAt trong khoảng)
    // - PICKUPED: Đơn được lấy (pickedUpAt trong khoảng)
    // - RETURNED: Đơn được trả (returnedAt trong khoảng)
    // - CANCELLED: Đơn bị hủy (status = CANCELLED và updatedAt trong khoảng)
    // - COMPLETED: Đơn bán hoàn thành (SALE orders, status = COMPLETED và updatedAt trong khoảng)
    const whereClause: any = {
      OR: [
        // Đơn được tạo trong khoảng thời gian
        {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        // Đơn được lấy trong khoảng thời gian
        {
          pickedUpAt: {
            gte: start,
            lte: end,
            not: null
          }
        },
        // Đơn được trả trong khoảng thời gian
        {
          returnedAt: {
            gte: start,
            lte: end,
            not: null
          }
        },
        // Đơn bị hủy trong khoảng thời gian
        {
          AND: [
            { status: ORDER_STATUS.CANCELLED },
            { updatedAt: { gte: start, lte: end } },
            { deletedAt: null } // Loại bỏ đơn đã xóa mềm
          ]
        },
        // Đơn bán hoàn thành trong khoảng thời gian
        {
          AND: [
            { orderType: ORDER_TYPE.SALE },
            { status: ORDER_STATUS.COMPLETED },
            { updatedAt: { gte: start, lte: end } },
            { deletedAt: null }
          ]
        }
      ]
    };

    // ============================================================================
    // ÁP DỤNG LỌC THEO PHẠM VI NGƯỜI DÙNG
    // ============================================================================
    // Build filters for db API
    const orderFilters: any = {
      startDate: start,
      endDate: end,
      limit: 10000 // Large limit to get all orders
    };

    if (userScope.outletId) {
      // Nhân viên cửa hàng: chỉ xem đơn của cửa hàng mình
      orderFilters.outletId = userScope.outletId;
    } else if (userScope.merchantId) {
      // Chủ cửa hàng: xem đơn của tất cả cửa hàng trong merchant
      orderFilters.merchantId = userScope.merchantId;
    }
    // ADMIN: không có filter (xem tất cả dữ liệu)

    // ============================================================================
    // LẤY TẤT CẢ ĐƠN HÀNG CÓ THAY ĐỔI TRẠNG THÁI TRONG KHOẢNG THỜI GIAN
    // ============================================================================
    // Use findManyLightweight to get all fields including securityDeposit and damageFee
    const allOrdersResult = await db.orders.findManyLightweight(orderFilters);
    
    // Filter orders based on OR conditions (createdAt, pickedUpAt, returnedAt, etc.)
    const allOrders = allOrdersResult.data.filter((order: any) => {
      const orderCreatedAt = order.createdAt ? new Date(order.createdAt) : null;
      const orderPickedUpAt = order.pickedUpAt ? new Date(order.pickedUpAt) : null;
      const orderReturnedAt = order.returnedAt ? new Date(order.returnedAt) : null;
      const orderUpdatedAt = order.updatedAt ? new Date(order.updatedAt) : null;

      return (
        // Created in period
        (orderCreatedAt && orderCreatedAt >= start && orderCreatedAt <= end) ||
        // Picked up in period
        (orderPickedUpAt && orderPickedUpAt >= start && orderPickedUpAt <= end) ||
        // Returned in period
        (orderReturnedAt && orderReturnedAt >= start && orderReturnedAt <= end) ||
        // Cancelled in period
        (order.status === ORDER_STATUS.CANCELLED && orderUpdatedAt && orderUpdatedAt >= start && orderUpdatedAt <= end) ||
        // SALE completed in period
        (order.orderType === ORDER_TYPE.SALE && order.status === ORDER_STATUS.COMPLETED && orderUpdatedAt && orderUpdatedAt >= start && orderUpdatedAt <= end)
      );
    });

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
      const revenueEvents = getOrderRevenueEvents(orderData, start, end);

      // Xử lý từng revenue event
      for (const event of revenueEvents) {
        // Chỉ bao gồm nếu ngày revenue trong khoảng
        if (event.date < start || event.date > end) {
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
        if (createdDate >= start && createdDate <= end) {
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
            if (createdDate >= start && createdDate <= end) {
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
            if (pickedUpDate >= start && pickedUpDate <= end) {
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
    }

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
