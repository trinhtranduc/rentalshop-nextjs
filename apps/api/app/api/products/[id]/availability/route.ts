import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ORDER_TYPE, ORDER_STATUS, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, formatFullName } from '@rentalshop/utils';
import { z } from 'zod';

// Validation schema for availability query
const availabilityQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  // Support single date format (YYYY-MM-DD) for backward compatibility
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  quantity: z.coerce.number().min(1).default(1),
  // Support for more granular time-based checking
  includeTimePrecision: z.coerce.boolean().optional().default(true),
  timeZone: z.string().optional().default('UTC'), // Support timezone for proper time comparison
});

/**
 * GET /api/products/[id]/availability
 * Check product availability and booking conflicts with precise time-based checking
 * 
 * Authorization: All roles with 'products.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * 
 * Query parameters:
 * - startDate: ISO datetime string for rental start (e.g., "2024-01-15T09:30:00Z")
 * - endDate: ISO datetime string for rental end (e.g., "2024-01-20T17:00:00Z")
 * - quantity: Number of items requested (default: 1)
 * - includeTimePrecision: Boolean to enable precise hour/minute checking (default: true)
 * - timeZone: Timezone for time calculations (default: "UTC")
 * 
 * Response includes:
 * - Real-time stock availability across all outlets
 * - Hour-by-hour conflict analysis during rental period
 * - Detailed breakdown by outlet with precise timing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  return withPermissions(['products.view'], { requireActiveSubscription: false })(async (request, { user, userScope }) => {
    try {
      console.log('🔍 GET /api/products/[id]/availability - Product ID:', id);

      // Validate product ID format
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const productId = parseInt(id);
      const { searchParams } = new URL(request.url);
      const query = Object.fromEntries(searchParams.entries());

      // Validate query parameters
      const parsedQuery = availabilityQuerySchema.safeParse(query);
      if (!parsedQuery.success) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_QUERY_PARAMETERS'),
          { status: 400 }
        );
      }

      const { startDate, endDate, date, quantity, includeTimePrecision, timeZone } = parsedQuery.data;

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
      const { outletId } = query;
      
      if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
        // Outlet users: use query outletId if provided, otherwise use their assigned outlet
        finalOutletId = outletId ? parseInt(outletId) : (userOutletId || 0);
      } else if (user.role === USER_ROLE.MERCHANT || user.role === USER_ROLE.ADMIN) {
        // Merchants/Admins: outletId is required in query
        if (!outletId) {
          return NextResponse.json(
            ResponseBuilder.error('OUTLET_REQUIRED'),
            { status: 400 }
          );
        }
        finalOutletId = parseInt(outletId);
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

      // 1. Check if product exists and get basic info
      const product = await db.products.findById(productId);
      if (!product) {
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_NOT_FOUND'),
          { status: 404 }
        );
      }

      // Verify product belongs to user's merchant scope
      // Use product.merchant.id (public ID) for comparison, not product.merchantId (CUID)
      const productMerchantId = product.merchant?.id;
      if (user.role !== USER_ROLE.ADMIN && productMerchantId !== userMerchantId) {
        console.log('❌ Product does not belong to user\'s merchant:', {
          productMerchantId: productMerchantId,
          userMerchantId: userMerchantId
        });
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_ACCESS_DENIED'),
          { status: 403 }
        );
      }

      // 2. Get current stock availability from specific outlet
      const outletStock = await db.prisma.outletStock.findFirst({
        where: {
          productId: productId,
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

      if (!outletStock) {
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_OUTLET_NOT_FOUND'),
          { status: 404 }
        );
      }

      // Get stock info for single outlet
      const totalStock = outletStock.stock;
      const totalRenting = outletStock.renting;
      
      // Calculate available from actual orders (more accurate than OutletStock.available)
      // For RENT: available = stock - renting (temporary)
      // For SALE: available = stock - sold (permanent, but we track via stock directly)
      // Since we're checking availability for a potential RENT order, use: available = stock - renting
      const totalAvailableStock = Math.max(0, totalStock - totalRenting);

      console.log('🔍 Stock summary:', {
        totalStock,
        totalAvailableStock,
        totalRenting,
        requestedQuantity: quantity,
        outletId: finalOutletId,
        productId: productId,
        note: 'Available calculated from stock - renting (for RENT orders)',
      });

      // 3. Check basic stock availability
      const stockAvailable = totalAvailableStock >= quantity;
      
      // If no rental dates provided, return basic stock info
      if (!date && (!startDate || !endDate)) {
        return NextResponse.json(
          ResponseBuilder.success('AVAILABILITY_CHECKED', {
            productId,
            productName: product.name,
            totalStock,
            totalAvailableStock,
            totalRenting,
            requestedQuantity: quantity,
            isAvailable: stockAvailable,
            availabilityByOutlet: [{
              outletId: outletStock.outlet.id,
              outletName: outletStock.outlet.name,
              stock: outletStock.stock,
              available: outletStock.available,
              renting: outletStock.renting,
            }],
            conflicts: [],
            message: stockAvailable 
              ? `Available: ${totalAvailableStock} units` 
              : `Insufficient stock: need ${quantity}, have ${totalAvailableStock}`,
          })
        );
      }

      // 4. Parse rental dates with timezone support and precise time checking
      let rentalStart: Date;
      let rentalEnd: Date;
      
      if (date) {
        // Single date mode - check availability for entire day
        rentalStart = new Date(date + 'T00:00:00.000Z');
        rentalEnd = new Date(date + 'T23:59:59.999Z');
      } else if (startDate && endDate) {
        // Date range mode - precise time checking
        rentalStart = new Date(startDate);
        rentalEnd = new Date(endDate);
      } else {
        // No dates provided - return basic stock info
        rentalStart = new Date();
        rentalEnd = new Date();
      }

      // Validate date range
      // Allow same-day rentals (rentalStart === rentalEnd is OK)
      // Only reject if return date is before pickup date
      if (rentalStart > rentalEnd) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_RENTAL_DATES'),
          { status: 400 }
        );
      }

      // Calculate precise duration
      const durationMs = rentalEnd.getTime() - rentalStart.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
      
      console.log('🔍 Rental period analysis:', {
        start: rentalStart.toISOString(),
        end: rentalEnd.toISOString(),
        durationHours: Math.round(durationHours * 100) / 100,
        durationDays,
        timeZone,
        includeTimePrecision
      });

      // 5. Find existing orders that overlap with the requested rental period
      // IMPORTANT: Only check RENT orders for conflicts (SALE orders don't affect availability for rentals)
      // This checks for orders where:
      // - Order items contain this product
      // - Order is a RENT type (not SALE - SALE orders permanently reduce stock, not renting)
      // - Order status indicates it's active (RESERVED, PICKUPED)
      // - Rental period overlaps with requested period
      // - Order belongs to the SPECIFIC outlet (not all merchant outlets)
      
      const conflictingOrders = await db.prisma.order.findMany({
        where: {
          orderType: ORDER_TYPE.RENT as any, // Only RENT orders affect rental availability
          status: {
            in: [ORDER_STATUS.RESERVED as any, ORDER_STATUS.PICKUPED as any] // Active rental orders
          },
          // CRITICAL FIX: Filter by specific outlet, not all merchant outlets
          outletId: finalOutletId,
          OR: [
            // Pickup during requested period
            {
              AND: [
                { pickupPlanAt: { lte: rentalEnd } },
                { pickupPlanAt: { gte: rentalStart } }
              ]
            },
            // Return during requested period  
            {
              AND: [
                { returnPlanAt: { lte: rentalEnd } },
                { returnPlanAt: { gte: rentalStart } }
              ]
            },
            // Rental spans across requested period
            {
              AND: [
                { pickupPlanAt: { lte: rentalStart } },
                { returnPlanAt: { gte: rentalEnd } }
              ]
            }
          ],
          orderItems: {
            some: {
              productId: productId,
            }
          }
        },
        include: {
          orderItems: {
            where: {
              productId: productId,
            },
            select: {
              quantity: true,
              rentalDays: true,
            }
          },
          outlet: {
            select: {
              id: true,
              name: true,
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            }
          }
        },
        orderBy: {
          pickupPlanAt: 'asc'
        }
      });

      // 6. Calculate conflicts for single outlet with precise time analysis
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
          conflictDuration: number; // in milliseconds
          conflictHours: number;
          conflictType: 'pickup_overlap' | 'return_overlap' | 'period_overlap' | 'complete_overlap';
        }>
      };

      // CRITICAL FIX: Only count orders from the specific outlet and validate order status
      conflictingOrders.forEach(order => {
        // Double-check that order belongs to the correct outlet
        if (order.outletId !== finalOutletId) {
          console.warn(`Order ${order.orderNumber} belongs to outlet ${order.outletId}, expected ${finalOutletId}`);
          return; // Skip this order
        }
        
        // Only count active rental orders
        if (order.orderType !== ORDER_TYPE.RENT || ![ORDER_STATUS.RESERVED, ORDER_STATUS.PICKUPED].includes(order.status as any)) {
          console.warn(`Order ${order.orderNumber} is not an active rental order (type: ${order.orderType}, status: ${order.status})`);
          return; // Skip this order
        }
        
        order.orderItems.forEach((item: any) => {
          // Only count items for the specific product
          if (item.productId === productId) {
            outletConflicts.conflictingQuantity += item.quantity;
            
            // Calculate precise conflict analysis if time precision is enabled
            const orderPickup = order.pickupPlanAt;
            const orderReturn = order.returnPlanAt;
            
            if (orderPickup && orderReturn) {
              // Determine conflict type and duration
              let conflictType: 'pickup_overlap' | 'return_overlap' | 'period_overlap' | 'complete_overlap';
              let conflictStart: Date;
              let conflictEnd: Date;
              
              if (orderPickup <= rentalStart && orderReturn >= rentalEnd) {
                // Order completely encompasses requested period
                conflictType = 'complete_overlap';
                conflictStart = rentalStart;
                conflictEnd = rentalEnd;
              } else if (orderPickup <= rentalStart && orderReturn > rentalStart) {
                // Order starts before and ends during requested period
                conflictType = 'period_overlap';
                conflictStart = rentalStart;
                conflictEnd = orderReturn;
              } else if (orderPickup < rentalEnd && orderReturn >= rentalEnd) {
                // Order starts during and ends after requested period
                conflictType = 'period_overlap';
                conflictStart = orderPickup;
                conflictEnd = rentalEnd;
              } else {
                // Order is completely within requested period
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
            } else {
              // Fallback for orders without precise times
              outletConflicts.conflicts.push({
                orderNumber: order.orderNumber,
                customerName: formatFullName(order.customer?.firstName, order.customer?.lastName) || '',
                pickupDate: orderPickup?.toISOString() || '',
                returnDate: orderReturn?.toISOString() || '',
                pickupDateLocal: orderPickup ? 
                  (includeTimePrecision 
                    ? orderPickup.toLocaleString('en-US', { timeZone, hour12: false })
                    : orderPickup.toLocaleDateString('en-US'))
                  : 'Unknown',
                returnDateLocal: orderReturn ? 
                  (includeTimePrecision 
                    ? orderReturn.toLocaleString('en-US', { timeZone, hour12: false })
                    : orderReturn.toLocaleDateString('en-US'))
                  : 'Unknown',
                quantity: item.quantity,
                conflictDuration: 0,
                conflictHours: 0,
                conflictType: 'complete_overlap',
              });
            }
          }
        });
      });

      // 7. Determine final availability considering conflicts for single outlet
      const conflictingQuantity = outletConflicts.conflictingQuantity;
      
      // Calculate available quantity considering conflicts during rental period
      // Available = stock - renting (from OutletStock) - conflicts (from active RENT orders)
      // This ensures we account for both:
      // 1. Items currently rented (renting field)
      // 2. Items reserved/picked up during the requested period (conflicts)
      const effectivelyAvailable = Math.max(0, totalAvailableStock - conflictingQuantity);
      const canFulfillRequest = effectivelyAvailable >= quantity;

      // Enhanced logging for debugging rental calculation
      console.log('🔍 Rental calculation summary:', {
        outletId: finalOutletId,
        productId: productId,
        totalStock,
        totalAvailableStock,
        totalRenting,
        conflictingQuantity,
        effectivelyAvailable,
        requestedQuantity: quantity,
        canFulfillRequest,
        conflictingOrdersCount: conflictingOrders.length,
        conflictsDetails: outletConflicts.conflicts.map(c => ({
          orderNumber: c.orderNumber,
          quantity: c.quantity,
          conflictType: c.conflictType
        }))
      });

      const availabilityResult = {
        outletId: outletStock.outlet.id,
        outletName: outletStock.outlet.name,
        stock: outletStock.stock,
        available: outletStock.available,
        renting: outletStock.renting,
        conflictingQuantity,
        effectivelyAvailable,
        canFulfillRequest,
        conflicts: outletConflicts.conflicts,
      };

      // Overall availability - canFulfillRequest is the authoritative source
      // It already accounts for stock, conflicts, and requested quantity
      const isAvailable = canFulfillRequest;

      return NextResponse.json(
        ResponseBuilder.success('AVAILABILITY_CHECKED', {
          productId,
          productName: product.name,
          totalStock,
          totalAvailableStock,
          totalRenting,
          requestedQuantity: quantity,
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
          // Simplified: isAvailable = canFulfillRequest (already accounts for stock and conflicts)
          isAvailable,
          // Keep stockAvailable for backward compatibility and informational purposes
          stockAvailable,
          hasNoConflicts: conflictingOrders.length === 0,
          availabilityByOutlet: [availabilityResult],
          bestOutlet: {
            outletId: availabilityResult.outletId,
            outletName: availabilityResult.outletName,
            effectivelyAvailable: availabilityResult.effectivelyAvailable,
          },
          totalConflictsFound: outletConflicts.conflicts.length,
          // Enhanced message with time precision
          message: isAvailable
            ? includeTimePrecision
              ? `Available for rental from ${rentalStart.toLocaleString('en-US', { timeZone, hour12: false })} to ${rentalEnd.toLocaleString('en-US', { timeZone, hour12: false })} (${Math.round(durationHours * 100) / 100} hours)`
              : `Available for rental from ${rentalStart.toLocaleDateString()} to ${rentalEnd.toLocaleDateString()} (${durationDays} days)`
            : stockAvailable
            ? `Stock available but conflicts during requested period ${includeTimePrecision ? `(${Math.round(durationHours * 100) / 100} hours)` : `(${durationDays} days)`}`
            : `Insufficient stock: need ${quantity}, have ${totalAvailableStock}`,
        })
      );

    } catch (error: any) {
      console.error('Error in GET /api/products/[id]/availability:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
