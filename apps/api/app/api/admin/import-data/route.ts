/**
 * POST /api/admin/import-data
 * Import data from JSON file
 * CẦN admin authentication để truy cập
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ResponseBuilder, handleApiError, downloadProductImagesForSync, uploadToS3 } from '@rentalshop/utils';
import { USER_ROLE, ORDER_STATUS } from '@rentalshop/constants';
import { validateImportData } from '@rentalshop/utils';
import { generateOrderNumber } from '@rentalshop/database';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const POST = withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest, { user, userScope }) => {
  console.log('📥 [IMPORT API] POST /api/admin/import-data - Request received');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const merchantIdStr = formData.get('merchantId') as string;
    const optionsStr = formData.get('options') as string;
    const entityType = formData.get('entityType') as string; // 'customers', 'products', or 'orders'

    if (!file) {
      return NextResponse.json(
        ResponseBuilder.error('MISSING_FILE'),
        { status: 400 }
      );
    }

    if (!merchantIdStr) {
      return NextResponse.json(
        ResponseBuilder.error('MISSING_MERCHANT_ID'),
        { status: 400 }
      );
    }

    const merchantId = parseInt(merchantIdStr, 10);
    if (isNaN(merchantId)) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_MERCHANT_ID'),
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

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        ResponseBuilder.error('FILE_TOO_LARGE', {
          message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`
        }),
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_FILE_TYPE', {
          message: 'Only JSON files are supported'
        }),
        { status: 400 }
      );
    }

    // Parse options
    let options: { 
      skipDuplicates?: boolean; 
      validateOnly?: boolean;
      entities?: string[]; // ['customers', 'products', 'orders'] - if specified, only import these entities
      downloadImages?: boolean; // For products: download and upload images to S3
    } = {};
    if (optionsStr) {
      try {
        options = JSON.parse(optionsStr);
      } catch {
        // Use default options
      }
    }
    
    // Default: download images for products if not specified
    if (options.downloadImages === undefined) {
      options.downloadImages = true;
    }

    // Read and parse JSON file
    const fileContent = await file.text();
    let parsedData: any;
    try {
      parsedData = JSON.parse(fileContent);
    } catch (parseError: any) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_JSON', {
          message: `Failed to parse JSON: ${parseError.message}`
        }),
        { status: 400 }
      );
    }

    // Normalize import data - support both formats:
    // 1. Array directly: [customer1, customer2, ...]
    // 2. Object with data field: { data: { customers: [...] } }
    let importData: any;
    let detectedEntityType: string | null = null;
    
    if (Array.isArray(parsedData)) {
      // Direct array format - need entityType from formData
      if (!entityType) {
        return NextResponse.json(
          ResponseBuilder.error('MISSING_ENTITY_TYPE', {
            message: 'Entity type is required when importing array format. Please specify customers, products, or orders.'
          }),
          { status: 400 }
        );
      }
      detectedEntityType = entityType;
      importData = {
        data: {
          [entityType]: parsedData
        }
      };
    } else if (parsedData.data && typeof parsedData.data === 'object') {
      // Object with data field - detect entity type
      const dataKeys = Object.keys(parsedData.data);
      const validEntities = ['customers', 'products', 'orders'];
      const foundEntities = dataKeys.filter(key => validEntities.includes(key));
      
      if (foundEntities.length === 0) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ENTITY_TYPE', {
            message: 'No valid entities found in data. Expected customers, products, or orders.'
          }),
          { status: 400 }
        );
      }
      
      // If entityType specified, use it; otherwise use first found entity
      if (entityType && foundEntities.includes(entityType)) {
        detectedEntityType = entityType;
        // Filter to only the specified entity
        importData = {
          data: {
            [entityType]: parsedData.data[entityType] || []
          }
        };
      } else if (foundEntities.length === 1) {
        detectedEntityType = foundEntities[0];
        importData = {
          data: {
            [detectedEntityType]: parsedData.data[detectedEntityType] || []
          }
        };
      } else {
        // Multiple entities found but no entityType specified
        return NextResponse.json(
          ResponseBuilder.error('MULTIPLE_ENTITIES_FOUND', {
            message: `Multiple entities found: ${foundEntities.join(', ')}. Please specify entityType.`
          }),
          { status: 400 }
        );
      }
    } else {
      // Try to detect entity type from file name or content
      const fileName = file.name.toLowerCase();
      if (fileName.includes('customer')) {
        detectedEntityType = 'customers';
        importData = { data: { customers: Array.isArray(parsedData) ? parsedData : [parsedData] } };
      } else if (fileName.includes('product')) {
        detectedEntityType = 'products';
        importData = { data: { products: Array.isArray(parsedData) ? parsedData : [parsedData] } };
      } else if (fileName.includes('order')) {
        detectedEntityType = 'orders';
        importData = { data: { orders: Array.isArray(parsedData) ? parsedData : [parsedData] } };
      } else {
        return NextResponse.json(
          ResponseBuilder.error('CANNOT_DETECT_ENTITY', {
            message: 'Cannot detect entity type from file. Please specify entityType or use standard format.'
          }),
          { status: 400 }
        );
      }
    }

    // Validate import data
    const validation = validateImportData(importData, merchantId, 10);
    
    // If validateOnly, return preview and validation results
    if (options.validateOnly) {
      return NextResponse.json(
        ResponseBuilder.success('VALIDATION_COMPLETE', {
          valid: validation.valid,
          errors: validation.errors,
          preview: validation.preview
        })
      );
    }

    // If validation failed, return errors
    if (!validation.valid && validation.errors.length > 0) {
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_FAILED', {
          errors: validation.errors,
          preview: validation.preview
        }),
        { status: 400 }
      );
    }

    // Determine which entities to import (should be only one now)
    const availableEntities: string[] = [];
    if (importData.data?.customers && Array.isArray(importData.data.customers)) {
      availableEntities.push('customers');
    }
    if (importData.data?.products && Array.isArray(importData.data.products)) {
      availableEntities.push('products');
    }
    if (importData.data?.orders && Array.isArray(importData.data.orders)) {
      availableEntities.push('orders');
    }
    
    // Filter by options.entities if specified, otherwise use detected entity
    let entitiesToImport: string[] = [];
    if (options.entities && options.entities.length > 0) {
      entitiesToImport = availableEntities.filter(e => options.entities!.includes(e));
    } else if (detectedEntityType && availableEntities.includes(detectedEntityType)) {
      entitiesToImport = [detectedEntityType];
    } else {
      entitiesToImport = availableEntities;
    }
    
    if (entitiesToImport.length === 0) {
      return NextResponse.json(
        ResponseBuilder.error('NO_ENTITIES_TO_IMPORT', {
          message: 'No valid entities found in import data',
          availableEntities,
          detectedEntityType
        }),
        { status: 400 }
      );
    }
    
    // For single file import, should only have one entity
    if (entitiesToImport.length > 1) {
      return NextResponse.json(
        ResponseBuilder.error('MULTIPLE_ENTITIES_IN_FILE', {
          message: 'File contains multiple entities. Please import one entity type per file.',
          entities: entitiesToImport
        }),
        { status: 400 }
      );
    }

    // Create import session
    const syncSession = await db.sync.createSession({
      type: 'import',
      merchantId,
      entities: entitiesToImport,
      config: {
        fileName: file.name,
        fileSize: file.size,
        options,
        availableEntities,
        entitiesToImport
      }
    });

    // Start import process in background (don't await)
    processImportData(importData, merchantId, syncSession.id, options, entitiesToImport).catch((error) => {
      console.error('Error in background import process:', error);
      db.sync.updateStatus(syncSession.id, {
        status: 'FAILED',
        errorLog: [{ error: error.message, timestamp: new Date() }]
      });
    });

    return NextResponse.json(
      ResponseBuilder.success('IMPORT_STARTED', {
        sessionId: syncSession.id,
        status: 'PENDING',
        preview: validation.preview
      })
    );
  } catch (error: any) {
    console.error('Error in import:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * Process import data in background
 */
