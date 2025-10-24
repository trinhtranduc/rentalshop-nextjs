import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { z } from 'zod';

// Validation schema for product availability query
const productAvailabilitySchema = z.object({
  productId: z.coerce.number().int().positive('Product ID must be a positive integer'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  outletId: z.coerce.number().int().positive().optional() // Required for merchants, auto-filled for outlet users
});

/**
 * GET /api/products/availability
 * Check product availability for a specific date
 * Returns product summary (stock, rented, available) and orders for that date
 * 
 * Query parameters:
 * - productId: Product ID to check availability for
 * - date: Date to check availability (YYYY-MM-DD format)
 * - outletId: Optional outlet ID (required for outlet users)
 * 
 * Response includes:
 * - Product information
 * - Stock summary (total, rented, available)
 * - Orders for the target date
 * - Availability status
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(
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

      const { productId, date, outletId: queryOutletId } = parsed.data;
      const targetDate = new Date(date);
      
      // Validate date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (targetDate < today) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_DATE', 'Date cannot be in the past'),
          { status: 400 }
        );
      }

      // Role-based outlet filtering
      let finalOutletId = queryOutletId;
      
      if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
        // Outlet users: use query outletId if provided, otherwise use their assigned outlet
        finalOutletId = queryOutletId || userScope.outletId;
      } else if (user.role === 'MERCHANT') {
        // Merchants: outletId is required
        if (!queryOutletId) {
          return NextResponse.json(
            ResponseBuilder.error('OUTLET_REQUIRED', 'Outlet ID is required for merchants'),
            { status: 400 }
          );
        }
        finalOutletId = queryOutletId;
      } else if (user.role === 'ADMIN') {
        // Admins: outletId is required
        if (!queryOutletId) {
          return NextResponse.json(
            ResponseBuilder.error('OUTLET_REQUIRED', 'Outlet ID is required for admins'),
            { status: 400 }
          );
        }
        finalOutletId = queryOutletId;
      }

      // Get product information
      const product = await db.products.findById(productId);
      if (!product) {
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_NOT_FOUND', 'Product not found'),
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
          ResponseBuilder.error('PRODUCT_OUTLET_NOT_FOUND', 'Product not found in specified outlet'),
          { status: 404 }
        );
      }

      // Get orders for this product on the target date
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get orders that have this product and overlap with the target date
      // CRITICAL FIX: Ensure we only get orders from the specific outlet
      const orders = await db.prisma.order.findMany({
        where: {
          outletId: finalOutletId, // Filter by specific outlet
          orderType: 'RENT', // Only get RENT orders for availability calculation
          orderItems: {
            some: {
              productId: productId
            }
          },
          OR: [
            // Orders that start on this date
            {
              pickupPlanAt: {
                gte: startOfDay,
                lte: endOfDay
              }
            },
            // Orders that end on this date
            {
              returnPlanAt: {
                gte: startOfDay,
                lte: endOfDay
              }
            },
            // Orders that span across this date
            {
              AND: [
                {
                  pickupPlanAt: {
                    lte: startOfDay
                  }
                },
                {
                  OR: [
                    {
                      returnPlanAt: {
                        gte: endOfDay
                      }
                    },
                    {
                      AND: [
                        {
                          returnPlanAt: null
                        },
                        {
                          status: 'PICKUPED'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true
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
                  barcode: true
                }
              }
            }
          }
        },
        orderBy: {
          pickupPlanAt: 'asc'
        }
      });

      // Calculate product summary
      const totalStock = outletStock.stock;
      let totalRented = 0;
      let totalReserved = 0;

      // Enhanced logging for debugging
      console.log('🔍 Product availability calculation:', {
        productId,
        outletId: finalOutletId,
        targetDate: date,
        totalStock,
        ordersFound: orders.length,
        ordersDetails: orders.map(o => ({
          orderNumber: o.orderNumber,
          orderType: o.orderType,
          status: o.status,
          outletId: o.outletId,
          items: o.orderItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity
          }))
        }))
      });

      orders.forEach((order: any) => {
        // Double-check that order belongs to the correct outlet
        if (order.outletId !== finalOutletId) {
          console.warn(`Order ${order.orderNumber} belongs to outlet ${order.outletId}, expected ${finalOutletId}`);
          return; // Skip this order
        }

        order.orderItems.forEach((item: any) => {
          if (item.productId === productId) {
            // Only RENT orders should be counted for availability
            if (order.orderType === 'RENT') {
              if (order.status === 'PICKUPED') {
                totalRented += item.quantity;
              } else if (order.status === 'RESERVED') {
                totalReserved += item.quantity;
              }
            }
            // SALE orders (COMPLETED, RESERVED) are not counted for rental availability
          }
        });
      });

      const totalAvailable = totalStock - totalRented - totalReserved;

      // Enhanced logging for final calculation
      console.log('🔍 Final availability calculation:', {
        productId,
        outletId: finalOutletId,
        totalStock,
        totalRented,
        totalReserved,
        totalAvailable,
        isAvailable: totalAvailable > 0
      });

      // Format response
      const response = {
        product: {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          outletId: finalOutletId,
          outletName: 'Outlet' // We'll get this from outletStock if needed
        },
        date: date,
        summary: {
          totalStock: totalStock,
          totalRented: totalRented,
          totalReserved: totalReserved,
          totalAvailable: Math.max(0, totalAvailable),
          isAvailable: totalAvailable > 0
        },
        orders: orders.map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          status: order.status,
          customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Unknown',
          customerPhone: order.customer?.phone,
          pickupPlanAt: order.pickupPlanAt,
          returnPlanAt: order.returnPlanAt,
          pickedUpAt: order.pickedUpAt,
          returnedAt: order.returnedAt,
          orderItems: order.orderItems.map((item: any) => ({
            id: item.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            product: {
              id: item.product.id,
              name: item.product.name,
              barcode: item.product.barcode
            }
          }))
        })),
        meta: {
          totalOrders: orders.length,
          date: date,
          checkedAt: new Date().toISOString()
        }
      };

      return NextResponse.json(
        ResponseBuilder.success('PRODUCT_AVAILABILITY_FOUND', response)
      );

    } catch (error) {
      console.error('Error checking product availability:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);
