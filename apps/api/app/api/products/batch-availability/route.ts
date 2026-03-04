import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { ORDER_TYPE, ORDER_STATUS, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, formatFullName } from '@rentalshop/utils';
import { z } from 'zod';

// Validation schema for batch availability request
const batchAvailabilitySchema = z.object({
  // Support both formats: array of { productId, quantity } or legacy { productIds, quantity }
  products: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.coerce.number().min(1).default(1),
  })).min(1).max(100).optional(), // Max 100 products per request
  // Legacy format for backward compatibility
  productIds: z.array(z.number().int().positive()).min(1).max(100).optional(),
  quantity: z.coerce.number().min(1).optional(), // Only used if products array is not provided
  // Order type: RENT requires dates, SALE doesn't need dates
  orderType: z.enum(['RENT', 'SALE']).optional().default('RENT'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  // Support single date format (YYYY-MM-DD) for backward compatibility
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  // Support for more granular time-based checking
  includeTimePrecision: z.coerce.boolean().optional().default(true),
  timeZone: z.string().optional().default('UTC'),
  outletId: z.coerce.number().int().positive().optional(),
}).refine((data) => {
  // For RENT orders: Either 'date' or both 'startDate' and 'endDate' must be provided
  // For SALE orders: Dates are optional and will be ignored even if provided
  if (data.orderType === 'SALE') {
    return true; // SALE doesn't require dates, and dates will be ignored
  }
  const hasSingleDate = !!data.date;
  const hasRentalPeriod = !!(data.startDate && data.endDate);
  return hasSingleDate || hasRentalPeriod;
}, {
  message: "For RENT orders: Either 'date' or both 'startDate' and 'endDate' must be provided. For SALE orders, dates are optional and will be ignored."
}).refine((data) => {
  // Either 'products' array or 'productIds' array must be provided
  return !!(data.products && data.products.length > 0) || !!(data.productIds && data.productIds.length > 0);
}, {
  message: "Either 'products' array or 'productIds' array must be provided"
});

/**
 * POST /api/products/batch-availability
 * Check availability for multiple products at once
 * 
 * Use case: Cart with multiple products, user changes pickup/return dates,
 * need to check availability for all products simultaneously
 * 
 * Authorization: All roles with 'products.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * 
 * Request body:
 * - products: Array of { productId, quantity } objects (max 100 products) - NEW FORMAT
 * - productIds: Array of product IDs (legacy format, requires quantity field)
 * - orderType: 'RENT' or 'SALE' (default: 'RENT')
 * - startDate: ISO datetime string for rental start (required for RENT, optional for SALE)
 * - endDate: ISO datetime string for rental end (required for RENT, optional for SALE)
 * - date: Single date in YYYY-MM-DD format (optional, for backward compatibility, RENT only)
 * - quantity: Number of items requested per product (default: 1, only used with legacy productIds format)
 * - includeTimePrecision: Boolean to enable precise hour/minute checking (default: true)
 * - timeZone: Timezone for time calculations (default: "UTC")
 * - outletId: Optional outlet ID (required for merchants/admins)
 * 
 * For SALE orders:
 * - Dates are optional (not needed for stock check)
 * - Checks RESERVED orders (all) and PICKUPED orders with future pickup dates
 * - No date-based conflict analysis needed
 * 
 * Response includes:
 * - Array of availability results for each product
 * - Real-time stock availability across all outlets
 * - Hour-by-hour conflict analysis during rental period
 * - Detailed breakdown by outlet with precise timing
 */
