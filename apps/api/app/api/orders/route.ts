import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, ordersQuerySchema, orderCreateSchema, orderUpdateSchema, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/orders
 * Get orders with filtering, pagination
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withManagementAuth(async (request, { user }) => {
  console.log(`🔍 GET /api/orders - User: ${user.email} (${user.role})`);
  
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;
    
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
      merchantId: queryMerchantId, // Ignore in multi-tenant
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
      queryOutletId, customerId, productId, startDate, endDate,
      sortBy, sortOrder
    });
    
    // Build where clause - NO merchantId needed, DB is isolated
    const where: any = {};
    
    // Outlet filtering
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      where.outletId = user.outletId;
    } else if (queryOutletId && user.role === 'MERCHANT') {
      where.outletId = queryOutletId;
    }
    
    // Status filtering
    if (status) {
      where.status = status;
    }
    
    // Order type filtering
    if (orderType) {
      where.orderType = orderType;
    }
    
    // Customer filtering
    if (customerId) {
      where.customerId = customerId;
    }
    
    // Product filtering
    if (productId) {
      where.orderItems = {
        some: {
          productId: productId
        }
      };
    }
    
    // Date filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    // Search functionality
    if (q) {
      const searchTerm = q.trim();
      where.OR = [
        { orderNumber: { contains: searchTerm, mode: 'insensitive' } },
        { customer: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
        { customer: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
        { customer: { phone: { contains: searchTerm, mode: 'insensitive' } } }
      ];
    }
    
    // Pagination
    const pageNum = page || 1;
    const limitNum = limit || 20;
    const offset = (pageNum - 1) * limitNum;
    
    console.log(`🔍 Querying with where clause:`, where);
    
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          outlet: {
            select: {
              id: true,
              name: true
            }
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        take: limitNum,
        skip: offset
      }),
      db.order.count({ where })
    ]);
    
    console.log('✅ Search completed, found:', orders.length, 'orders');

    return NextResponse.json({
      success: true,
      data: {
        orders: orders,
        total: total,
        page: pageNum,
        limit: limitNum,
        offset: offset,
        hasMore: pageNum * limitNum < total,
        totalPages: Math.ceil(total / limitNum)
      },
      code: "ORDERS_FOUND",
      message: `Found ${total} orders`
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
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const POST = withManagementAuth(async (request, { user }) => {
  console.log(`🔍 POST /api/orders - User: ${user.email} (${user.role})`);
  
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;
    
    const body = await request.json();
    const parsed = orderCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    // Get outlet to verify it exists
    const outlet = await db.outlet.findUnique({
      where: { id: parsed.data.outletId }
    });
    if (!outlet) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_NOT_FOUND'),
        { status: 404 }
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
          const product = await db.product.findUnique({
            where: { id: item.productId }
          });
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
            productImages: (product.images as any) || null,
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
    
    // Create order using Prisma
    const order = await db.order.create({
      data: orderData,
      include: {
        customer: true,
        outlet: true,
        createdBy: true,
        orderItems: {
          include: { product: true }
        },
        payments: true
      }
    });
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
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const PUT = withManagementAuth(async (request, { user }) => {
  console.log(`🔍 PUT /api/orders - User: ${user.email} (${user.role})`);
  
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;
    
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
    const existingOrder = await db.order.findUnique({
      where: { id }
    });
    if (!existingOrder) {
      return NextResponse.json(
        ResponseBuilder.error('ORDER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Extract only basic fields for update (avoid complex orderItems)
    const updateData: any = {};
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.totalAmount !== undefined) updateData.totalAmount = parsed.data.totalAmount;
    if (parsed.data.depositAmount !== undefined) updateData.depositAmount = parsed.data.depositAmount;
    if (parsed.data.pickupPlanAt !== undefined) updateData.pickupPlanAt = parsed.data.pickupPlanAt ? new Date(parsed.data.pickupPlanAt) : null;
    if (parsed.data.returnPlanAt !== undefined) updateData.returnPlanAt = parsed.data.returnPlanAt ? new Date(parsed.data.returnPlanAt) : null;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    console.log('🔍 Updating order with data:', { id, ...updateData });
    
    // Update order using Prisma
    const updatedOrder = await db.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        outlet: true,
        createdBy: true,
        orderItems: {
          include: { product: true }
        },
        payments: true
      }
    });
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