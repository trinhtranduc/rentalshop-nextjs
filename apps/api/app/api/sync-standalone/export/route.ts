/**
 * POST /api/sync-standalone/export
 * Export data from old server to JSON format
 * CẦN admin authentication để truy cập
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { OldServerSyncService, transformCustomer, transformProduct, transformOrder } from '@rentalshop/utils';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';

export const POST = withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest, { user, userScope }) => {
  console.log('📤 [EXPORT API] POST /api/sync-standalone/export - Request received');
  
  try {
    const body = await request.json();
    const { entities, endpoint, token, preview, searchParams } = body;

    // Validate required fields
    if (!endpoint || !token) {
      return NextResponse.json(
        ResponseBuilder.error('MISSING_ENDPOINT_OR_TOKEN'),
        { status: 400 }
      );
    }

    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      return NextResponse.json(
        ResponseBuilder.error('MISSING_ENTITIES'),
        { status: 400 }
      );
    }

    // Initialize sync service
    const syncService = new OldServerSyncService(endpoint, token);

    const exportData: any = {
      customers: [],
      products: [],
      orders: []
    };

    const totalCounts: any = {
      customers: 0,
      products: 0,
      orders: 0
    };

    const previewLimit = preview ? 20 : undefined;

    // Store products result for order mapping
    let productsResult: any = null;

    // Export customers
    if (entities.includes('customers')) {
      try {
        const customerKeyword = searchParams?.customers?.keyword_search || '';
        const customersResult = await syncService.fetchCustomers(customerKeyword);
        
        if (customersResult.success && customersResult.data) {
          const oldCustomers = Array.isArray(customersResult.data) ? customersResult.data : [];
          totalCounts.customers = oldCustomers.length;
          
          const customersToExport = previewLimit 
            ? oldCustomers.slice(0, previewLimit)
            : oldCustomers;
          
          // Transform customers (merchantId will be set during import)
          exportData.customers = customersToExport.map((oldCustomer: any) => 
            transformCustomer(oldCustomer, 0) // merchantId = 0 for export, will be set on import
          );
        }
      } catch (error: any) {
        console.error('Error exporting customers:', error);
        // Continue with other entities
      }
    }

    // Export products
    if (entities.includes('products')) {
      try {
        const productKeyword = searchParams?.products?.keyword_search || '';
        productsResult = await syncService.fetchProducts(productKeyword);
        
        if (productsResult.success && productsResult.data) {
          const oldProducts = Array.isArray(productsResult.data) ? productsResult.data : [];
          totalCounts.products = oldProducts.length;
          
          const productsToExport = previewLimit 
            ? oldProducts.slice(0, previewLimit)
            : oldProducts;
          
          // Transform products (merchantId and categoryId will be set during import)
          exportData.products = productsToExport.map((oldProduct: any) => {
            // For export, we don't download images, just keep URLs
            // Support gallery, avatar, images, image_urls
            let imageUrls: string[] = [];
            if (oldProduct.gallery && Array.isArray(oldProduct.gallery)) {
              imageUrls = oldProduct.gallery.filter((url: any) => url && typeof url === 'string');
            } else if (oldProduct.avatar && typeof oldProduct.avatar === 'string') {
              imageUrls = [oldProduct.avatar];
            } else if (oldProduct.images && Array.isArray(oldProduct.images)) {
              imageUrls = oldProduct.images.filter((url: any) => url && typeof url === 'string');
            } else if (oldProduct.image_urls && Array.isArray(oldProduct.image_urls)) {
              imageUrls = oldProduct.image_urls.filter((url: any) => url && typeof url === 'string');
            }
            
            const transformed = transformProduct(oldProduct, 0, 0, imageUrls); // merchantId = 0, categoryId = 0 for export
            // Preserve old product ID for mapping during import
            transformed.oldProductId = oldProduct.product_id || oldProduct.id;
            return transformed;
          });
        }
      } catch (error: any) {
        console.error('Error exporting products:', error);
        // Continue with other entities
      }
    }

    // Export orders (must be after products to build product map)
    if (entities.includes('orders')) {
      try {
        const ordersResult = await syncService.fetchOrders({
          afterTime: searchParams?.orders?.after_time || '2020-01-01'
        });
        
        if (ordersResult.success && ordersResult.data) {
          const oldOrders = Array.isArray(ordersResult.data) ? ordersResult.data : [];
          totalCounts.orders = oldOrders.length;
          
          const ordersToExport = previewLimit 
            ? oldOrders.slice(0, previewLimit)
            : oldOrders;
          
          // Build product map: old product ID -> product index in export array
          // This allows import to map old product IDs to new product IDs
          const productIdToIndexMap = new Map<string | number, number>();
          if (productsResult && productsResult.data) {
            const oldProducts = Array.isArray(productsResult.data) ? productsResult.data : [];
            oldProducts.forEach((oldProduct: any, index: number) => {
              const oldProductId = oldProduct.product_id || oldProduct.id;
              if (oldProductId) {
                productIdToIndexMap.set(oldProductId, index);
              }
            });
          }
          
          // Transform orders (outletId and createdById will be set during import)
          exportData.orders = ordersToExport.map((oldOrder: any) => {
            const orderItemsList = oldOrder.list_product || oldOrder.orderItems || [];
            
            // Determine order type and status (similar to transformOrder)
            let orderType = 'RENT';
            if (oldOrder.order_type) {
              const type = String(oldOrder.order_type).toLowerCase();
              orderType = type === 'sale' || type === 'sell' ? 'SALE' : 'RENT';
            } else if (oldOrder.order_state) {
              const state = String(oldOrder.order_state).toLowerCase();
              orderType = state === 'sale' || state === 'sell' ? 'SALE' : 'RENT';
            } else if (oldOrder.type) {
              orderType = String(oldOrder.type).toUpperCase();
            } else if (oldOrder.is_sale || oldOrder.isSale) {
              orderType = 'SALE';
            }

            let status = 'RESERVED';
            if (oldOrder.order_status) {
              const oldStatus = String(oldOrder.order_status).toLowerCase();
              if (oldStatus.includes('pickup') || oldStatus.includes('picked') || oldStatus.includes('renting') || oldStatus.includes('active')) {
                status = 'PICKUPED';
              } else if (oldStatus.includes('return') || oldStatus.includes('returned')) {
                status = orderType === 'RENT' ? 'RETURNED' : 'COMPLETED';
              } else if (oldStatus.includes('cancel')) {
                status = 'CANCELLED';
              } else if (oldStatus.includes('complete') || oldStatus.includes('finish') || oldStatus.includes('done')) {
                status = 'COMPLETED';
              } else if (oldStatus.includes('reserve') || oldStatus.includes('book')) {
                status = 'RESERVED';
              }
            } else if (oldOrder.status) {
              const oldStatus = String(oldOrder.status).toUpperCase();
              if (oldStatus.includes('PICKUP') || oldStatus.includes('RENTING') || oldStatus.includes('ACTIVE')) {
                status = 'PICKUPED';
              } else if (oldStatus.includes('RETURN') || oldStatus.includes('COMPLETE')) {
                status = orderType === 'RENT' ? 'RETURNED' : 'COMPLETED';
              } else if (oldStatus.includes('CANCEL')) {
                status = 'CANCELLED';
              } else if (oldStatus.includes('COMPLETE') || oldStatus.includes('FINISH')) {
                status = 'COMPLETED';
              }
            }

            // Parse dates: support format "2024-12-07 13:23:09"
            const parseDate = (dateStr: any): string | null => {
              if (!dateStr || dateStr === false || dateStr === 'false') return null;
              if (dateStr instanceof Date) return dateStr.toISOString();
              if (typeof dateStr === 'string') {
                // Handle format: "2024-12-07 13:23:09"
                const parsed = new Date(dateStr.replace(' ', 'T'));
                return isNaN(parsed.getTime()) ? null : parsed.toISOString();
              }
              const parsed = new Date(dateStr);
              return isNaN(parsed.getTime()) ? null : parsed.toISOString();
            };

            // Handle customer phone: can be false, null, or string
            const customerPhone = oldOrder.customer_phone && oldOrder.customer_phone !== false
              ? String(oldOrder.customer_phone)
              : (oldOrder.customerPhone || oldOrder.phone || null);

            // Create order data without product mapping (will be done during import)
            const orderData: any = {
              orderType,
              status,
              totalAmount: oldOrder.book_amount || oldOrder.total_amount || oldOrder.totalAmount || 0,
              depositAmount: oldOrder.deposit_amount || oldOrder.depositAmount || 0,
              pickupPlanAt: parseDate(oldOrder.pickup_date || oldOrder.pickup_plan_at || oldOrder.pickupPlanAt || oldOrder.pickupDate),
              returnPlanAt: parseDate(oldOrder.return_date || oldOrder.return_plan_at || oldOrder.returnPlanAt || oldOrder.returnDate),
              customerPhone: customerPhone,
              customerName: oldOrder.customer_name || oldOrder.customerName || null,
              notes: oldOrder.note || oldOrder.notes || oldOrder.description || null,
              orderItems: orderItemsList.map((oldItem: any) => ({
                oldProductId: oldItem.product_id || oldItem.productId, // Preserve old ID for mapping
                quantity: oldItem.quantity || oldItem.qty || 1,
                unitPrice: oldItem.price || oldItem.unit_price || oldItem.unitPrice || 0,
                totalPrice: oldItem.sub_total || oldItem.total_price || ((oldItem.quantity || oldItem.qty || 1) * (oldItem.price || oldItem.unit_price || oldItem.unitPrice || 0)),
                deposit: oldItem.deposit || oldItem.security_deposit || 0
              }))
            };
            
            return orderData;
          });
        }
      } catch (error: any) {
        console.error('Error exporting orders:', error);
        // Continue
      }
    }

    // Build export response - return separate data for each entity
    // Frontend will download separate files for each entity
    const exportResponse: any = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      preview: !!preview,
      entities: entities,
      files: {} as Record<string, any>,
      metadata: {
        totalCounts: totalCounts,
        previewLimit: previewLimit
      }
    };

    // Create separate file data for each entity
    entities.forEach((entity: string) => {
      if (exportData[entity] && exportData[entity].length > 0) {
        exportResponse.files[entity] = {
          entity: entity,
          count: exportData[entity].length,
          totalCount: totalCounts[entity] || 0,
          data: exportData[entity],
          exportedAt: new Date().toISOString(),
          preview: !!preview
        };
      }
    });

    return NextResponse.json(
      ResponseBuilder.success('EXPORT_SUCCESS', exportResponse)
    );
  } catch (error: any) {
    console.error('Error in export:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

