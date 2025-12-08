import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ORDER_STATUS, ORDER_TYPE, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, formatFullName } from '@rentalshop/utils';
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
 * Authorization: All roles with 'products.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * - No subscription required (read-only operation)
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

      const { productId, date, outletId: queryOutletId } = parsed.data;
      const targetDate = new Date(date);
      
      // Validate date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (targetDate < today) {
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

      // Get orders for this product on the target date
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get orders that have this product and overlap with the target date
      // CRITICAL FIX: Ensure we only get orders from the specific outlet
      // Get ALL orders for this product in the specific outlet (no date filtering)
      const allOrders = await db.prisma.order.findMany({
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

      // Helper function: Check if order is active on target date
      const isOrderActiveOnDate = (order: any) => {
        const status = order.status;
        
        // PICKUPED: Order is active if return date hasn't passed (or no return date)
        if (status === ORDER_STATUS.PICKUPED) {
          if (!order.returnPlanAt) return true; // No return date = still active
          return new Date(order.returnPlanAt) >= startOfDay;
        }
        
        // RETURNED: Order was active if rental period overlaps with check date
        if (status === ORDER_STATUS.RETURNED) {
          const pickupDate = order.pickedUpAt || order.pickupPlanAt;
          const returnDate = order.returnedAt || order.returnPlanAt;
          if (!pickupDate) return false;
          
          return new Date(pickupDate) <= endOfDay && 
                 (!returnDate || new Date(returnDate) >= startOfDay);
        }
        
        // RESERVED: Order is active if pickup date passed and return date hasn't
        if (status === ORDER_STATUS.RESERVED) {
          if (!order.pickupPlanAt) return false;
          
          const pickupDate = new Date(order.pickupPlanAt);
          const returnDate = order.returnPlanAt ? new Date(order.returnPlanAt) : null;
          
          return pickupDate <= endOfDay && 
                 (!returnDate || returnDate >= startOfDay);
        }
        
        return false;
      };
      
      const activeOrders = allOrders.filter(isOrderActiveOnDate);

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
        date: date,
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
