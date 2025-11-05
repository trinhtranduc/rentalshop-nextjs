import { NextRequest, NextResponse } from 'next/server';
import { withReadOnlyAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils/api';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validation schema for product availability query
const productAvailabilitySchema = z.object({
  productId: z.coerce.number().int().positive('Product ID must be a positive integer'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  outletId: z.coerce.number().int().positive().optional() // Required for merchants, auto-filled for outlet users
});

/**
 * GET /api/products/availability
 * Check product availability for a specific date
 * MULTI-TENANT: Uses subdomain-based tenant DB
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
export const GET = withReadOnlyAuth(
  async (request, { user }) => {
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
      console.log('Product availability params:', Object.fromEntries(searchParams.entries()));
      
      const parsed = productAvailabilitySchema.safeParse(Object.fromEntries(searchParams.entries()));
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
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
        finalOutletId = queryOutletId || user.outletId;
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
      const product = await db.product.findUnique({
        where: { id: productId }
      });
      if (!product) {
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_NOT_FOUND', 'Product not found'),
          { status: 404 }
        );
      }

      // Check if product exists in the outlet
      const outletStock = await db.outletStock.findFirst({
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
      // Get ALL orders for this product in the specific outlet (no date filtering)
      const allOrders = await db.order.findMany({
        where: {
          outletId: finalOutletId,
          orderType: {
            in: ['RENT', 'SALE'] // Include both RENT and SALE orders
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
              name: true
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

      // Filter orders that are active on the specific date for availability calculation
      const activeOrders = allOrders.filter(order => {
        const orderPickup = order.pickupPlanAt ? new Date(order.pickupPlanAt) : null;
        const orderReturn = order.returnPlanAt ? new Date(order.returnPlanAt) : null;
        
        if (!orderPickup) return false;
        
        // Order is active if:
        // 1. Pickup date is on or before the check date
        // 2. Return date is on or after the check date (or no return date for PICKUPED orders)
        const isPickupOnOrBefore = orderPickup <= endOfDay;
        const isReturnOnOrAfter = orderReturn ? orderReturn >= startOfDay : (order.status === 'PICKUPED');
        
        return isPickupOnOrBefore && isReturnOnOrAfter;
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
        ordersFound: allOrders.length,
        ordersDetails: allOrders.map(o => ({
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

      activeOrders.forEach((order: any) => {
        // Double-check that order belongs to the correct outlet
        if (order.outletId !== finalOutletId) {
          console.warn(`Order ${order.orderNumber} belongs to outlet ${order.outletId}, expected ${finalOutletId}`);
          return; // Skip this order
        }

        order.orderItems.forEach((item: any) => {
          if (item.productId === productId) {
            if (order.orderType === 'RENT') {
              // RENT orders: only PICKUPED counts as "rented"
              if (order.status === 'PICKUPED') {
                totalRented += item.quantity;
              } else if (order.status === 'RESERVED') {
                totalReserved += item.quantity;
              }
            } else if (order.orderType === 'SALE') {
              // SALE orders: only PICKUPED counts as "rented" (removes from inventory)
              if (order.status === 'PICKUPED') {
                totalRented += item.quantity;
              } else if (order.status === 'RESERVED') {
                totalReserved += item.quantity;
              }
              // COMPLETED SALE orders don't count for availability (already sold)
            }
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
          
          // Flatten dates
          pickupPlanAt: order.pickupPlanAt,
          returnPlanAt: order.returnPlanAt,
          pickedUpAt: order.pickedUpAt,
          returnedAt: order.returnedAt,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          
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
          customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Unknown',
          customerPhone: order.customer?.phone || null,
          customerEmail: order.customer?.email || null,
          
          // Created by info (no merchant info - tenant DB is isolated)
          createdById: order.createdById || null,
          createdByName: order.createdBy ? `${order.createdBy.firstName} ${order.createdBy.lastName}` : null,
          
          // Order items (only for this product)
          orderItems: productItems.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            productName: item.product?.name || 'Unknown Product',
            productBarcode: item.product?.barcode || null,
            productImages: item.product?.images || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            deposit: item.deposit || 0,
            productRentPrice: item.product?.rentPrice || 0,
            productDeposit: item.product?.deposit || 0,
            notes: item.notes || ''
          })),
          
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
