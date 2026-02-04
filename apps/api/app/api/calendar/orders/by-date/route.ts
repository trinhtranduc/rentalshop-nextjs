import { NextRequest, NextResponse } from 'next/server';
import { withReadOnlyAuth } from '@rentalshop/auth';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ORDER_TYPE, ORDER_STATUS, USER_ROLE } from '@rentalshop/constants';
import type { CalendarOrderSummary } from '@rentalshop/utils';
import { handleApiError, ResponseBuilder, parseProductImages, getLocalDateKey, normalizeDateToMidnightUTC } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

// Validation schema for orders by date query
const ordersByDateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  outletId: z.coerce.number().int().positive().optional(),
  merchantId: z.coerce.number().int().positive().optional(),
  orderType: z.enum([
    ORDER_TYPE.RENT,
    ORDER_TYPE.SALE
  ] as [string, ...string[]]).optional(),
  // Status filter - can filter by RESERVED, PICKUPED, COMPLETED, RETURNED, CANCELLED
  status: z.enum([
    ORDER_STATUS.RESERVED,
    ORDER_STATUS.PICKUPED,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.RETURNED,
    ORDER_STATUS.CANCELLED
  ] as [string, ...string[]]).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(20), // Default 20 items per page, max 500 for iOS app
  page: z.coerce.number().int().min(1).default(1), // Page number for pagination
});

/**
 * 🎯 Calendar Orders By Date API
 * 
 * Returns orders for a specific date filtered by status
 * - For RESERVED/PICKUPED: filters by pickupPlanAt (ngày dự kiến lấy)
 * - For other statuses: filters by createdAt (ngày tạo đơn)
 * - Supports filtering by outlet, merchant, orderType, and status
 * - Optimized for daily calendar view
 */
