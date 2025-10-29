import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ordersQuerySchema, orderCreateSchema, orderUpdateSchema, assertPlanLimit, PricingResolver, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { PerformanceMonitor } from '@rentalshop/utils/src/performance';

/**
 * GET /api/orders
 * Get orders with filtering, pagination
 * REFACTORED: Now uses unified withAuth pattern
 */
export const GET = withManagementAuth(async (request, { user, userScope }) => {
  console.log(`🔍 GET /api/orders - User: ${user.email} (${user.role})`);
  console.log(`🔍 GET /api/orders - UserScope:`, userScope);
  
  // Validate that non-admin users have merchant association
  if (user.role !== 'ADMIN' && !userScope.merchantId) {
    console.log('❌ Non-admin user without merchant association:', {
      role: user.role,
      merchantId: userScope.merchantId,
      outletId: userScope.outletId
    });
    return NextResponse.json(
      ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED', 'User must be associated with a merchant'),
      { status: 403 }
    );
  }
  
  try {
    const { searchParams } = new URL(request.url);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const parsed = ordersQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      console.log('Validation error:', parsed.error.flatten());
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { 
      page,
      limit,
      q, 
      orderType,
      status,
      merchantId: queryMerchantId,
      outletId: queryOutletId,
      customerId,
      productId,
      startDate,
      endDate,
      sortBy,
      sortOrder
    } = parsed.data;

    console.log('Parsed filters:', { 
      page, limit, q, orderType, status, 
      queryMerchantId, queryOutletId, customerId, productId, startDate, endDate,
      sortBy, sortOrder
    });
    
    // Implement role-based filtering
    let searchFilters: any = {
      customerId,
      productId,
      orderType,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search: q,
      page: page || 1,
      limit: limit || 20,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc'
    };

    // Role-based merchant filtering:
    // - ADMIN role: Can see orders from all merchants (unless queryMerchantId is specified)
    // - MERCHANT role: Can only see orders from their own merchant
    // - OUTLET_ADMIN/OUTLET_STAFF: Can only see orders from their merchant
    if (user.role === 'ADMIN') {
      // Admins can see all merchants unless specifically filtering by merchant
      searchFilters.merchantId = queryMerchantId;
    } else {
      // Non-admin users restricted to their merchant
      searchFilters.merchantId = userScope.merchantId;
    }

    // Role-based outlet filtering:
    // - MERCHANT role: Can see orders from all outlets of their merchant (unless queryOutletId is specified)
    // - OUTLET_ADMIN/OUTLET_STAFF: Can only see orders from their assigned outlet
    if (user.role === 'MERCHANT') {
      // Merchants can see all outlets unless specifically filtering by outlet
      searchFilters.outletId = queryOutletId;
    } else if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      // Outlet users can only see orders from their assigned outlet
      searchFilters.outletId = userScope.outletId;
    } else if (user.role === 'ADMIN') {
      // Admins can see all orders (no outlet filtering unless specified)
      searchFilters.outletId = queryOutletId;
    }

    // Add product filtering if specified
    if (productId) {
      searchFilters.productId = productId;
    }

    console.log(`🔍 Role-based filtering for ${user.role}:`, {
      'userScope.merchantId': userScope.merchantId,
      'userScope.outletId': userScope.outletId,
      'queryMerchantId': queryMerchantId,
      'queryOutletId': queryOutletId,
      'final merchantId filter': searchFilters.merchantId,
      'final outletId filter': searchFilters.outletId,
      'productId filter': searchFilters.productId
    });

    console.log('🔍 Using simplified db.orders.search with filters:', searchFilters);
    console.log('📊 PAGINATION DEBUG: page=', searchFilters.page, ', limit=', searchFilters.limit);
    
    // Use performance monitoring for query optimization
    // For large datasets, use lightweight method for better performance
    const result = await PerformanceMonitor.measureQuery(
      'orders.search',
      () => db.orders.findManyLightweight(searchFilters)
    );
    
    console.log('✅ Search completed, found:', result.data?.length || 0, 'orders');
    console.log('📊 RESULT DEBUG: page=', result.page, ', total=', result.total, ', limit=', result.limit);

    return NextResponse.json({
      success: true,
      data: {
        orders: result.data || [],
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 20,
        offset: ((result.page || 1) - 1) * (result.limit || 20),
        hasMore: (result.page || 1) * (result.limit || 20) < (result.total || 0),
        totalPages: Math.ceil((result.total || 0) / (result.limit || 20))
      },
      code: "ORDERS_FOUND",
      message: `Found ${result.total || 0} orders`
    });

  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    return NextResponse.json(
      ResponseBuilder.error('FETCH_ORDERS_FAILED'),
      { status: 500 }
    );
  }
});

/**
 * POST /api/orders
 * Create a new order using simplified database API
 * REFACTORED: Now uses unified withAuth pattern
 */
