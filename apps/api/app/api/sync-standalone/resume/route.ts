/**
 * POST /api/sync-standalone/resume
 * Resume sync from where it left off
 * CẦN admin authentication để truy cập
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { OldServerSyncService, downloadProductImagesForSync, transformCustomer, transformProduct, transformOrder } from '@rentalshop/utils';
import { db } from '@rentalshop/database';
import { generateOrderNumber } from '@rentalshop/database';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { API, ORDER_STATUS, USER_ROLE } from '@rentalshop/constants';

export const POST = withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest, { user, userScope }) => {
  console.log('🔄 [SYNC RESUME] POST /api/sync-standalone/resume - Request received');
  
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        ResponseBuilder.error('MISSING_SESSION_ID'),
        { status: 400 }
      );
    }

    // Get session
    const session = await db.sync.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        ResponseBuilder.error('SESSION_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check if session can be resumed
    if (session.status !== 'PARTIALLY_COMPLETED' && session.status !== 'FAILED') {
      return NextResponse.json(
        ResponseBuilder.error('SESSION_CANNOT_BE_RESUMED'),
        { status: 400 }
      );
    }

    const { merchantId, entities, config } = session;
    const { endpoint, token } = config;
    
    if (!endpoint || !token) {
      return NextResponse.json(
        ResponseBuilder.error('MISSING_ENDPOINT_OR_TOKEN'),
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

    // Get default category
    let categoryId: number;
    const defaultCategory = await db.categories.findFirst({
      merchantId, isDefault: true, isActive: true
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

    // Initialize sync service
    const syncService = new OldServerSyncService(endpoint, token);

    // Initialize stats from existing session
    const stats: any = session.stats || {};
    const errorLog: any[] = session.errorLog || [];
    const progress = session.progress || {};
    const idMappings: Record<string, Array<{ oldId: string | number; newId: number; name?: string }>> = {
      customers: [],
      products: [],
      orders: []
    };

    // Update session status to IN_PROGRESS
    await db.sync.updateStatus(sessionId, { status: 'IN_PROGRESS' });

    try {
      // Resume customers sync
      if (entities.includes('customers')) {
        if (!stats.customers) {
          stats.customers = { total: 0, created: 0, failed: 0 };
        }

        const customerProgress = progress.entityProgress?.customers;
        const startIndex = customerProgress ? customerProgress.lastProcessedIndex + 1 : 0;

        if (startIndex > 0) {
          console.log(`🔄 Resuming customers sync from index ${startIndex}`);
        }

        const customersResult = await syncService.fetchCustomers('');
        
        if (customersResult.success && customersResult.data) {
          const oldCustomers = Array.isArray(customersResult.data) ? customersResult.data : [];
          stats.customers.total = oldCustomers.length;

          // Get already synced customer IDs to skip
          const syncedOldIds = new Set(
            (await db.sync.getSession(sessionId))?.stats?.customers?.syncedOldIds || []
          );

          for (let i = startIndex; i < oldCustomers.length; i++) {
            const oldCustomer = oldCustomers[i];
            const oldCustomerId = oldCustomer.customer_id || oldCustomer.id || '';

            // Skip if already synced
            if (syncedOldIds.has(String(oldCustomerId))) {
              continue;
            }

            try {
              await db.sync.updateStatus(sessionId, {
                status: 'IN_PROGRESS',
                progress: {
                  currentEntity: 'customers',
                  currentEntityIndex: i,
                  entityProgress: {
                    customers: {
                      processed: i,
                      total: oldCustomers.length,
                      lastProcessedIndex: i
                    }
                  }
                }
              });

              const customerData = transformCustomer(oldCustomer, merchantId);
              const customer = await db.customers.create(customerData);
              
              // Track for rollback
              db.sync.trackRecord(sessionId, {
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
                syncSessionId: sessionId,
                entityType: 'customer',
                entityId: customer.id,
                oldServerId: String(oldCustomerId),
                status: 'created',
                logMessage: `Customer ${customer.firstName} ${customer.lastName} created`
              });
              
              stats.customers.created++;
            } catch (error: any) {
              stats.customers.failed++;
              const errorEntry = { entity: 'customer', index: i, error: error.message, data: oldCustomer };
              errorLog.push(errorEntry);
              
              await db.sync.updateStatus(sessionId, {
                status: 'PARTIALLY_COMPLETED',
                progress: {
                  currentEntity: 'customers',
                  currentEntityIndex: i,
                  entityProgress: {
                    customers: {
                      processed: i,
                      total: oldCustomers.length,
                      lastProcessedIndex: i
                    }
                  },
                  lastError: {
                    entity: 'customer',
                    index: i,
                    error: error.message,
                    timestamp: new Date()
                  }
                },
                errorLog: [...errorLog]
              });
            }
          }
        }
      }

      // Resume products sync (similar logic)
      if (entities.includes('products')) {
        if (!stats.products) {
          stats.products = { total: 0, created: 0, failed: 0 };
        }

        const productProgress = progress.entityProgress?.products;
        const startIndex = productProgress ? productProgress.lastProcessedIndex + 1 : 0;
        const productMap = new Map<string | number, { id: number; images?: string[]; name?: string }>();

        const productsResult = await syncService.fetchProducts('');
        if (productsResult.success && productsResult.data) {
          const oldProducts = Array.isArray(productsResult.data) ? productsResult.data : [];
          stats.products.total = oldProducts.length;

          for (let i = startIndex; i < oldProducts.length; i++) {
            const oldProduct = oldProducts[i];
            try {
              await db.sync.updateStatus(sessionId, {
                status: 'IN_PROGRESS',
                progress: {
                  currentEntity: 'products',
                  currentEntityIndex: i,
                  entityProgress: {
                    products: {
                      processed: i,
                      total: oldProducts.length,
                      lastProcessedIndex: i
                    }
                  }
                }
              });

              const imageResult = await downloadProductImagesForSync(oldProduct);
              const imageUrls = imageResult.originalUrls;
              
              const productData = transformProduct(oldProduct, merchantId, categoryId, imageUrls);
              productData.outletStock = [{
                outletId,
                stock: oldProduct.stock || 0
              }];
              
              const product = await db.products.create(productData);
              const oldProductId = oldProduct.product_id || oldProduct.id;
              
              db.sync.trackRecord(sessionId, {
                entityType: 'product',
                entityId: product.id,
                oldServerId: String(oldProductId || '')
              });
              
              if (oldProductId) {
                const downloadedImageUrls = imageResult.downloadedImages.map(img => img.url);
                productMap.set(oldProductId, { 
                  id: product.id, 
                  images: downloadedImageUrls.length > 0 ? downloadedImageUrls : imageUrls, 
                  name: product.name 
                });
                
                idMappings.products.push({
                  oldId: oldProductId,
                  newId: product.id,
                  name: product.name
                });
              }
              
              await db.sync.addRecord({
                syncSessionId: sessionId,
                entityType: 'product',
                entityId: product.id,
                oldServerId: String(oldProductId || ''),
                status: 'created',
                logMessage: `Product ${product.name} created`
              });
              
              stats.products.created++;
            } catch (error: any) {
              stats.products.failed++;
              const errorEntry = { entity: 'product', index: i, error: error.message, data: oldProduct };
              errorLog.push(errorEntry);
              
              await db.sync.updateStatus(sessionId, {
                status: 'PARTIALLY_COMPLETED',
                progress: {
                  currentEntity: 'products',
                  currentEntityIndex: i,
                  entityProgress: {
                    products: {
                      processed: i,
                      total: oldProducts.length,
                      lastProcessedIndex: i
                    }
                  },
                  lastError: {
                    entity: 'product',
                    index: i,
                    error: error.message,
                    timestamp: new Date()
                  }
                },
                errorLog: [...errorLog]
              });
            }
          }
        }

        // Resume orders sync (must be after products)
        if (entities.includes('orders')) {
          if (!stats.orders) {
            stats.orders = { total: 0, created: 0, failed: 0 };
          }

          const orderProgress = progress.entityProgress?.orders;
          const startIndex = orderProgress ? orderProgress.lastProcessedIndex + 1 : 0;

          const ordersResult = await syncService.fetchOrders();
          
          if (ordersResult.success && ordersResult.data) {
            const oldOrders = Array.isArray(ordersResult.data) ? ordersResult.data : [];
            stats.orders.total = oldOrders.length;

            for (let i = startIndex; i < oldOrders.length; i++) {
              const oldOrder = oldOrders[i];
              try {
                await db.sync.updateStatus(sessionId, {
                  status: 'IN_PROGRESS',
                  progress: {
                    currentEntity: 'orders',
                    currentEntityIndex: i,
                    entityProgress: {
                      orders: {
                        processed: i,
                        total: oldOrders.length,
                        lastProcessedIndex: i
                      }
                    }
                  }
                });

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
                  0,
                  productMap
                );

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
                      status: orderData.status || ORDER_STATUS.RESERVED,
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
                
                db.sync.trackRecord(sessionId, {
                  entityType: 'order',
                  entityId: order.id,
                  oldServerId: String(oldOrderId)
                });
                
                idMappings.orders.push({
                  oldId: oldOrderId,
                  newId: order.id,
                  name: order.orderNumber
                });
                
                await db.sync.addRecord({
                  syncSessionId: sessionId,
                  entityType: 'order',
                  entityId: order.id,
                  oldServerId: String(oldOrderId),
                  status: 'created',
                  logMessage: `Order ${order.orderNumber} created`
                });

                stats.orders.created++;
              } catch (error: any) {
                stats.orders.failed++;
                const errorEntry = { entity: 'order', index: i, error: error.message, data: oldOrder };
                errorLog.push(errorEntry);
                
                await db.sync.updateStatus(sessionId, {
                  status: 'PARTIALLY_COMPLETED',
                  progress: {
                    currentEntity: 'orders',
                    currentEntityIndex: i,
                    entityProgress: {
                      orders: {
                        processed: i,
                        total: oldOrders.length,
                        lastProcessedIndex: i
                      }
                    },
                    lastError: {
                      entity: 'order',
                      index: i,
                      error: error.message,
                      timestamp: new Date()
                    }
                  },
                  errorLog: [...errorLog]
                });
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
      await db.sync.updateStatus(sessionId, {
        status: 'COMPLETED',
        stats,
        errorLog: errorLog.length > 0 ? errorLog : undefined
      });

      // Clear tracking after successful completion
      db.sync.clearTracking(sessionId);

      return NextResponse.json(
        ResponseBuilder.success('SYNC_RESUMED_SUCCESS', {
          sessionId,
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
      
      await db.sync.updateStatus(sessionId, {
        status: 'PARTIALLY_COMPLETED',
        stats,
        errorLog: [
          ...errorLog, 
          { error: error.message || 'Unknown error', timestamp: new Date() }
        ]
      });

      return NextResponse.json(
        ResponseBuilder.error('SYNC_RESUME_FAILED'),
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in resume sync:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