export const GET = withReadOnlyAuth(async (
  request: NextRequest,
  { user, userScope }
) => {
  console.log(`🔍 GET /api/calendar/orders/by-date - User: ${user.email} (${user.role})`);
  console.log(`🔍 Calendar Orders By Date API - UserScope:`, userScope);

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const validatedQuery = ordersByDateQuerySchema.parse(query);

    console.log('📅 Orders by date query:', validatedQuery);

    const { date: dateStr, outletId, merchantId, orderType, status, limit, page } = validatedQuery;

    // ✅ FIX: Parse date string as UTC to avoid timezone issues
    // "2026-02-25" should be treated as 2026-02-25 00:00:00 UTC
    // But orders are stored with time component (e.g., "2026-02-25T17:00:00.000Z")
    // So we need a wider range to capture all potentially relevant orders
    const startOfDayUTC = new Date(dateStr + 'T00:00:00.000Z');
    // Use previous day's midnight UTC to capture orders that might shift due to timezone
    const previousDayStartUTC = new Date(startOfDayUTC);
    previousDayStartUTC.setUTCDate(previousDayStartUTC.getUTCDate() - 1);
    // Use next day's end UTC to capture all orders
    const nextDayEndUTC = new Date(dateStr + 'T23:59:59.999Z');
    nextDayEndUTC.setUTCDate(nextDayEndUTC.getUTCDate() + 1);

    console.log('📅 Target date range (UTC):', { 
      dateStr,
      startOfDayUTC: startOfDayUTC.toISOString(),
      previousDayStartUTC: previousDayStartUTC.toISOString(),
      nextDayEndUTC: nextDayEndUTC.toISOString()
    });

    // Build where clause with role-based filtering
    const where: any = {};

    // Add status filter if provided
    if (status) {
      where.status = status as any;
    }

    // Date filter based on status
    // For RESERVED/PICKUPED: filter by pickupPlanAt (ngày dự kiến lấy)
    // For other statuses: filter by createdAt (ngày tạo đơn)
    // ✅ FIX: Use wider UTC range to capture all potentially relevant orders
    if (status === ORDER_STATUS.RESERVED || status === ORDER_STATUS.PICKUPED) {
      where.pickupPlanAt = {
        gte: previousDayStartUTC,
        lte: nextDayEndUTC
      };
    } else if (status) {
      // For COMPLETED, RETURNED, CANCELLED: filter by createdAt
      where.createdAt = {
        gte: previousDayStartUTC,
        lte: nextDayEndUTC
      };
    } else {
      // If no status specified, default to pickupPlanAt (for backward compatibility)
      where.pickupPlanAt = {
        gte: previousDayStartUTC,
        lte: nextDayEndUTC
      };
    }

    // Add optional filters
    if (orderType) {
      where.orderType = orderType;
    }

    // Role-based filtering
    if (user.role === USER_ROLE.ADMIN) {
      // ADMIN: Can see all orders, optionally filter by outletId
      if (outletId) {
        where.outletId = outletId;
      }
      // No restrictions for ADMIN - they can see all merchants and outlets
    } else if (user.role === USER_ROLE.MERCHANT) {
      // MERCHANT: Can see orders from all their outlets
      // Filter by outlet.merchantId through relation
      where.outlet = {
        merchantId: userScope.merchantId
      };
      if (outletId) {
        where.outletId = outletId;
        // Remove outlet filter if outletId is specified
        delete where.outlet;
      }
    } else if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
      // OUTLET users: Can only see orders from their assigned outlet
      where.outletId = userScope.outletId;
    }

    console.log('🔍 Orders by date where clause:', where);

    // Fetch orders with orderItems included (with pagination)
    const ordersResult = await db.orders.searchWithItems({
      where,
      limit,
      page: page || 1
    });
    
    const orders = ordersResult.data || [];

    console.log('📦 Found orders:', orders.length);

    // ✅ FIX: Filter orders by exact local date using getLocalDateKey
    // This ensures we only return orders that match the selected date in user's local timezone
    const filteredOrders = orders.filter((order: any) => {
      if (status === ORDER_STATUS.RESERVED || status === ORDER_STATUS.PICKUPED) {
        // For RESERVED/PICKUPED: filter by pickupPlanAt
        if (!order.pickupPlanAt) return false;
        const normalizedPickup = normalizeDateToMidnightUTC(order.pickupPlanAt);
        if (!normalizedPickup) return false;
        const orderDateKey = getLocalDateKey(normalizedPickup);
        return orderDateKey === dateStr;
      } else if (status) {
        // For other statuses: filter by createdAt
        if (!order.createdAt) return false;
        const normalizedCreated = normalizeDateToMidnightUTC(order.createdAt);
        if (!normalizedCreated) return false;
        const orderDateKey = getLocalDateKey(normalizedCreated);
        return orderDateKey === dateStr;
      } else {
        // Default: filter by pickupPlanAt
        if (!order.pickupPlanAt) return false;
        const normalizedPickup = normalizeDateToMidnightUTC(order.pickupPlanAt);
        if (!normalizedPickup) return false;
        const orderDateKey = getLocalDateKey(normalizedPickup);
        return orderDateKey === dateStr;
      }
    });

    console.log('📦 Filtered orders by local date:', {
      totalFound: orders.length,
      filteredCount: filteredOrders.length,
      dateStr
    });

    // Transform orders to CalendarOrderSummary format
    const orderSummaries: CalendarOrderSummary[] = filteredOrders.map((order: any) => {
      const orderItems = order.orderItems || [];
      const totalProductCount = orderItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      const firstProduct = orderItems[0]?.product;
      
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.firstName ? 
          `${order.customer.firstName} ${order.customer.lastName || ''}`.trim() : 
          'Unknown Customer',
        customerPhone: order.customer?.phone || undefined,
        status: order.status,
        orderType: order.orderType || undefined,
        totalAmount: order.totalAmount,
        outletName: order.outlet?.name,
        // ✅ FIX: Normalize dates to midnight UTC for consistent display
        pickupPlanAt: order.pickupPlanAt ? normalizeDateToMidnightUTC(order.pickupPlanAt)?.toISOString() : undefined,
        returnPlanAt: order.returnPlanAt ? normalizeDateToMidnightUTC(order.returnPlanAt)?.toISOString() : undefined,
        pickedUpAt: order.pickedUpAt ? normalizeDateToMidnightUTC(order.pickedUpAt)?.toISOString() : undefined,
        createdAt: order.createdAt ? normalizeDateToMidnightUTC(order.createdAt)?.toISOString() : undefined, // Order creation date (book date)
        // Product summary for calendar display
        productName: firstProduct?.name || 'Multiple Products',
        productCount: totalProductCount,
        // Include order items with flattened product data
        orderItems: orderItems.map((item: any) => {
          // Parse productImages with priority: snapshot first, then current product images
          // Priority 1: Use productImages (snapshot field saved when order was created)
          const snapshotImages = parseProductImages(item.productImages);
          // Priority 2: Fallback to product.images (from product relation - current images)
          const productImages = snapshotImages.length > 0 
            ? snapshotImages 
            : parseProductImages(item.product?.images);
          
          return {
            id: item.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
            isReadyToDeliver: order.isReadyToDeliver || false, // From parent order
            // Flattened product data
            productId: item.product?.id,
            productName: item.product?.name,
            productBarcode: item.product?.barcode,
            productImages: productImages,
            productRentPrice: item.product?.rentPrice,
            productDeposit: item.product?.deposit
          };
        })
      };
    });

    // Calculate summary statistics
    const totalRevenue = orderSummaries.reduce((sum, order) => sum + order.totalAmount, 0);
    const averageOrderValue = orderSummaries.length > 0 ? totalRevenue / orderSummaries.length : 0;

    // Get pagination info from search result
    const total = ordersResult.total || orderSummaries.length;
    const currentPage = page || 1;
    const totalPages = Math.ceil(total / limit);
    const hasMore = currentPage < totalPages;

    console.log('📅 Orders by date prepared:', {
      date: dateStr,
      status: status || 'all',
      ordersCount: orderSummaries.length,
      total,
      page: currentPage,
      totalPages,
      totalRevenue,
      averageOrderValue
    });

    return NextResponse.json(
      ResponseBuilder.success('ORDERS_BY_DATE_SUCCESS', {
        date: dateStr,
        orders: orderSummaries,
        summary: {
          totalOrders: total, // Total count from database
          totalRevenue,
          averageOrderValue
        },
        pagination: {
          page: currentPage,
          limit,
          total,
          totalPages,
          hasMore
        },
        filters: {
          outletId: outletId || null,
          merchantId: merchantId || null,
          orderType: orderType || null,
          status: status || null
        }
      })
    );

  } catch (error) {
    console.error('❌ Calendar Orders By Date API error:', error);
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';