async function processImportData(
  importData: any,
  merchantId: number,
  sessionId: number,
  options: { 
    skipDuplicates?: boolean;
    downloadImages?: boolean;
  },
  entitiesToImport: string[] = []
) {
  const exportData = importData.data || importData;
  const stats: any = {};
  const errorLog: any[] = [];

  // Update session status to IN_PROGRESS
  await db.sync.updateStatus(sessionId, { status: 'IN_PROGRESS' });
  
  console.log(`📦 [IMPORT] Starting import for session ${sessionId}`);
  console.log(`📦 [IMPORT] Entities to import: ${entitiesToImport.join(', ')}`);
  console.log(`📦 [IMPORT] Download images: ${options.downloadImages !== false ? 'YES' : 'NO'}`);

  try {
    // Get default outlet and category
    const defaultOutlet = await db.outlets.search({ merchantId, isDefault: true, limit: 1 });
    if (!defaultOutlet.data || defaultOutlet.data.length === 0) {
      throw new Error('No default outlet found for merchant');
    }
    const outletId = defaultOutlet.data[0].id;

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

    // Import customers (only if in entitiesToImport)
    if (entitiesToImport.includes('customers') && exportData.customers && Array.isArray(exportData.customers)) {
      console.log(`📦 [IMPORT] Starting customers import: ${exportData.customers.length} records`);
      stats.customers = { total: exportData.customers.length, created: 0, failed: 0 };
      const batchSize = 50;

      for (let i = 0; i < exportData.customers.length; i += batchSize) {
        const batch = exportData.customers.slice(i, i + batchSize);
        
        for (const customerData of batch) {
          try {
            // Set merchantId
            customerData.merchantId = merchantId;
            
            const customer = await db.customers.create(customerData);
            stats.customers.created++;
            
            await db.sync.updateStatus(sessionId, {
              status: 'IN_PROGRESS',
              progress: {
                currentEntity: 'customers',
                currentEntityIndex: i + batch.indexOf(customerData),
                entityProgress: {
                  customers: {
                    processed: i + batch.indexOf(customerData) + 1,
                    total: exportData.customers.length,
                    lastProcessedIndex: i + batch.indexOf(customerData),
                    errors: stats.customers.failed
                  }
                }
              }
            });
          } catch (error: any) {
            stats.customers.failed++;
            errorLog.push({
              entity: 'customer',
              row: i + batch.indexOf(customerData),
              error: error.message
            });
          }
        }
      }
    }

    // Import products (only if in entitiesToImport)
    if (entitiesToImport.includes('products') && exportData.products && Array.isArray(exportData.products)) {
      console.log(`📦 [IMPORT] Starting products import: ${exportData.products.length} records`);
      stats.products = { total: exportData.products.length, created: 0, failed: 0, imagesDownloaded: 0, imagesFailed: 0 };
      const batchSize = 50;
      const productMap = new Map<string | number, number>(); // old product ID -> new product ID

      for (let i = 0; i < exportData.products.length; i += batchSize) {
        const batch = exportData.products.slice(i, i + batchSize);
        
        for (const productData of batch) {
          try {
            // Get old product ID for mapping
            const oldProductId = productData.oldProductId;
            
            // Set merchantId and categoryId
            productData.merchantId = merchantId;
            productData.categoryId = categoryId;
            
            // Remove oldProductId from data before creating
            delete productData.oldProductId;
            
            // Handle outletStock
            if (!productData.outletStock || !Array.isArray(productData.outletStock)) {
              productData.outletStock = [{
                outletId,
                stock: productData.totalStock || 0
              }];
            }

            // Download and upload images if enabled
            let uploadedImageUrls: string[] = [];
            if (options.downloadImages !== false) {
              try {
                // Check if product has image URLs (from old server or exported data)
                const imageUrls = productData.images || productData.image || productData.image_url || productData.image_urls || [];
                const hasImageUrls = Array.isArray(imageUrls) ? imageUrls.length > 0 : (typeof imageUrls === 'string' && imageUrls.trim().length > 0);
                
                if (hasImageUrls) {
                  console.log(`📸 [IMPORT] Downloading images for product ${i + batch.indexOf(productData) + 1}/${exportData.products.length}`);
                  
                  // Use downloadProductImagesForSync to download images
                  const imageResult = await downloadProductImagesForSync(productData);
                  
                  if (imageResult.downloadedImages && imageResult.downloadedImages.length > 0) {
                    // Upload each downloaded image to S3
                    for (const downloadedImage of imageResult.downloadedImages) {
                      try {
                        const uploadResult = await uploadToS3(downloadedImage.buffer, {
                          folder: 'products',
                          fileName: downloadedImage.fileName || `product-${Date.now()}.jpg`,
                          contentType: downloadedImage.contentType || 'image/jpeg'
                        });
                        
                        if (uploadResult.success && uploadResult.data?.url) {
                          // Use CloudFront URL if available, otherwise S3 URL
                          const imageUrl = uploadResult.data.cdnUrl || uploadResult.data.url;
                          uploadedImageUrls.push(imageUrl);
                          stats.products.imagesDownloaded++;
                          console.log(`✅ [IMPORT] Uploaded image: ${imageUrl}`);
                        } else {
                          stats.products.imagesFailed++;
                          console.warn(`⚠️ [IMPORT] Failed to upload image: ${uploadResult.error || 'Unknown error'}`);
                        }
                      } catch (uploadError: any) {
                        stats.products.imagesFailed++;
                        console.error(`❌ [IMPORT] Error uploading image:`, uploadError.message);
                        errorLog.push({
                          entity: 'product',
                          row: i + batch.indexOf(productData),
                          error: `Image upload failed: ${uploadError.message}`
                        });
                      }
                    }
                  }
                  
                  // Log image download errors if any
                  if (imageResult.errors && imageResult.errors.length > 0) {
                    stats.products.imagesFailed += imageResult.errors.length;
                    imageResult.errors.forEach((imgError) => {
                      errorLog.push({
                        entity: 'product',
                        row: i + batch.indexOf(productData),
                        error: `Image download failed: ${imgError.url} - ${imgError.error}`
                      });
                    });
                  }
                }
              } catch (imageError: any) {
                console.error(`❌ [IMPORT] Error processing images for product:`, imageError.message);
                errorLog.push({
                  entity: 'product',
                  row: i + batch.indexOf(productData),
                  error: `Image processing failed: ${imageError.message}`
                });
                // Continue with product creation even if images fail
              }
            }
            
            // Set images to uploaded URLs (or keep original if no images were processed)
            if (uploadedImageUrls.length > 0) {
              productData.images = uploadedImageUrls;
            } else if (!productData.images) {
              // If no images and no uploaded images, set empty array
              productData.images = [];
            }

            const product = await db.products.create(productData);
            
            // Map old product ID to new product ID
            if (oldProductId) {
              productMap.set(oldProductId, product.id);
            }
            // Also map by index as fallback
            productMap.set(i + batch.indexOf(productData), product.id);
            
            stats.products.created++;
            
            await db.sync.updateStatus(sessionId, {
              status: 'IN_PROGRESS',
              progress: {
                currentEntity: 'products',
                currentEntityIndex: i + batch.indexOf(productData),
                entityProgress: {
                  products: {
                    processed: i + batch.indexOf(productData) + 1,
                    total: exportData.products.length,
                    lastProcessedIndex: i + batch.indexOf(productData),
                    errors: stats.products.failed
                  }
                }
              }
            });
          } catch (error: any) {
            stats.products.failed++;
            errorLog.push({
              entity: 'product',
              row: i + batch.indexOf(productData),
              error: error.message
            });
          }
        }
      }
      
      console.log(`✅ [IMPORT] Products import completed: ${stats.products.created} created, ${stats.products.failed} failed`);
      console.log(`📸 [IMPORT] Images: ${stats.products.imagesDownloaded} downloaded, ${stats.products.imagesFailed} failed`);

      // Import orders (only if in entitiesToImport, must be after products)
      if (entitiesToImport.includes('orders') && exportData.orders && Array.isArray(exportData.orders)) {
        console.log(`📦 [IMPORT] Starting orders import: ${exportData.orders.length} records`);
        stats.orders = { total: exportData.orders.length, created: 0, failed: 0 };
        const batchSize = 50;

        for (let i = 0; i < exportData.orders.length; i += batchSize) {
          const batch = exportData.orders.slice(i, i + batchSize);
          
          for (const orderData of batch) {
            try {
              // Map product IDs from oldProductId to new product ID
              if (orderData.orderItems && Array.isArray(orderData.orderItems)) {
                orderData.orderItems = orderData.orderItems.map((item: any) => {
                  // If has oldProductId, map it to new product ID
                  if (item.oldProductId !== undefined && item.oldProductId !== null) {
                    const newProductId = productMap.get(item.oldProductId);
                    if (newProductId) {
                      item.productId = newProductId;
                    } else {
                      // Try to find by index as fallback
                      const productIndex = typeof item.oldProductId === 'number' ? item.oldProductId : parseInt(String(item.oldProductId), 10);
                      if (!isNaN(productIndex)) {
                        const fallbackProductId = productMap.get(productIndex);
                        if (fallbackProductId) {
                          item.productId = fallbackProductId;
                        }
                      }
                    }
                  }
                  // Remove oldProductId before saving
                  delete item.oldProductId;
                  return item;
                }).filter((item: any) => item.productId); // Remove items without productId
              }

              // Set outletId
              orderData.outletId = outletId;

              // Parse dates if they are strings
              const parseDate = (dateStr: any): Date | null => {
                if (!dateStr) return null;
                if (dateStr instanceof Date) return dateStr;
                if (typeof dateStr === 'string') {
                  const parsed = new Date(dateStr);
                  return isNaN(parsed.getTime()) ? null : parsed;
                }
                return null;
              };

              // Find customer by phone if provided
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
                    pickupPlanAt: parseDate(orderData.pickupPlanAt),
                    returnPlanAt: parseDate(orderData.returnPlanAt),
                    outletId,
                    customerId: orderData.customerId,
                    createdById: orderData.createdById || 0,
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

              stats.orders.created++;
              
              await db.sync.updateStatus(sessionId, {
                status: 'IN_PROGRESS',
                progress: {
                  currentEntity: 'orders',
                  currentEntityIndex: i + batch.indexOf(orderData),
                  entityProgress: {
                    orders: {
                      processed: i + batch.indexOf(orderData) + 1,
                      total: exportData.orders.length,
                      lastProcessedIndex: i + batch.indexOf(orderData),
                      errors: stats.orders.failed
                    }
                  }
                }
              });
            } catch (error: any) {
              stats.orders.failed++;
              errorLog.push({
                entity: 'order',
                row: i + batch.indexOf(orderData),
                error: error.message
              });
            }
          }
        }
        
        console.log(`✅ [IMPORT] Orders import completed: ${stats.orders.created} created, ${stats.orders.failed} failed`);
      }
    }

    // Update session status to COMPLETED
    await db.sync.updateStatus(sessionId, {
      status: 'COMPLETED',
      stats,
      errorLog: errorLog.length > 0 ? errorLog : undefined
    });

    console.log(`✅ Import completed for session ${sessionId}`);
  } catch (error: any) {
    console.error(`❌ Import failed for session ${sessionId}:`, error);
    await db.sync.updateStatus(sessionId, {
      status: 'FAILED',
      stats,
      errorLog: [
        ...errorLog,
        { error: error.message, timestamp: new Date() }
      ]
    });
  }
}