export const POST = withPermissions(['products.view'], { requireActiveSubscription: false })(
  async (request, { user, userScope }) => {
    try {
      console.log('🔍 POST /api/products/batch-availability');

      const body = await request.json();
      
      // Validate request body
      const parsed = batchAvailabilitySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      const { 
        products: productsRequest, // New format: array of { productId, quantity }
        productIds, // Legacy format
        orderType = 'RENT', // Default to RENT for backward compatibility
        startDate, 
        endDate, 
        date, 
        quantity, // Legacy format: default quantity for all products
        includeTimePrecision, 
        timeZone,
        outletId: queryOutletId 
      } = parsed.data;

      // Normalize to products array format
      // If products array is provided, use it; otherwise convert productIds to products array
      const normalizedProducts = productsRequest || (productIds || []).map(id => ({
        productId: id,
        quantity: quantity || 1,
      }));

      // Extract productIds and create quantity map
      const productIdsList = normalizedProducts.map(p => p.productId);
      const quantityMap = new Map(normalizedProducts.map(p => [p.productId, p.quantity]));

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      const userOutletId = userScope.outletId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }

      // Determine outlet ID based on user role
      let finalOutletId: number;
      
      if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
        // Outlet users: use query outletId if provided, otherwise use their assigned outlet
        finalOutletId = queryOutletId || (userOutletId || 0);
      } else if (user.role === USER_ROLE.MERCHANT || user.role === USER_ROLE.ADMIN) {
        // Merchants/Admins: outletId is required in query
        if (!queryOutletId) {
          return NextResponse.json(
            ResponseBuilder.error('OUTLET_REQUIRED'),
            { status: 400 }
          );
        }
        finalOutletId = queryOutletId;
      } else {
        // Fallback for unknown roles
        return NextResponse.json(
          ResponseBuilder.error('INVALID_USER_ROLE'),
          { status: 400 }
        );
      }

      // Validate finalOutletId
      if (!finalOutletId || finalOutletId <= 0) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_OUTLET_ID'),
          { status: 400 }
        );
      }

      // Parse rental dates with timezone support (only for RENT orders)
      let rentalStart: Date | null = null;
      let rentalEnd: Date | null = null;
      let durationMs = 0;
      let durationHours = 0;
      let durationDays = 0;
      
      if (orderType === 'RENT') {
        // RENT orders require dates for conflict checking
        if (date) {
          // Single date mode - check availability for entire day
          rentalStart = new Date(date + 'T00:00:00.000Z');
          rentalEnd = new Date(date + 'T23:59:59.999Z');
        } else if (startDate && endDate) {
          // Date range mode - precise time checking
          rentalStart = new Date(startDate);
          rentalEnd = new Date(endDate);
        } else {
          return NextResponse.json(
            ResponseBuilder.error('DATE_REQUIRED'),
            { status: 400 }
          );
        }

        // Validate date range
        if (rentalStart > rentalEnd) {
          return NextResponse.json(
            ResponseBuilder.error('INVALID_RENTAL_DATES'),
            { status: 400 }
          );
        }

        // Calculate precise duration
        durationMs = rentalEnd.getTime() - rentalStart.getTime();
        durationHours = durationMs / (1000 * 60 * 60);
        durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
      }
      // SALE orders don't need dates - we check current stock and active orders

      // Fetch all products at once for better performance
      // Product.merchantId is Int (number), so we can use userMerchantId directly
      const products = await db.prisma.product.findMany({
        where: {
          id: { in: productIdsList },
          ...(user.role !== USER_ROLE.ADMIN && userMerchantId ? { merchantId: userMerchantId } : {}),
        },
        select: {
          id: true,
          name: true,
          merchantId: true,
        },
      });

      // Check if all products exist
      const foundProductIds = new Set(products.map(p => p.id));
      const missingProductIds = productIdsList.filter(id => !foundProductIds.has(id));
      
      if (missingProductIds.length > 0) {
        return NextResponse.json(
          ResponseBuilder.error('PRODUCTS_NOT_FOUND'),
          { status: 404 }
        );
      }

      // Verify all products belong to user's merchant scope (if not admin)
      if (user.role !== USER_ROLE.ADMIN && userMerchantId) {
        const invalidProducts = products.filter(
          p => p.merchantId !== userMerchantId
        );
        if (invalidProducts.length > 0) {
          return NextResponse.json(
            ResponseBuilder.error('PRODUCT_ACCESS_DENIED'),
            { status: 403 }
          );
        }
      }

      // Fetch all outlet stocks at once
      const outletStocks = await db.prisma.outletStock.findMany({
        where: {
          productId: { in: productIds },
          outletId: finalOutletId,
        },
        include: {
          outlet: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
      });

      // Create a map for quick lookup
      const outletStockMap = new Map(
        outletStocks.map(stock => [stock.productId, stock])
      );

      // Find all conflicting orders for all products at once
      // Different logic for RENT vs SALE orders
      const now = new Date();
      const whereClause: any = {
        outletId: finalOutletId,
        orderItems: {
          some: {
            productId: { in: productIdsList },
          },
        },
      };

      if (orderType === 'RENT') {
        // RENT orders: Check date-based conflicts
        whereClause.orderType = ORDER_TYPE.RENT as any;
        whereClause.status = {
          in: [ORDER_STATUS.RESERVED as any, ORDER_STATUS.PICKUPED as any],
        };
        whereClause.OR = [
          // Pickup during requested period
          {
            AND: [
              { pickupPlanAt: { lte: rentalEnd } },
              { pickupPlanAt: { gte: rentalStart } },
            ],
          },
          // Return during requested period
          {
            AND: [
              { returnPlanAt: { lte: rentalEnd } },
              { returnPlanAt: { gte: rentalStart } },
            ],
          },
          // Rental spans across requested period
          {
            AND: [
              { pickupPlanAt: { lte: rentalStart } },
              { returnPlanAt: { gte: rentalEnd } },
            ],
          },
        ];
      } else if (orderType === 'SALE') {
        // SALE orders: Check RESERVED and PICKUPED (future) orders
        // RESERVED: All reserved orders (regardless of date)
        // PICKUPED: Only future pickup orders (pickupPlanAt >= now)
        whereClause.orderType = ORDER_TYPE.SALE as any;
        whereClause.OR = [
          // All RESERVED orders
          {
            status: ORDER_STATUS.RESERVED as any,
          },
          // PICKUPED orders with future pickup date
          {
            AND: [
              { status: ORDER_STATUS.PICKUPED as any },
              { pickupPlanAt: { gte: now } },
            ],
          },
        ];
      }

      const conflictingOrders = await db.prisma.order.findMany({
        where: whereClause,
        include: {
          orderItems: {
            where: {
              productId: { in: productIdsList },
            },
            select: {
              productId: true,
              quantity: true,
              rentalDays: true,
            },
          },
          outlet: {
            select: {
              id: true,
              name: true,
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        orderBy: {
          pickupPlanAt: 'asc',
        },
      });

      // Group conflicts by product ID
      const conflictsByProduct = new Map<number, typeof conflictingOrders>();
      conflictingOrders.forEach(order => {
        order.orderItems.forEach((item: any) => {
          if (!conflictsByProduct.has(item.productId)) {
            conflictsByProduct.set(item.productId, []);
          }
          conflictsByProduct.get(item.productId)!.push(order);
        });
      });

      // Process each product
      const results = await Promise.all(
        normalizedProducts.map(async ({ productId, quantity: productQuantity }) => {
          const product = products.find(p => p.id === productId);
          if (!product) {
            return {
              productId,
              error: 'PRODUCT_NOT_FOUND',
            };
          }

          const outletStock = outletStockMap.get(productId);
          if (!outletStock) {
            return {
              productId,
              productName: product.name,
              error: 'PRODUCT_OUTLET_NOT_FOUND',
            };
          }

          // Get stock info
          const totalStock = outletStock.stock;
          const totalRenting = outletStock.renting;
          const totalAvailableStock = Math.max(0, totalStock - totalRenting);

          // Check basic stock availability using product-specific quantity
          const stockAvailable = totalAvailableStock >= productQuantity;

          // Get conflicts for this product
          const productConflicts = conflictsByProduct.get(productId) || [];
          
          // Calculate conflicts
          const outletConflicts = {
            outletId: finalOutletId,
            outletName: outletStock.outlet.name,
            conflictingQuantity: 0,
            conflicts: [] as Array<{
              orderNumber: string;
              customerName: string;
              pickupDate: string;
              returnDate: string;
              pickupDateLocal: string;
              returnDateLocal: string;
              quantity: number;
              conflictDuration: number;
              conflictHours: number;
              conflictType: 'pickup_overlap' | 'return_overlap' | 'period_overlap' | 'complete_overlap';
            }>,
          };

          productConflicts.forEach(order => {
            // Double-check that order belongs to the correct outlet
            if (order.outletId !== finalOutletId) {
              return;
            }

            // Validate order type and status based on request orderType
            if (orderType === 'RENT') {
              // RENT orders: Only count active rental orders
              if (order.orderType !== ORDER_TYPE.RENT || ![ORDER_STATUS.RESERVED, ORDER_STATUS.PICKUPED].includes(order.status as any)) {
                return;
              }
            } else if (orderType === 'SALE') {
              // SALE orders: Only count RESERVED and PICKUPED (future) orders
              if (order.orderType !== ORDER_TYPE.SALE || ![ORDER_STATUS.RESERVED, ORDER_STATUS.PICKUPED].includes(order.status as any)) {
                return;
              }
            }

            order.orderItems.forEach((item: any) => {
              // Only count items for the specific product
              if (item.productId === productId) {
                outletConflicts.conflictingQuantity += item.quantity;

                if (orderType === 'RENT' && rentalStart && rentalEnd) {
                  // RENT orders: Calculate precise conflict analysis
                  const orderPickup = order.pickupPlanAt;
                  const orderReturn = order.returnPlanAt;

                  if (orderPickup && orderReturn) {
                    // Determine conflict type and duration
                    let conflictType: 'pickup_overlap' | 'return_overlap' | 'period_overlap' | 'complete_overlap';
                    let conflictStart: Date;
                    let conflictEnd: Date;

                    if (orderPickup <= rentalStart && orderReturn >= rentalEnd) {
                      conflictType = 'complete_overlap';
                      conflictStart = rentalStart;
                      conflictEnd = rentalEnd;
                    } else if (orderPickup <= rentalStart && orderReturn > rentalStart) {
                      conflictType = 'period_overlap';
                      conflictStart = rentalStart;
                      conflictEnd = orderReturn;
                    } else if (orderPickup < rentalEnd && orderReturn >= rentalEnd) {
                      conflictType = 'period_overlap';
                      conflictStart = orderPickup;
                      conflictEnd = rentalEnd;
                    } else {
                      conflictType = 'complete_overlap';
                      conflictStart = orderPickup;
                      conflictEnd = orderReturn;
                    }

                    const conflictMs = conflictEnd.getTime() - conflictStart.getTime();
                    const conflictHours = conflictMs / (1000 * 60 * 60);

                    outletConflicts.conflicts.push({
                      orderNumber: order.orderNumber,
                      customerName: formatFullName(order.customer?.firstName, order.customer?.lastName) || '',
                      pickupDate: orderPickup.toISOString(),
                      returnDate: orderReturn.toISOString(),
                      pickupDateLocal: includeTimePrecision
                        ? orderPickup.toLocaleString('en-US', { timeZone, hour12: false })
                        : orderPickup.toLocaleDateString('en-US'),
                      returnDateLocal: includeTimePrecision
                        ? orderReturn.toLocaleString('en-US', { timeZone, hour12: false })
                        : orderReturn.toLocaleDateString('en-US'),
                      quantity: item.quantity,
                      conflictDuration: conflictMs,
                      conflictHours: Math.round(conflictHours * 100) / 100,
                      conflictType,
                    });
                  }
                } else if (orderType === 'SALE') {
                  // SALE orders: Simple conflict info (no date-based analysis needed)
                  const orderPickup = order.pickupPlanAt;
                  outletConflicts.conflicts.push({
                    orderNumber: order.orderNumber,
                    customerName: formatFullName(order.customer?.firstName, order.customer?.lastName) || '',
                    pickupDate: orderPickup?.toISOString() || '',
                    returnDate: '', // SALE orders don't have return date
                    pickupDateLocal: orderPickup
                      ? (includeTimePrecision
                          ? orderPickup.toLocaleString('en-US', { timeZone, hour12: false })
                          : orderPickup.toLocaleDateString('en-US'))
                      : 'N/A',
                    returnDateLocal: 'N/A',
                    quantity: item.quantity,
                    conflictDuration: 0,
                    conflictHours: 0,
                    conflictType: 'complete_overlap', // All SALE conflicts are complete (no date range)
                  });
                }
              }
            });
          });

          // Calculate final availability using product-specific quantity
          const conflictingQuantity = outletConflicts.conflictingQuantity;
          const effectivelyAvailable = Math.max(0, totalAvailableStock - conflictingQuantity);
          const canFulfillRequest = effectivelyAvailable >= productQuantity;
          const isAvailable = canFulfillRequest;

          return {
            productId,
            productName: product.name,
            totalStock,
            totalAvailableStock,
            totalRenting,
            requestedQuantity: productQuantity,
            // Only include rentalPeriod for RENT orders
            ...(orderType === 'RENT' && rentalStart && rentalEnd ? {
              rentalPeriod: {
                startDate: rentalStart.toISOString(),
                endDate: rentalEnd.toISOString(),
                startDateLocal: includeTimePrecision
                  ? rentalStart.toLocaleString('en-US', { timeZone, hour12: false })
                  : rentalStart.toLocaleDateString('en-US'),
                endDateLocal: includeTimePrecision
                  ? rentalEnd.toLocaleString('en-US', { timeZone, hour12: false })
                  : rentalEnd.toLocaleDateString('en-US'),
                durationMs,
                durationHours: Math.round(durationHours * 100) / 100,
                durationDays,
                timeZone,
                includeTimePrecision,
              },
            } : {}),
            isAvailable,
            stockAvailable,
            hasNoConflicts: productConflicts.length === 0,
            availabilityByOutlet: [{
              outletId: outletStock.outlet.id,
              outletName: outletStock.outlet.name,
              stock: outletStock.stock,
              available: outletStock.available,
              renting: outletStock.renting,
              conflictingQuantity,
              effectivelyAvailable,
              canFulfillRequest,
              conflicts: outletConflicts.conflicts,
            }],
            bestOutlet: {
              outletId: outletStock.outlet.id,
              outletName: outletStock.outlet.name,
              effectivelyAvailable: effectivelyAvailable,
            },
            totalConflictsFound: outletConflicts.conflicts.length,
            message: orderType === 'RENT' && rentalStart && rentalEnd
              ? (isAvailable
                  ? includeTimePrecision
                    ? `Available for rental from ${rentalStart.toLocaleString('en-US', { timeZone, hour12: false })} to ${rentalEnd.toLocaleString('en-US', { timeZone, hour12: false })} (${Math.round(durationHours * 100) / 100} hours)`
                    : `Available for rental from ${rentalStart.toLocaleDateString()} to ${rentalEnd.toLocaleDateString()} (${durationDays} days)`
                  : stockAvailable
                  ? `Stock available but conflicts during requested period ${includeTimePrecision ? `(${Math.round(durationHours * 100) / 100} hours)` : `(${durationDays} days)`}`
                  : `Insufficient stock: need ${productQuantity}, have ${totalAvailableStock}`)
              : (isAvailable
                  ? `Available: ${effectivelyAvailable} units in stock`
                  : stockAvailable
                  ? `Stock available but ${conflictingQuantity} units reserved/picked up`
                  : `Insufficient stock: need ${productQuantity}, have ${totalAvailableStock}`),
          };
        })
      );

      return NextResponse.json(
        ResponseBuilder.success('BATCH_AVAILABILITY_CHECKED', {
          results,
          summary: {
            totalProducts: normalizedProducts.length,
            availableProducts: results.filter(r => !r.error && 'isAvailable' in r && r.isAvailable).length,
            unavailableProducts: results.filter(r => !r.error && 'isAvailable' in r && !r.isAvailable).length,
            errorProducts: results.filter(r => !!r.error).length,
          },
          // Only include rentalPeriod for RENT orders
          ...(orderType === 'RENT' && rentalStart && rentalEnd ? {
            rentalPeriod: {
              startDate: rentalStart.toISOString(),
              endDate: rentalEnd.toISOString(),
              durationMs,
              durationHours: Math.round(durationHours * 100) / 100,
              durationDays,
            },
          } : {}),
        })
      );

    } catch (error: any) {
      console.error('Error in POST /api/products/batch-availability:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);
