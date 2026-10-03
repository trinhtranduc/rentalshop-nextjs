import { NextRequest, NextResponse } from 'next/server';
import { withReadOnlyAuth } from '@rentalshop/auth/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ORDER_TYPE, ORDER_STATUS } from '@rentalshop/constants';
import type { CalendarOrderSummary } from '@rentalshop/utils';
import { handleApiError, ResponseBuilder, parseProductImages } from '@rentalshop/utils';
import { calendarDayKey, calendarScopeWhere, isValidTimeZone } from '../../../../../lib/calendar-scope';
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
  limit: z.coerce.number().int().min(1).max(500).default(50), // Default 50 items per page, max 500 for iOS app
  page: z.coerce.number().int().min(1).default(1), // Page number for pagination
  /** `return`: rentals (PICKUPED) due back that day, by return plan (#362); default: today's behaviour */
  kind: z.enum(['pickup', 'return']).optional(),
  /** IANA zone of the device for the day (#362); the Vietnam day when missing */
  timeZone: z.string().min(1).max(64).refine(isValidTimeZone, 'Unknown time zone').optional(),
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

    const { date: dateStr, outletId, merchantId, orderType, limit, page, kind, timeZone } = validatedQuery;
    // Returns of the day are rentals still out (PICKUPED), whatever status was asked for
    const status = kind === 'return' ? ORDER_STATUS.PICKUPED : validatedQuery.status;
    const keyOf = calendarDayKey(timeZone);
    const dayField: 'pickupPlanAt' | 'returnPlanAt' | 'createdAt' =
      kind === 'return'
        ? 'returnPlanAt'
        : status === ORDER_STATUS.RESERVED || status === ORDER_STATUS.PICKUPED || !status
          ? 'pickupPlanAt'
          : 'createdAt';

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

    // Date filter: pickup plan (default and RESERVED/PICKUPED), return plan (kind=return), else creation date
    where[dayField] = {
      gte: previousDayStartUTC,
      lte: nextDayEndUTC
    };

    // Add optional filters
    if (orderType) {
      where.orderType = orderType;
    }

    // Role-based filtering; a merchant's outletId stays inside its merchant (#362)
    Object.assign(where, calendarScopeWhere(user, userScope, outletId));

    // ✅ FIX: Query ALL orders (no pagination) to filter by local date and get correct total
    // Then paginate the filtered results
    // This ensures we get the correct total count after local date filtering
    const allOrdersResult = await db.orders.searchWithItems({
      where,
      limit: 10000, // Large limit to get all orders in the date range
      page: 1
    });
    
    const allOrders = allOrdersResult.data || [];

    console.log('📦 Found orders (before local date filter):', allOrders.length);

    // Keep orders whose day (in the caller's time zone, Vietnam by default) is the requested date
    const filteredOrders = allOrders.filter((order: any) => {
      const value = order[dayField];
      return Boolean(value) && keyOf(value) === dateStr;
    });

    // ✅ FIX: Calculate correct total after local date filtering
    const totalFiltered = filteredOrders.length;

    console.log('📦 Filtered orders by local date:', {
      totalFound: allOrders.length,
      filteredCount: totalFiltered,
      dateStr
    });

    // ✅ FIX: Paginate filtered results
    const currentPage = page || 1;
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    // Transform orders to CalendarOrderSummary format (only paginated orders)
    const orderSummaries: CalendarOrderSummary[] = paginatedOrders.map((order: any) => {
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
        // ✅ FIX: Return dates as-is to match get order API format
        // Don't normalize to midnight UTC as it loses local date information
        // Dates are stored as "2026-02-24T17:00:00.000Z" (17:00 UTC = 00:00 VN ngày 25)
        // Frontend will handle display formatting using formatFullDateByLocale
        pickupPlanAt: order.pickupPlanAt ? new Date(order.pickupPlanAt).toISOString() : undefined,
        returnPlanAt: order.returnPlanAt ? new Date(order.returnPlanAt).toISOString() : undefined,
        pickedUpAt: order.pickedUpAt ? new Date(order.pickedUpAt).toISOString() : undefined,
        createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : undefined, // Order creation date (book date)
        isReadyToDeliver: order.isReadyToDeliver || false,
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

    // Calculate summary statistics (from all filtered orders, not just paginated)
    const totalRevenue = filteredOrders.reduce((sum: number, order: any) => sum + order.totalAmount, 0);
    const averageOrderValue = totalFiltered > 0 ? totalRevenue / totalFiltered : 0;

    // ✅ FIX: Use correct total after local date filtering
    const total = totalFiltered;
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