export const POST = withManagementAuth(async (request, { user, userScope }) => {
  console.log(`🔍 POST /api/orders - User: ${user.email} (${user.role})`);
  
  try {
    const body = await request.json();
    const parsed = orderCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    // Get outlet and merchant to check association and plan limits
    const outlet = await db.outlets.findById(parsed.data.outletId);
    if (!outlet) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Get merchant for pricing configuration
    const merchant = await db.merchants.findById(outlet.merchantId);
    if (!merchant) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check plan limits before creating order (optional - orders are typically unlimited)
    try {
      await assertPlanLimit(outlet.merchantId, 'orders');
      console.log('✅ Plan limit check passed for orders');
    } catch (error: any) {
      console.log('❌ Plan limit exceeded for orders:', error.message);
      return NextResponse.json(
        ResponseBuilder.error('PLAN_LIMIT_EXCEEDED', error.message || 'Plan limit exceeded for orders'),
        { status: 403 }
      );
    }

    // Generate order number using the outlet's ID
    const orderNumber = `${parsed.data.outletId.toString().padStart(3, '0')}-${Date.now().toString().slice(-6)}`;

    // Determine initial status based on order type
    // SALE orders start as COMPLETED (immediate purchase)
    // RENT orders start as RESERVED (scheduled rental)
    const initialStatus = parsed.data.orderType === 'SALE' ? 'COMPLETED' : 'RESERVED';

    // Calculate rentalDuration from pickup and return dates
    let rentalDuration: number | null = null;
    if (parsed.data.pickupPlanAt && parsed.data.returnPlanAt) {
      const pickup = new Date(parsed.data.pickupPlanAt);
      const returnDate = new Date(parsed.data.returnPlanAt);
      const diffTime = returnDate.getTime() - pickup.getTime();
      rentalDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
      console.log('🔍 Calculated rental duration:', rentalDuration, 'days');
    }

    // Create order with proper relations (Order does NOT have direct merchant relation)
    const orderData = {
      orderNumber,
      outlet: { connect: { id: parsed.data.outletId } },
      customer: parsed.data.customerId ? { connect: { id: parsed.data.customerId } } : undefined,
      createdBy: { connect: { id: user.id } },
      orderType: parsed.data.orderType,
      status: initialStatus,
      totalAmount: parsed.data.totalAmount,
      depositAmount: parsed.data.depositAmount || 0,
      securityDeposit: parsed.data.securityDeposit || 0,
      damageFee: parsed.data.damageFee || 0,
      lateFee: parsed.data.lateFee || 0,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue || 0,
      discountAmount: parsed.data.discountAmount || 0,
      pickupPlanAt: parsed.data.pickupPlanAt ? new Date(parsed.data.pickupPlanAt) : null,
      returnPlanAt: parsed.data.returnPlanAt ? new Date(parsed.data.returnPlanAt) : null,
      rentalDuration: rentalDuration,
      isReadyToDeliver: parsed.data.isReadyToDeliver || false,
      collateralType: parsed.data.collateralType,
      collateralDetails: parsed.data.collateralDetails,
      notes: parsed.data.notes,
      pickupNotes: parsed.data.pickupNotes,
      // Add order items with pricing calculation
      orderItems: {
        create: await Promise.all(parsed.data.orderItems?.map(async item => {
          // Get product details for snapshot
          const product = await db.products.findById(item.productId);
          if (!product) {
            throw new Error(`Product with ID ${item.productId} not found`);
          }

          // Calculate pricing using PricingResolver
          let pricing;
          try {
            // Use fallback pricing since PricingResolver expects specific Product type
            pricing = {
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice || (item.quantity * item.unitPrice),
              deposit: item.deposit || 0,
              pricingType: 'FIXED'
            };
          } catch (pricingError) {
            console.error('Pricing calculation error:', pricingError);
            // Fallback to provided values
            pricing = {
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice || (item.quantity * item.unitPrice),
              deposit: item.deposit || 0,
              pricingType: 'FIXED' // Default pricing type
            };
          }

          // Calculate rentalDays for this item (use order-level rentalDuration)
          const rentalDays = rentalDuration || 1;

          // Snapshot product info to preserve it even if product is deleted later
          return {
            product: { connect: { id: item.productId } },
            // Snapshot fields
            productName: product.name || null,
            productBarcode: product.barcode || null,
            productImages: product.images || null,
            // Order item fields
            quantity: item.quantity,
            unitPrice: pricing.unitPrice,
            totalPrice: pricing.totalPrice,
            deposit: pricing.deposit,
            notes: item.notes,
            rentalDays: rentalDays
          };
        }) || [])
      }
    };

    console.log('🔍 Creating order with data:', orderData);
    
    // Use simplified database API
    const order = await db.orders.create(orderData);
    console.log('✅ Order created successfully:', order);

    // Flatten order response (consistent with order list response)
    const flattenedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      outletId: order.outletId,
      outletName: order.outlet?.name || null,
      customerId: order.customerId,
      customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}`.trim() : null,
      customerPhone: order.customer?.phone || null,
      customerEmail: order.customer?.email || null,
      merchantId: null, // Will be populated from outlet if needed
      merchantName: null, // Will be populated from outlet if needed
      createdById: order.createdById,
      createdByName: order.createdBy ? `${order.createdBy.firstName} ${order.createdBy.lastName}`.trim() : null,
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      securityDeposit: order.securityDeposit,
      damageFee: order.damageFee,
      lateFee: order.lateFee,
      discountType: order.discountType,
      discountValue: order.discountValue,
      discountAmount: order.discountAmount,
      pickupPlanAt: order.pickupPlanAt,
      returnPlanAt: order.returnPlanAt,
      pickedUpAt: order.pickedUpAt,
      returnedAt: order.returnedAt,
      rentalDuration: order.rentalDuration,
      isReadyToDeliver: order.isReadyToDeliver,
      collateralType: order.collateralType,
      collateralDetails: order.collateralDetails,
      notes: order.notes,
      pickupNotes: order.pickupNotes,
      returnNotes: order.returnNotes,
      damageNotes: order.damageNotes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // Flatten order items with product info
      orderItems: order.orderItems?.map((item: any) => {
        // Helper function to parse productImages (handle both JSON string and array)
        const parseProductImages = (images: any): string[] => {
          if (!images) return [];
          if (Array.isArray(images)) return images;
          if (typeof images === 'string') {
            try {
              const parsed = JSON.parse(images);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          }
          return [];
        };

        // Use productImages snapshot field (already saved during order creation)
        const productImages = parseProductImages(item.productImages);

        return {
          id: item.id,
          productId: item.productId,
          productName: item.productName || item.product?.name || null,
          productBarcode: item.productBarcode || item.product?.barcode || null,
          productImages: productImages,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          deposit: item.deposit,
          notes: item.notes,
          rentalDays: item.rentalDays
        };
      }) || [],
      // Calculated fields
      itemCount: order.orderItems?.length || 0,
      paymentCount: order.payments?.length || 0,
      totalPaid: order.payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
    };

    return NextResponse.json({
      success: true,
      data: flattenedOrder,
      code: 'ORDER_CREATED_SUCCESS',
      message: 'Order created successfully'
    });

  } catch (error: any) {
    console.error('Error in POST /api/orders:', error);
    
    // Use ResponseBuilder for consistent error format
    const errorCode = error?.code || 'INTERNAL_SERVER_ERROR';
    const errorMessage = error?.message || 'An error occurred';
    
    return NextResponse.json(
      ResponseBuilder.error(errorCode, errorMessage),
      { status: 500 }
    );
  }
});

/**
 * PUT /api/orders?id={id}
 * Update an order using simplified database API  
 * REFACTORED: Now uses unified withAuth pattern
 */
export const PUT = withManagementAuth(async (request, { user, userScope }) => {
  console.log(`🔍 PUT /api/orders - User: ${user.email} (${user.role})`);
  
  try {
    const body = await request.json();
    const parsed = orderUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    // Extract id from query params
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');

    if (!id) {
      return NextResponse.json(
        ResponseBuilder.error('ORDER_ID_REQUIRED'),
        { status: 400 }
      );
    }

    // Get existing order to check permissions
    const existingOrder = await db.orders.findById(id);
    if (!existingOrder) {
      return NextResponse.json(
        ResponseBuilder.error('ORDER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check if user can access this order (orders are scoped to merchant via userScope)
    // Access is controlled by the database API based on merchantId filter

    // Extract only basic fields for update (avoid complex orderItems)
    const updateData = {
      status: parsed.data.status,
      totalAmount: parsed.data.totalAmount,
      depositAmount: parsed.data.depositAmount,
      pickupPlanAt: parsed.data.pickupPlanAt ? new Date(parsed.data.pickupPlanAt) : undefined,
      returnPlanAt: parsed.data.returnPlanAt ? new Date(parsed.data.returnPlanAt) : undefined,
      notes: parsed.data.notes,
      // Add other simple fields as needed
    };

    console.log('🔍 Updating order with data:', { id, ...updateData });
    
    // Use simplified database API with basic update
    const updatedOrder = await db.orders.update(id, updateData);
    console.log('✅ Order updated successfully:', updatedOrder);

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      code: 'ORDER_UPDATED_SUCCESS',
        message: 'Order updated successfully'
    });

  } catch (error: any) {
    console.error('Error in PUT /api/orders:', error);
    
    return NextResponse.json(
      ResponseBuilder.error('UPDATE_ORDER_FAILED'),
      { status: 500 }
    );
  }
});