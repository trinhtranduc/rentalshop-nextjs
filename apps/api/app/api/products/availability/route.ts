import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { z } from 'zod';

// Validation schema for product availability query
const productAvailabilitySchema = z.object({
  productId: z.coerce.number().int().positive('Product ID must be a positive integer'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  outletId: z.coerce.number().int().positive().optional()
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
        finalOutletId = userScope.outletId;
      } else if (user.role === 'MERCHANT' && !queryOutletId) {
        // Merchant can check any outlet, but if not specified, use first outlet
        const outlets = await db.outlets.findMany({
          where: { merchantId: userScope.merchantId },
          select: { id: true },
          take: 1
        });
        if (outlets.length > 0) {
          finalOutletId = outlets[0].id;
        }
      }

      if (!finalOutletId) {
        return NextResponse.json(
          ResponseBuilder.error('OUTLET_REQUIRED', 'Outlet ID is required'),
          { status: 400 }
        );
      }

      // Get product information
      const product = await db.products.findById(productId);
      if (!product) {
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_NOT_FOUND', 'Product not found'),
          { status: 404 }
        );
      }

      // Check if product belongs to the outlet
      if (product.outletId !== finalOutletId) {
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_OUTLET_MISMATCH', 'Product does not belong to this outlet'),
          { status: 400 }
        );
      }

      // Get orders for this product on the target date
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get orders that have this product and overlap with the target date
      const orders = await db.orders.findMany({
        where: {
          outletId: finalOutletId,
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
                          status: {
                            in: ['PICKUPED', 'ACTIVE']
                          }
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
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
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
      const totalStock = product.totalStock || 0;
      let totalRented = 0;
      let totalReserved = 0;

      orders.forEach(order => {
        order.orderItems.forEach(item => {
          if (item.productId === productId) {
            if (order.status === 'PICKUPED' || order.status === 'ACTIVE') {
              totalRented += item.quantity;
            } else if (order.status === 'RESERVED') {
              totalReserved += item.quantity;
            }
          }
        });
      });

      const totalAvailable = totalStock - totalRented - totalReserved;

      // Format response
      const response = {
        product: {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          outletId: product.outletId,
          outletName: product.outlet?.name || 'Unknown Outlet'
        },
        date: date,
        summary: {
          totalStock: totalStock,
          totalRented: totalRented,
          totalReserved: totalReserved,
          totalAvailable: Math.max(0, totalAvailable),
          isAvailable: totalAvailable > 0
        },
        orders: orders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          status: order.status,
          customer: {
            id: order.customer?.id,
            name: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Unknown',
            phone: order.customer?.phone,
            email: order.customer?.email
          },
          pickupPlanAt: order.pickupPlanAt,
          returnPlanAt: order.returnPlanAt,
          pickedUpAt: order.pickedUpAt,
          returnedAt: order.returnedAt,
          orderItems: order.orderItems.map(item => ({
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
