import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { ORDER_STATUS, ORDER_TYPE, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, formatFullName, parseProductImages } from '@rentalshop/utils';
import { z } from 'zod';

// Validation schema for product availability query
// Support both single date (backward compatibility) and rental period (pickupDate/returnDate)
const productAvailabilitySchema = z.object({
  productId: z.coerce.number().int().positive('Product ID must be a positive integer'),
  // Single date mode (backward compatibility)
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  // Rental period mode (preferred for rental orders)
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pickup date must be in YYYY-MM-DD format').optional(),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Return date must be in YYYY-MM-DD format').optional(),
  outletId: z.coerce.number().int().positive().optional() // Required for merchants, auto-filled for outlet users
}).refine((data) => {
  // Either 'date' or both 'pickupDate' and 'returnDate' must be provided
  const hasSingleDate = !!data.date;
  const hasRentalPeriod = !!(data.pickupDate && data.returnDate);
  return hasSingleDate || hasRentalPeriod;
}, {
  message: "Either 'date' or both 'pickupDate' and 'returnDate' must be provided"
});

/**
 * GET /api/products/availability
 * Check product availability for a specific date or rental period
 * Returns product summary (stock, rented, available) and orders for that date/period
 * 
 * Authorization: All roles with 'products.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * - No subscription required (read-only operation)
 * 
 * Query parameters:
 * - productId: Product ID to check availability for
 * - date: Date to check availability (YYYY-MM-DD format) - single date mode
 * - pickupDate: Pickup date for rental period (YYYY-MM-DD format) - rental period mode
 * - returnDate: Return date for rental period (YYYY-MM-DD format) - rental period mode
 * - outletId: Optional outlet ID (required for outlet users)
 * 
 * Response includes:
 * - Product information
 * - Stock summary (total, rented, available)
 * - Orders for the target date/period
 * - Availability status
 */
