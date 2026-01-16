import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { ORDER_STATUS, ORDER_TYPE, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, normalizeDateToISO, getUTCDateKey } from '@rentalshop/utils';
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
    if (userScope.outletId) {
      // Nhân viên cửa hàng: chỉ xem đơn của cửa hàng mình
      whereClause.outletId = userScope.outletId;
    } else if (userScope.merchantId) {
      // Chủ cửa hàng: xem đơn của tất cả cửa hàng trong merchant
      const merchant = await prisma.merchant.findUnique({
        where: { id: userScope.merchantId },
        select: {
          outlets: {
            select: { id: true }
          }
        }
      });
      if (merchant && merchant.outlets.length > 0) {
        whereClause.outletId = { in: merchant.outlets.map((o: { id: number }) => o.id) };
      }
    }
    // ADMIN: không có filter (xem tất cả dữ liệu)

    // ============================================================================
    // LẤY TẤT CẢ ĐƠN HÀNG CÓ THAY ĐỔI TRẠNG THÁI TRONG KHOẢNG THỜI GIAN
    // ============================================================================
    const allOrders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true, // id is the integer publicId
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        securityDeposit: true,
        damageFee: true,
        createdAt: true,
        updatedAt: true, // Include updatedAt to track status changes
        pickedUpAt: true,
        returnedAt: true,
        customer: {
          select: {
            id: true, // id is the integer publicId
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        outlet: {
          select: {
            id: true, // id is the integer publicId
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    /**
     * Tính toán doanh thu theo từng sự kiện thay đổi trạng thái đơn hàng
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
     * LƯU Ý:
     * - Chỉ tính doanh thu khi có thay đổi trạng thái trong khoảng thời gian truy vấn
     * - Mỗi sự kiện (create, pickup, return, cancel) tạo một revenue event riêng
     * - Đơn hủy sẽ tạo event âm để offset lại doanh thu đã thu trước đó
     */
    const getOrderRevenueEvents = (order: any, dateRangeStart: Date, dateRangeEnd: Date): Array<{
      revenue: number;
      date: Date;
      description: string;
      revenueType: string;
    }> => {
      const events: Array<{ revenue: number; date: Date; description: string; revenueType: string }> = [];

      // ============================================================================
      // XỬ LÝ ĐƠN BÁN (SALE)
      // ============================================================================
      if (order.orderType === ORDER_TYPE.SALE) {
        // 1. Đơn bán được tạo: doanh thu = totalAmount
        if (order.createdAt) {
          const createdDate = new Date(order.createdAt);
          if (createdDate >= dateRangeStart && createdDate <= dateRangeEnd) {
            // Bỏ qua nếu đơn bị hủy ngay khi tạo (không có doanh thu)
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

        // 2. Đơn bán bị hủy: hoàn lại toàn bộ (revenue = 0)
        if (order.status === ORDER_STATUS.CANCELLED && order.updatedAt) {
          const cancelledDate = new Date(order.updatedAt);
          if (cancelledDate >= dateRangeStart && cancelledDate <= dateRangeEnd) {
            const createdDate = order.createdAt ? new Date(order.createdAt) : null;
            // Chỉ hoàn lại nếu đơn đã được tạo trước khi hủy
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
      } 
      // ============================================================================
      // XỬ LÝ ĐƠN THUÊ (RENT)
      // ============================================================================
      else {
        // Kiểm tra các trường hợp cùng ngày để áp dụng logic tính toán phù hợp
        const returnDate = order.returnedAt ? new Date(order.returnedAt) : null;
        const createdDate = order.createdAt ? new Date(order.createdAt) : null;
        const pickupDate = order.pickedUpAt ? new Date(order.pickedUpAt) : null;
        
        // Kiểm tra pickup có cùng ngày với tạo đơn không
        let isSameDayPickup = false;
        if (pickupDate && createdDate) {
          const pickupDateKey = getUTCDateKey(pickupDate);
          const createdDateKey = getUTCDateKey(createdDate);
          isSameDayPickup = pickupDateKey === createdDateKey;
        }
        
        // Kiểm tra return có cùng ngày với tạo/lấy không
        // (để quyết định có tính deposit/pickup riêng hay chỉ tính return)
        let isSameDayReturn = false;
        if (returnDate) {
          const returnDateKey = getUTCDateKey(returnDate);
          const startDate = pickupDate || createdDate;
          const startDateKey = startDate ? getUTCDateKey(startDate) : null;
          // Kiểm tra cùng ngày (không cần kiểm tra trong khoảng vì sẽ kiểm tra sau)
          isSameDayReturn = startDateKey !== null && startDateKey === returnDateKey;
        }

        // 1. ĐƠN CỌC (RESERVED): Thu tiền cọc khi tạo đơn
        // Doanh thu = depositAmount
        // LƯU Ý: 
        // - Nếu thuê và trả cùng ngày: không tạo deposit event (chỉ tính return)
        // - Nếu pickup cùng ngày với tạo đơn: không tạo deposit event (đã bao gồm trong pickup revenue)
        if (!isSameDayReturn && !isSameDayPickup && order.createdAt) {
          const createdDate = new Date(order.createdAt);
          if (createdDate >= dateRangeStart && createdDate <= dateRangeEnd) {
            // Bỏ qua nếu đơn bị hủy ngay khi tạo
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

        // 2. ĐƠN LẤY (PICKUPED): Thu tiền khi khách lấy hàng
        // - Nếu pickup cùng ngày với tạo đơn: revenue = totalAmount + securityDeposit - depositAmount (đã bao gồm deposit)
        // - Nếu pickup khác ngày: revenue = totalAmount + securityDeposit (tính deposit riêng)
        // Tìm ngày lấy hàng: ưu tiên pickedUpAt, nếu không có thì dùng createdAt hoặc updatedAt
        // LƯU Ý: Nếu thuê và trả cùng ngày, không tạo pickup event (chỉ tính return)
        if (!isSameDayReturn) {
          let pickupDate: Date | null = null;
          
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
            let pickupRevenue: number;
            if (isSameDayPickup) {
              // Pickup cùng ngày với tạo đơn: revenue = totalAmount + securityDeposit - depositAmount (đã bao gồm deposit)
              pickupRevenue = (order.totalAmount || 0) + (order.securityDeposit || 0) - (order.depositAmount || 0);
            } else {
              // Pickup khác ngày: revenue = totalAmount + securityDeposit (tính deposit riêng)
              pickupRevenue = (order.totalAmount || 0) + (order.securityDeposit || 0);
            }
            
            events.push({
              revenue: pickupRevenue,
              date: pickupDate,
              description: 'Thu tiền khi lấy hàng',
              revenueType: 'RENT_PICKUP'
            });
          }
        }

        // 3. ĐƠN TRẢ (RETURNED): Thanh toán cuối cùng khi khách trả hàng
        // - Nếu thuê và trả trong cùng 1 ngày: doanh thu = totalAmount + damageFee (KHÔNG tính deposit và pickup)
        // - Nếu khác ngày: doanh thu = securityDeposit - damageFee
        //   * Dương: hoàn tiền cọc (securityDeposit > damageFee)
        //   * Âm: thu thêm phí hư hỏng (damageFee > securityDeposit)
        if (order.returnedAt) {
          const returnDate = new Date(order.returnedAt);
          if (returnDate >= dateRangeStart && returnDate <= dateRangeEnd) {
            // Kiểm tra xem đơn được tạo/lấy và trả có trong cùng ngày không
            const returnDateKey = getUTCDateKey(returnDate);
            const createdDate = order.createdAt ? new Date(order.createdAt) : null;
            const pickupDate = order.pickedUpAt ? new Date(order.pickedUpAt) : null;
            
            // Sử dụng ngày lấy hàng nếu có, nếu không thì dùng ngày tạo
            const startDate = pickupDate || createdDate;
            const startDateKey = startDate ? getUTCDateKey(startDate) : null;
            
            let returnRevenue: number;
            let description: string;
            
            if (startDateKey && startDateKey === returnDateKey) {
              // Thuê và trả trong cùng 1 ngày: doanh thu = totalAmount + damageFee
              // KHÔNG tính deposit và pickup riêng (đã bỏ qua ở trên)
              returnRevenue = (order.totalAmount || 0) + (order.damageFee || 0);
              description = 'Thuê và trả trong cùng ngày';
            } else {
              // Khác ngày: doanh thu = securityDeposit - damageFee
              returnRevenue = (order.securityDeposit || 0) - (order.damageFee || 0);
              description = returnRevenue > 0 
                ? 'Hoàn tiền cọc' 
                : returnRevenue < 0 
                  ? 'Thu phí hư hỏng' 
                  : 'Không có phát sinh';
            }
            
            events.push({
              revenue: returnRevenue,
              date: returnDate,
              description,
              revenueType: 'RENT_RETURN'
            });
          }
        }

        // 4. ĐƠN HỦY (CANCELLED): Hoàn lại toàn bộ đã thu (revenue = 0)
        // Tính tổng đã thu trước khi hủy và tạo event âm để offset
        if (order.status === ORDER_STATUS.CANCELLED && order.updatedAt) {
          const cancelledDate = new Date(order.updatedAt);
          if (cancelledDate >= dateRangeStart && cancelledDate <= dateRangeEnd) {
            const createdDate = order.createdAt ? new Date(order.createdAt) : null;
            const pickupDate = order.pickedUpAt ? new Date(order.pickedUpAt) : null;
            
            // Tính tổng đã thu trước khi hủy
            let totalCollected = 0;
            
            if (pickupDate && pickupDate < cancelledDate) {
              // Đã lấy hàng: tính tổng đã thu
              if (isSameDayPickup) {
                // Pickup cùng ngày với tạo đơn: pickup revenue đã bao gồm deposit
                totalCollected = (order.totalAmount || 0) + (order.securityDeposit || 0) - (order.depositAmount || 0);
              } else {
                // Pickup khác ngày: deposit riêng + pickup revenue
                totalCollected = (order.depositAmount || 0) + 
                                ((order.totalAmount || 0) + (order.securityDeposit || 0));
              }
            } else if (createdDate && createdDate < cancelledDate) {
              // Chỉ đặt cọc: chỉ thu tiền cọc
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

    // ============================================================================
    // NHÓM ĐƠN HÀNG THEO NGÀY VÀ TÍNH DOANH THU
    // ============================================================================
    const dailyDataMap = new Map<string, {
      date: string; // YYYY/MM/DD format (standardized)
      dateISO: string; // Full ISO string at midnight UTC (for frontend formatting)
      dateObj: Date;
      totalRevenue: number; // Tổng doanh thu trong ngày
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
      // Lấy tất cả revenue events của đơn này dựa trên timestamp trong khoảng
      const revenueEvents = getOrderRevenueEvents(order, start, end);

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
          const customerName = order.customer 
            ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
            : undefined;
          
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
            customerName,
            customerPhone: order.customer?.phone || undefined,
            outletName: order.outlet?.name,
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
