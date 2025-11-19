/**
 * STANDALONE SYNC API
 * Module này tách biệt old server API calls với hệ thống hiện tại
 * CẦN admin authentication để truy cập (dùng admin token của current system)
 * Old server API calls vẫn tách biệt (dùng token của old server từ request body)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { OldServerSyncService } from '@rentalshop/utils/src/sync/oldServerSync';
import { db } from '@rentalshop/database';
import { processProductImages, imagesToBase64 } from '@rentalshop/utils/src/sync/imageSync';
import { transformCustomer, transformProduct, transformOrder } from '@rentalshop/utils/src/sync/transformers';
import { generateOrderNumber } from '@rentalshop/database';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/sync-standalone
 * Get all merchants from new server and fetch data from old server
 * CẦN admin authentication để truy cập
 * Old server API calls tách biệt (dùng token từ query params)
 * 
 * Query params:
 * - endpoint: Old server endpoint URL
 * - token: Old server admin token
 */
export const GET = withAuthRoles(['ADMIN'])(async (request: NextRequest, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const token = searchParams.get('token');

    // Validate required fields
    if (!endpoint || !token) {
      return NextResponse.json(
        ResponseBuilder.error('MISSING_ENDPOINT_OR_TOKEN', {
          message: 'endpoint and token query parameters are required'
        }),
        { status: 400 }
      );
    }

    // Fetch all merchants from new server
    const merchantsResult = await db.merchants.search({
      limit: 1000, // Get all merchants
      page: 1
    });

    const merchants = merchantsResult.data || [];

    // Initialize OldServerSyncService - tách biệt hoàn toàn
    // Use default headers (lat, long, device, version) as per old server requirements
    const syncService = new OldServerSyncService(endpoint, token);

    // Fetch data from old server
    const oldServerData: any = {
      customers: { success: false, data: null, count: 0, error: null },
      products: { success: false, data: null, count: 0, error: null, images: {} },
      orders: { success: false, data: null, count: 0, error: null }
    };

    // Fetch customers - GET doesn't have search params, fetch all
    try {
      const customersResult = await syncService.fetchCustomers('');
      if (customersResult.success && customersResult.data) {
        oldServerData.customers = {
          success: true,
          data: customersResult.data,
          count: Array.isArray(customersResult.data) ? customersResult.data.length : 0,
          error: null,
          pagination: customersResult.pagination,
          meta: customersResult.meta
        };
      } else {
        oldServerData.customers.error = customersResult.error || 'Failed to fetch customers';
      }
    } catch (error: any) {
      oldServerData.customers.error = error.message || 'Unknown error fetching customers';
    }

    // Fetch products - GET doesn't have search params, fetch all
    try {
      const productsResult = await syncService.fetchProducts('');
      if (productsResult.success && productsResult.data) {
        const products = Array.isArray(productsResult.data) ? productsResult.data : [];
        oldServerData.products = {
          success: true,
          data: products,
          count: products.length,
          error: null,
          images: {} as Record<string, any>,
          pagination: productsResult.pagination,
          meta: productsResult.meta
        };

        // Process images for each product
        for (const product of products) {
          const productId = product.product_id || product.id || `unknown-${Date.now()}`;
          try {
            const imageResult = await processProductImages(product);
            
            // Convert buffers to base64 for JSON serialization
            const imageData = imagesToBase64(imageResult.downloadedImages);
            
            oldServerData.products.images[String(productId)] = {
              originalUrls: imageResult.originalUrls,
              downloadedImages: imageData, // Base64 encoded for JSON
              readyForUpload: imageResult.readyForUpload,
              errors: imageResult.errors || []
            };
          } catch (error: any) {
            oldServerData.products.images[String(productId)] = {
              originalUrls: [],
              downloadedImages: [],
              readyForUpload: false,
              errors: [{ url: 'unknown', error: error.message || 'Unknown error' }]
            };
          }
        }
      } else {
        oldServerData.products.error = productsResult.error || 'Failed to fetch products';
      }
    } catch (error: any) {
      oldServerData.products.error = error.message || 'Unknown error fetching products';
    }

    // Fetch orders
    try {
      const ordersResult = await syncService.fetchOrders({
        afterTime: '2020-01-01' // Get all orders from 2020
      });
      if (ordersResult.success && ordersResult.data) {
        oldServerData.orders = {
          success: true,
          data: ordersResult.data,
          count: Array.isArray(ordersResult.data) ? ordersResult.data.length : 0,
          error: null
        };
      } else {
        oldServerData.orders.error = ordersResult.error || 'Failed to fetch orders';
      }
    } catch (error: any) {
      oldServerData.orders.error = error.message || 'Unknown error fetching orders';
    }

    // Get all logs from sync service
    const logs = syncService.getLogs();

    // Return response with raw data
    return NextResponse.json(
      ResponseBuilder.success('SYNC_DATA_FETCHED', {
        merchants: merchants.map(m => ({
          id: m.id,
          publicId: m.publicId,
          name: m.name,
          email: m.email,
          phone: m.phone,
          isActive: m.isActive,
          createdAt: m.createdAt
        })),
        oldServerData,
        logs,
        summary: {
          merchantsCount: merchants.length,
          customersCount: oldServerData.customers.count,
          productsCount: oldServerData.products.count,
          ordersCount: oldServerData.orders.count,
          productsWithImages: Object.keys(oldServerData.products.images || {}).length
        }
      })
    );
  } catch (error: any) {
    console.error('Error in GET sync-standalone:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * POST /api/sync-standalone
 * Standalone sync endpoint - CẦN admin authentication
 * Old server API calls vẫn tách biệt (dùng token từ request body)
 */
export const POST = withAuthRoles(['ADMIN'])(async (request: NextRequest, { user, userScope }) => {
  console.log('🔄 [SYNC API] POST /api/sync-standalone - Request received');
  
  try {
    const body = await request.json();
    const { merchantId, entities, endpoint, token, action } = body;

    console.log('🔄 [SYNC API] Request body:', { 
      action, 
      entities, 
      endpoint, 
      hasToken: !!token,
      merchantId 
    });

    // Validate required fields
    if (!endpoint || !token) {
      console.log('❌ [SYNC API] Missing endpoint or token');
      return NextResponse.json(
        ResponseBuilder.error('MISSING_ENDPOINT_OR_TOKEN'),
        { status: 400 }
      );
    }

    if (!action || !['preview', 'execute'].includes(action)) {
      console.log('❌ [SYNC API] Invalid action:', action);
      return NextResponse.json(
        ResponseBuilder.error('INVALID_ACTION'),
        { status: 400 }
      );
    }

    // Tạo OldServerSyncService - tách biệt hoàn toàn
    // Use default headers (lat, long, device, version) as per old server requirements
    const syncService = new OldServerSyncService(endpoint, token);
    
    console.log('🔄 [SYNC API] OldServerSyncService created, starting preview...');

    // PREVIEW ACTION - Chỉ fetch data, không lưu vào DB
    if (action === 'preview') {
      if (!entities || !Array.isArray(entities) || entities.length === 0) {
        return NextResponse.json(
          { success: false, error: 'MISSING_ENTITIES' },
          { status: 400 }
        );
      }

      const preview: any = {
        customers: null,
        products: null,
        orders: null,
        errors: [],
        logs: [], // Will be populated with syncService.getLogs() after all fetches
        rawResponses: {} as Record<string, any>,
        transformedData: {} as Record<string, any[]>,
        idMappings: {} as Record<string, Array<{ oldId: string | number; newId: number; name?: string }>>
      };

      // Fetch customers preview - get search params
      if (entities.includes('customers')) {
        try {
          const searchParams = body.searchParams || {};
          const customerKeyword = searchParams.customers?.keyword_search || '';
          
          console.log('🔄 [SYNC API] Starting customers fetch...', { keyword: customerKeyword });
          
          // Log start of customer fetch
          syncService.getLogs().push({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: '🔄 Starting customers fetch from old server...',
            data: { keyword: customerKeyword, endpoint: `${endpoint}/rental/get_customers` }
          });
          
          const customersResult = await syncService.fetchCustomers(customerKeyword);
          
          console.log('✅ [SYNC API] Customers fetch completed:', {
            success: customersResult.success,
            count: customersResult.data?.length || 0,
            totalPages: customersResult.pagination?.total_of_page || 1
          });
          if (customersResult.success && customersResult.data) {
            // Store raw response
            preview.rawResponses.customers = customersResult.data;
            
            // Transform data
            const transformedCustomers = customersResult.data.map((oldCustomer: any) => 
              transformCustomer(oldCustomer, 0) // merchantId will be set during sync
            );
            preview.transformedData.customers = transformedCustomers;
            
            preview.customers = {
              count: customersResult.data.length,
              sample: customersResult.data.slice(0, 5),
              total: customersResult.data.length,
              pagination: customersResult.pagination,
              meta: customersResult.meta
            };
          } else {
            preview.errors.push({
              entity: 'customers',
              error: customersResult.error || 'Failed to fetch customers'
            });
          }
        } catch (error: any) {
          preview.errors.push({
            entity: 'customers',
            error: error.message || 'Unknown error'
          });
        }
      }

      // Fetch products preview - get search params
      if (entities.includes('products')) {
        try {
          const searchParams = body.searchParams || {};
          const productKeyword = searchParams.products?.keyword_search || '';
          
          const productsResult = await syncService.fetchProducts(productKeyword);
          if (productsResult.success && productsResult.data) {
            // Store raw response
            preview.rawResponses.products = productsResult.data;
            
            // Transform data (without images for preview)
            const transformedProducts = productsResult.data.map((oldProduct: any) => 
              transformProduct(oldProduct, 0, 0, []) // merchantId, categoryId, images will be set during sync
            );
            preview.transformedData.products = transformedProducts;
            
            preview.products = {
              count: productsResult.data.length,
              sample: productsResult.data.slice(0, 5),
              total: productsResult.data.length,
              pagination: productsResult.pagination,
              meta: productsResult.meta
            };
          } else {
            preview.errors.push({
              entity: 'products',
              error: productsResult.error || 'Failed to fetch products'
            });
          }
        } catch (error: any) {
          preview.errors.push({
            entity: 'products',
            error: error.message || 'Unknown error'
          });
        }
      }

      // Fetch orders preview
      if (entities.includes('orders')) {
        try {
          const ordersResult = await syncService.fetchOrders({
            afterTime: '2020-01-01'
          });
          if (ordersResult.success && ordersResult.data) {
            // Store raw response
            preview.rawResponses.orders = ordersResult.data;
            
            // Transform data (without product mapping for preview)
            const transformedOrders = ordersResult.data.map((oldOrder: any) => 
              transformOrder(oldOrder, 0, 0, new Map()) // outletId, createdById, productMap will be set during sync
            );
            preview.transformedData.orders = transformedOrders;
            
            preview.orders = {
              count: ordersResult.data.length,
              sample: ordersResult.data.slice(0, 5),
              total: ordersResult.data.length
            };
          } else {
            preview.errors.push({
              entity: 'orders',
              error: ordersResult.error || 'Failed to fetch orders'
            });
          }
        } catch (error: any) {
          preview.errors.push({
            entity: 'orders',
            error: error.message || 'Unknown error'
          });
        }
      }

      // Get all logs from sync service
      preview.logs = syncService.getLogs();

      return NextResponse.json(
        ResponseBuilder.success('PREVIEW_SUCCESS', preview)
      );
    }

    // EXECUTE ACTION - Fetch và sync vào DB
    if (action === 'execute') {
      if (!merchantId || !entities || !Array.isArray(entities) || entities.length === 0) {
        return NextResponse.json(
          ResponseBuilder.error('MISSING_REQUIRED_FIELD'),
          { status: 400 }
        );
      }

      // Verify merchant exists
      const merchant = await db.merchants.findById(merchantId);
      if (!merchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: 404 }
        );
      }

      // Get default outlet for merchant
      const defaultOutlet = await db.outlets.search({ merchantId, isDefault: true, limit: 1 });
      if (!defaultOutlet.data || defaultOutlet.data.length === 0) {
        return NextResponse.json(
          ResponseBuilder.error('NO_DEFAULT_OUTLET'),
          { status: 400 }
        );
      }
      const outletId = defaultOutlet.data[0].id;

      // Get default category for merchant (or create one)
      let categoryId: number;
      const defaultCategory = await db.categories.findFirst({
        where: { merchantId, isDefault: true, isActive: true }
      });
      
      if (defaultCategory && 'id' in defaultCategory && typeof defaultCategory.id === 'number') {
        categoryId = defaultCategory.id;
      } else {
        const categoriesResult = await db.categories.findMany({
          where: { merchantId, isActive: true },
          take: 1
        });
        const categories = Array.isArray(categoriesResult) ? categoriesResult : [];
        
        if (categories && categories.length > 0) {
          const firstCategory = categories[0];
          if (firstCategory && 'id' in firstCategory && typeof firstCategory.id === 'number') {
            categoryId = firstCategory.id;
          } else {
            const newCategory = await db.categories.create({
              name: 'Default',
              merchantId,
              isDefault: true,
              isActive: true
            });
            categoryId = newCategory.id;
          }
        } else {
          const newCategory = await db.categories.create({
            name: 'Default',
            merchantId,
            isDefault: true,
            isActive: true
          });
          categoryId = newCategory.id;
        }
      }

      // Create sync session
      const syncSession = await db.sync.createSession({
        merchantId,
        entities,
        config: { endpoint, token }
      });

      // Initialize stats
      const stats: any = {};
      const errorLog: any[] = [];
      const idMappings: Record<string, Array<{ oldId: string | number; newId: number; name?: string }>> = {
        customers: [],
        products: [],
        orders: []
      };

      // Update session status to IN_PROGRESS
      await db.sync.updateStatus(syncSession.id, { status: 'IN_PROGRESS' });

      // Track created records for rollback
      const createdRecords: Array<{ entityType: 'customer' | 'product' | 'order'; entityId: number }> = [];

      try {
        // Sync customers - get search params
        if (entities.includes('customers')) {
          stats.customers = { total: 0, created: 0, failed: 0 };
          const searchParams = body.searchParams || {};
          const customerKeyword = searchParams.customers?.keyword_search || '';
          
          const customersResult = await syncService.fetchCustomers(customerKeyword);
          
          if (customersResult.success && customersResult.data) {
            const oldCustomers = Array.isArray(customersResult.data) ? customersResult.data : [];
            stats.customers.total = oldCustomers.length;

            for (const oldCustomer of oldCustomers) {
              try {
                const customerData = transformCustomer(oldCustomer, merchantId);
                const customer = await db.customers.create(customerData);
                const oldCustomerId = oldCustomer.customer_id || oldCustomer.id || '';
                
                // Track for rollback
                createdRecords.push({ entityType: 'customer', entityId: customer.id });
                db.sync.trackRecord(syncSession.id, {
                  entityType: 'customer',
                  entityId: customer.id,
                  oldServerId: String(oldCustomerId)
                });
                
                // Store ID mapping
                idMappings.customers.push({
                  oldId: oldCustomerId,
                  newId: customer.id,
                  name: `${customer.firstName} ${customer.lastName}`
                });
                
                await db.sync.addRecord({
                  syncSessionId: syncSession.id,
                  entityType: 'customer',
                  entityId: customer.id,
                  oldServerId: String(oldCustomerId),
                  status: 'created',
                  logMessage: `Customer ${customer.firstName} ${customer.lastName} created`
                });
                
                stats.customers.created++;
              } catch (error: any) {
                stats.customers.failed++;
                errorLog.push({ entity: 'customer', error: error.message, data: oldCustomer });
              }
            }
          }
        }

        // Sync products
        if (entities.includes('products')) {
          stats.products = { total: 0, created: 0, failed: 0 };
          const productMap = new Map<string | number, { id: number; images?: string[]; name?: string }>(); // old ID -> new product info
          
          const searchParams = body.searchParams || {};
          const productKeyword = searchParams.products?.keyword_search || '';
          
          const productsResult = await syncService.fetchProducts(productKeyword);
          if (productsResult.success && productsResult.data) {
            const oldProducts = Array.isArray(productsResult.data) ? productsResult.data : [];
            stats.products.total = oldProducts.length;

            for (const oldProduct of oldProducts) {
              try {
                // Process images - get original URLs for now (POST handler will upload later)
                const imageResult = await processProductImages(oldProduct);
                const imageUrls = imageResult.originalUrls; // Extract URLs for transformProduct
                
                const productData = transformProduct(oldProduct, merchantId, categoryId, imageUrls);
                productData.outletStock = [{
                  outletId,
                  stock: oldProduct.stock || 0
                }];
                
                const product = await db.products.create(productData);
                const oldProductId = oldProduct.product_id || oldProduct.id;
                
                // Track for rollback
                createdRecords.push({ entityType: 'product', entityId: product.id });
                db.sync.trackRecord(syncSession.id, {
                  entityType: 'product',
                  entityId: product.id,
                  oldServerId: String(oldProductId || '')
                });
                
                if (oldProductId) {
                  // Store image download result for later upload
                  const downloadedImageUrls = imageResult.downloadedImages.map(img => img.url);
                  productMap.set(oldProductId, { 
                    id: product.id, 
                    images: downloadedImageUrls.length > 0 ? downloadedImageUrls : imageUrls, 
                    name: product.name 
                  });
                  
                  // Store ID mapping
                  idMappings.products.push({
                    oldId: oldProductId,
                    newId: product.id,
                    name: product.name
                  });
                }
                
                await db.sync.addRecord({
                  syncSessionId: syncSession.id,
                  entityType: 'product',
                  entityId: product.id,
                  oldServerId: String(oldProductId || ''),
                  status: 'created',
                  logMessage: `Product ${product.name} created`
                });
                
                stats.products.created++;
              } catch (error: any) {
                stats.products.failed++;
                errorLog.push({ entity: 'product', error: error.message, data: oldProduct });
              }
            }
          }

          // Sync orders (must be after products)
          if (entities.includes('orders')) {
            stats.orders = { total: 0, created: 0, failed: 0 };
            const ordersResult = await syncService.fetchOrders();
            
            if (ordersResult.success && ordersResult.data) {
              const oldOrders = Array.isArray(ordersResult.data) ? ordersResult.data : [];
              stats.orders.total = oldOrders.length;

              for (const oldOrder of oldOrders) {
                try {
                  // Map old product IDs to new product IDs
                  const orderItemsList = oldOrder.list_product || oldOrder.orderItems || [];
                  const transformedItems = orderItemsList.map((oldItem: any) => {
                    const oldProductId = oldItem.product_id || oldItem.productId;
                    const productInfo = productMap.get(oldProductId);
                    if (!productInfo) {
                      throw new Error(`Product ${oldProductId} not found in product map`);
                    }
                    return {
                      ...oldItem,
                      productId: productInfo.id,
                      product_id: productInfo.id
                    };
                  });
                  
                  const orderData = transformOrder(
                    { ...oldOrder, orderItems: transformedItems },
                    outletId,
                    0, // createdById - will be set to system user or 0
                    productMap
                  );

                  // Find customer by phone
                  if (orderData.customerPhone) {
                    const customerSearch = await db.customers.search({
                      merchantId,
                      phone: orderData.customerPhone,
                      limit: 1
                    });
                    if (customerSearch.data && customerSearch.data.length > 0) {
                      orderData.customerId = customerSearch.data[0].id;
                    }
                  }

                  const orderNumber = await generateOrderNumber(outletId);

                  const order = await db.prisma.$transaction(async (tx) => {
                    const newOrder = await tx.order.create({
                      data: {
                        orderNumber,
                        orderType: orderData.orderType,
                        status: orderData.status || 'RESERVED',
                        totalAmount: orderData.totalAmount,
                        depositAmount: orderData.depositAmount || 0,
                        pickupPlanAt: orderData.pickupPlanAt,
                        returnPlanAt: orderData.returnPlanAt,
                        outletId,
                        customerId: orderData.customerId,
                        createdById: orderData.createdById,
                        notes: orderData.notes
                      }
                    });

                    for (const item of orderData.orderItems) {
                      await tx.orderItem.create({
                        data: {
                          orderId: newOrder.id,
                          productId: item.productId,
                          quantity: item.quantity,
                          unitPrice: item.unitPrice,
                          totalPrice: item.totalPrice,
                          deposit: item.deposit || 0
                        }
                      });
                    }

                    return newOrder;
                  });

                  const oldOrderId = oldOrder.order_id || oldOrder.id || '';
                  
                  // Track for rollback
                  createdRecords.push({ entityType: 'order', entityId: order.id });
                  db.sync.trackRecord(syncSession.id, {
                    entityType: 'order',
                    entityId: order.id,
                    oldServerId: String(oldOrderId)
                  });
                  
                  // Store ID mapping
                  idMappings.orders.push({
                    oldId: oldOrderId,
                    newId: order.id,
                    name: order.orderNumber
                  });
                  
                  await db.sync.addRecord({
                    syncSessionId: syncSession.id,
                    entityType: 'order',
                    entityId: order.id,
                    oldServerId: String(oldOrderId),
                    status: 'created',
                    logMessage: `Order ${order.orderNumber} created`
                  });

                  stats.orders.created++;
                } catch (error: any) {
                  stats.orders.failed++;
                  errorLog.push({ entity: 'order', error: error.message, data: oldOrder });
                }
              }
            }
          }
        }

        // Get all logs from sync service
        const syncLogs = syncService.getLogs();
        syncLogs.forEach(log => {
          errorLog.push({
            timestamp: log.timestamp,
            level: log.level,
            message: log.message,
            data: log.data
          });
        });

        // Update session status to COMPLETED
        await db.sync.updateStatus(syncSession.id, {
          status: 'COMPLETED',
          stats,
          errorLog: errorLog.length > 0 ? errorLog : undefined
        });

        // Clear tracking after successful completion
        db.sync.clearTracking(syncSession.id);

        return NextResponse.json(
          ResponseBuilder.success('SYNC_COMPLETED', {
            sessionId: syncSession.id,
            stats,
            logs: syncLogs,
            idMappings
          })
        );
      } catch (error: any) {
        const syncLogs = syncService.getLogs();
        syncLogs.forEach(log => {
          errorLog.push({
            timestamp: log.timestamp,
            level: log.level,
            message: log.message,
            data: log.data
          });
        });
        
        // Rollback all created records
        console.error('❌ Sync failed, rolling back created records...');
        const rollbackResult = await db.sync.rollback(syncSession.id);
        
        await db.sync.updateStatus(syncSession.id, {
          status: 'FAILED',
          stats,
          errorLog: [
            ...errorLog, 
            { error: error.message || 'Unknown error' },
            { 
              rollback: {
                deleted: rollbackResult.deleted,
                errors: rollbackResult.errors
              }
            }
          ]
        });

        return NextResponse.json(
          ResponseBuilder.error('SYNC_FAILED', {
            message: error.message || 'Sync failed',
            rollback: {
              deleted: rollbackResult.deleted,
              errors: rollbackResult.errors
            }
          }),
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      ResponseBuilder.error('INVALID_ACTION'),
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in standalone sync:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