export const GET = withPermissions(['products.view'], { requireActiveSubscription: false })(
  async (request, { user, userScope }) => {
    try {
      const { searchParams } = new URL(request.url);
      console.log('Product availability params:', Object.fromEntries(searchParams.entries()));
      
      const parsed = productAvailabilitySchema.safeParse(Object.fromEntries(searchParams.entries()));
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      const { productId, date, pickupDate, returnDate, outletId: queryOutletId } = parsed.data;
      
      // Determine date range: either single date or rental period
      let startDate: Date;
      let endDate: Date;
      let dateString: string;
      
      if (date) {
        // Single date mode (backward compatibility)
        dateString = date;
        startDate = new Date(date + 'T00:00:00.000Z');
        endDate = new Date(date + 'T23:59:59.999Z');
      } else if (pickupDate && returnDate) {
        // Rental period mode
        dateString = `${pickupDate} to ${returnDate}`;
        startDate = new Date(pickupDate + 'T00:00:00.000Z');
        endDate = new Date(returnDate + 'T23:59:59.999Z');
        
        // Validate rental period: return date must be >= pickup date
        if (startDate > endDate) {
          return NextResponse.json(
            ResponseBuilder.error('INVALID_RENTAL_DATES'),
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          ResponseBuilder.error('DATE_REQUIRED'),
          { status: 400 }
        );
      }
      
      // Validate dates are not in the past (normalize to UTC for comparison)
      // Get today's date in UTC (YYYY-MM-DD format)
      const now = new Date();
      const todayUTCString = now.toISOString().split('T')[0]; // e.g., "2026-02-27"
      const todayUTC = new Date(todayUTCString + 'T00:00:00.000Z');
      
      // Normalize startDate to UTC midnight for comparison
      const startDateUTC = new Date(startDate);
      startDateUTC.setUTCHours(0, 0, 0, 0);
      
      if (startDateUTC < todayUTC) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_DATE'),
          { status: 400 }
        );
      }

      // Role-based outlet filtering
      let finalOutletId = queryOutletId;
      
      if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
        // Outlet users: use query outletId if provided, otherwise use their assigned outlet
        finalOutletId = queryOutletId || userScope.outletId;
      } else if (user.role === USER_ROLE.MERCHANT) {
        // Merchants: outletId is required
        if (!queryOutletId) {
          return NextResponse.json(
            ResponseBuilder.error('OUTLET_REQUIRED'),
            { status: 400 }
          );
        }
        finalOutletId = queryOutletId;
      } else if (user.role === USER_ROLE.ADMIN) {
        // Admins: outletId is required
        if (!queryOutletId) {
          return NextResponse.json(
            ResponseBuilder.error('OUTLET_REQUIRED'),
            { status: 400 }
          );
        }
        finalOutletId = queryOutletId;
      }

      // Get product information
      const product = await db.products.findById(productId);
      if (!product) {
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_NOT_FOUND'),
          { status: 404 }
        );
      }

      // Check if product exists in the outlet
      const outletStock = await db.prisma.outletStock.findFirst({
        where: {
          productId: productId,
          outletId: finalOutletId
        }
      });

      if (!outletStock) {
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_OUTLET_NOT_FOUND'),
          { status: 404 }
        );
      }

      // Normalize date range to UTC for comparison
      const startOfPeriod = new Date(startDate);
      startOfPeriod.setUTCHours(0, 0, 0, 0);
      
      const endOfPeriod = new Date(endDate);
      endOfPeriod.setUTCHours(23, 59, 59, 999);

      // Get orders that have this product and overlap with the target date
      // CRITICAL FIX: Ensure we only get orders from the specific outlet
      // Get ALL orders for this product in the specific outlet (no date filtering)
      let allOrders;
      try {
        allOrders = await db.prisma.order.findMany({
        where: {
          outletId: finalOutletId,
          orderType: {
            in: [ORDER_TYPE.RENT as any, ORDER_TYPE.SALE as any] // Include both RENT and SALE orders
          },
          orderItems: {
            some: {
              productId: productId
            }
          }
        },
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
              name: true,
              merchant: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          orderItems: {
            where: {
              productId: productId
            },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                  images: true,
                  rentPrice: true,
                  deposit: true
                }
              }
            }
          },
          _count: {
            select: {
              payments: true
            }
          }
        },
        orderBy: {
          pickupPlanAt: 'asc'
        }
        });
      } catch (queryError: any) {
        console.error('Database query error in product availability:', {
          error: queryError,
          productId,
          outletId: finalOutletId,
          errorName: queryError?.name,
          errorMessage: queryError?.message,
          errorCode: queryError?.code,
          errorMeta: queryError?.meta
        });
        throw queryError; // Re-throw to be caught by outer catch block
      }

      // Helper function: Check if order overlaps with requested rental period
      const isOrderActiveInPeriod = (order: any) => {
        const status = order.status;
        
        // Only check RENT orders for rental availability
        if (order.orderType !== ORDER_TYPE.RENT) {
          // For SALE orders, only check if they're RESERVED (not yet completed)
          return status === ORDER_STATUS.RESERVED;
        }
        
        // Get order's rental period
        const orderPickup = order.pickupPlanAt ? new Date(order.pickupPlanAt) : null;
        const orderReturn = order.returnPlanAt ? new Date(order.returnPlanAt) : null;
        
        if (!orderPickup) return false; // No pickup date = not active
        
        // Normalize order dates to UTC
        const orderPickupStart = new Date(orderPickup);
        orderPickupStart.setUTCHours(0, 0, 0, 0);
        
        const orderReturnEnd = orderReturn ? new Date(orderReturn) : null;
        if (orderReturnEnd) {
          orderReturnEnd.setUTCHours(23, 59, 59, 999);
        }
        
        // Check overlap: orders overlap if their rental periods intersect
        // Order is active if:
        // 1. Order pickup is within requested period, OR
        // 2. Order return is within requested period, OR
        // 3. Order spans across requested period (pickup before start, return after end)
        
        if (status === ORDER_STATUS.PICKUPED) {
          // Currently rented: active if return date hasn't passed start of requested period
          if (!orderReturnEnd) return true; // No return date = still active
          return orderReturnEnd >= startOfPeriod;
        }
        
        if (status === ORDER_STATUS.RESERVED) {
          // Reserved: active if rental period overlaps with requested period
          const hasOverlap = 
            (orderPickupStart <= endOfPeriod && (!orderReturnEnd || orderReturnEnd >= startOfPeriod));
          return hasOverlap;
        }
        
        if (status === ORDER_STATUS.RETURNED) {
          // Returned: was active if rental period overlapped with requested period
          if (!orderReturnEnd) return false;
          return orderPickupStart <= endOfPeriod && orderReturnEnd >= startOfPeriod;
        }
        
        return false;
      };
      
      const activeOrders = allOrders.filter(isOrderActiveInPeriod);

      // Helper function: Calculate quantity for each order status
      const calculateQuantities = () => {
        let totalRented = 0;
        let totalReserved = 0;

        activeOrders.forEach((order: any) => {
        order.orderItems.forEach((item: any) => {
            if (item.productId !== productId) return;

            // RENT orders: PICKUPED = rented, RESERVED = reserved
            if (order.orderType === ORDER_TYPE.RENT) {
              if (order.status === ORDER_STATUS.PICKUPED) {
                totalRented += item.quantity;
              } else if (order.status === ORDER_STATUS.RESERVED) {
                totalReserved += item.quantity;
              }
            }
            
            // SALE orders: Only RESERVED counts (COMPLETED/PICKUPED already reduced stock)
            if (order.orderType === ORDER_TYPE.SALE && order.status === ORDER_STATUS.RESERVED) {
                totalReserved += item.quantity;
          }
        });
      });

        return { totalRented, totalReserved };
      };

      const totalStock = outletStock.stock;
      const { totalRented, totalReserved } = calculateQuantities();
      const totalAvailable = Math.max(0, totalStock - totalRented - totalReserved);

      // Format response
      const response = {
        product: {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          outletId: finalOutletId,
          outletName: 'Outlet' // We'll get this from outletStock if needed
        },
        date: dateString,
        summary: {
          totalStock: totalStock,
          totalRented: totalRented,
          totalReserved: totalReserved,
          totalAvailable: Math.max(0, totalAvailable),
          isAvailable: totalAvailable > 0
        },
      orders: allOrders.map((order: any) => {
        // Filter order items for this specific product
        const productItems = order.orderItems.filter((item: any) => item.productId === productId);
        
        return {
          // Basic order info
          id: order.id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          status: order.status,
          totalAmount: order.totalAmount,
          depositAmount: order.depositAmount,
          securityDeposit: order.securityDeposit || 0,
          damageFee: order.damageFee || 0,
          lateFee: order.lateFee || 0,
          discountType: order.discountType || null,
          discountValue: order.discountValue || 0,
          discountAmount: order.discountAmount || 0,
          
            // Flatten dates - normalize to UTC ISO strings using toISOString()
            pickupPlanAt: order.pickupPlanAt?.toISOString() || null,
            returnPlanAt: order.returnPlanAt?.toISOString() || null,
            pickedUpAt: order.pickedUpAt?.toISOString() || null,
            returnedAt: order.returnedAt?.toISOString() || null,
            createdAt: order.createdAt?.toISOString() || null,
            updatedAt: order.updatedAt?.toISOString() || null,
          
          // Rental info
          rentalDuration: order.rentalDuration || null,
          isReadyToDeliver: order.isReadyToDeliver || false,
          collateralType: order.collateralType || null,
          collateralDetails: order.collateralDetails || null,
          
          // Notes
          notes: order.notes || '',
          pickupNotes: order.pickupNotes || null,
          returnNotes: order.returnNotes || null,
          damageNotes: order.damageNotes || '',
          
          // Flatten outlet info
          outletId: order.outletId,
          outletName: order.outlet?.name || 'Unknown Outlet',
          
          // Flatten customer info
          customerId: order.customerId,
          customerName: order.customer ? formatFullName(order.customer.firstName, order.customer.lastName) || 'Unknown' : 'Unknown',
          customerPhone: order.customer?.phone || null,
          customerEmail: order.customer?.email || null,
          
          // Flatten merchant info
          merchantId: order.outlet?.merchant?.id || null,
          merchantName: order.outlet?.merchant?.name || 'Unknown Merchant',
          
          // Created by info
          createdById: order.createdById || null,
          createdByName: order.createdBy ? formatFullName(order.createdBy.firstName, order.createdBy.lastName) : null,
          
          // Order items (only for this product)
          orderItems: productItems.map((item: any) => {
            // ✅ Use shared parseProductImages() for backward compatibility
            // Handles: array, JSON string, comma-separated string, quoted string
            const productImages = parseProductImages(item.product?.images);

            return {
              id: item.id,
              productId: item.productId,
              productName: item.product?.name || 'Unknown Product',
              productBarcode: item.product?.barcode || null,
              productImages: productImages,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              deposit: item.deposit || 0,
              productRentPrice: item.product?.rentPrice || 0,
              productDeposit: item.product?.deposit || 0,
              notes: item.notes || ''
            };
          }),
          
          // Summary counts
          itemCount: productItems.length,
          paymentCount: order._count?.payments || 0,
          totalPaid: order.totalPaid || 0
        };
      }),
        meta: {
          totalOrders: allOrders.length,
          date: dateString,
          pickupDate: pickupDate || date || null,
          returnDate: returnDate || null,
          checkedAt: new Date().toISOString()
        }
      };

      return NextResponse.json(
        ResponseBuilder.success('PRODUCT_AVAILABILITY_FOUND', response)
      );

    } catch (error: any) {
      console.error('Error checking product availability:', error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        meta: error?.meta
      });
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);
