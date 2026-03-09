import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { 
  ResponseBuilder, 
  handleApiError, 
  formatFullName, 
  parseProductImages,
  generateStagingKey,
  generateFileName,
  splitKeyIntoParts,
  extractStagingKeysFromUrls,
  mapStagingUrlsToProductionUrls
} from '@rentalshop/utils';
import { uploadToS3, commitStagingFiles, createAuditHelper } from '@rentalshop/utils/server';
import { compressImageTo1MB } from '../../../../lib/image-compression';
import { API, USER_ROLE, ORDER_STATUS, VALIDATION } from '@rentalshop/constants';

export const runtime = 'nodejs';

function buildAuditContext(request: NextRequest, user: { id: number; email: string; role: string }, userScope: { merchantId?: number; outletId?: number }) {
  return {
    userId: String(user.id),
    userEmail: user.email,
    userRole: user.role,
    merchantId: userScope.merchantId != null ? String(userScope.merchantId) : undefined,
    outletId: userScope.outletId != null ? String(userScope.outletId) : undefined,
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    requestId: request.headers.get('x-request-id') || undefined
  };
}

/**
 * Helper function to validate image file
 */
function validateImage(file: File): { isValid: boolean; error?: string } {
  const ALLOWED_TYPES = VALIDATION.ALLOWED_IMAGE_TYPES;
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
  const MAX_FILE_SIZE = VALIDATION.MAX_FILE_SIZE;
  
  const fileTypeLower = file.type.toLowerCase().trim();
  const fileNameLower = file.name.toLowerCase().trim();
  
  const isValidMimeType = fileTypeLower ? ALLOWED_TYPES.some(type => 
    fileTypeLower === type.toLowerCase()
  ) : false;
  
  const isValidExtension = ALLOWED_EXTENSIONS.some(ext => 
    fileNameLower.endsWith(ext)
  );
  
  if (!isValidMimeType && !isValidExtension) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')} or extensions: ${ALLOWED_EXTENSIONS.join(',')}. File type: "${file.type}", File name: "${file.name}"`
    };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    };
  }
  
  if (file.size < 100) {
    return {
      isValid: false,
      error: 'File size is too small, file may be corrupted'
    };
  }
  
  return { isValid: true };
}

/**
 * Upload order notes images to S3
 */
async function uploadOrderNotesImages(
  imageFiles: File[],
  merchantId: number
): Promise<{ stagingKeys: string[]; urls: string[] }> {
  const stagingKeys: string[] = [];
  const urls: string[] = [];

  for (const file of imageFiles) {
    if (!file || file.size === 0) continue;

    const validation = validateImage(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'IMAGE_VALIDATION_FAILED');
    }

    const bytes = await file.arrayBuffer();
    const buffer = await compressImageTo1MB(Buffer.from(new Uint8Array(bytes)));

    if (buffer.length > VALIDATION.IMAGE_SIZES.PRODUCT) {
      throw new Error('IMAGE_TOO_LARGE');
    }

    const fileName = generateFileName(file.name.replace(/\.[^/.]+$/, '') || 'order-note-image');
    const stagingKey = generateStagingKey(fileName);
    const { folder, fileName: finalFileName } = splitKeyIntoParts(stagingKey);

    const uploadResult = await uploadToS3(buffer, {
      folder,
      fileName: finalFileName,
      contentType: 'image/jpeg',
      preserveOriginalName: false
    });

    if (!uploadResult.success || !uploadResult.data) {
      throw new Error('IMAGE_UPLOAD_FAILED');
    }

    stagingKeys.push(uploadResult.data.key);
    urls.push(uploadResult.data.url);
  }

  return { stagingKeys, urls };
}

/**
 * Commit staging images to production and return production URLs
 */
async function commitOrderNotesImages(
  imageUrls: string[],
  uploadedStagingKeys: string[],
  merchantId: number
): Promise<string[]> {
  if (!imageUrls || imageUrls.length === 0) return [];

  const extractedStagingKeys = extractStagingKeysFromUrls(imageUrls);
  const stagingKeys = [
    ...uploadedStagingKeys,
    ...extractedStagingKeys.filter(key => !uploadedStagingKeys.includes(key))
  ];

  if (stagingKeys.length === 0) return imageUrls;

  // Use orders folder structure: orders/merchant-{id}/notes/
  const fileName = generateFileName('order-note-image');
  const stagingKey = generateStagingKey(fileName);
  const { folder: targetFolder } = splitKeyIntoParts(stagingKey);
  const ordersFolder = `orders/merchant-${merchantId}/notes/`;

  const commitResult = await commitStagingFiles(stagingKeys, ordersFolder);

  if (!commitResult.success) {
    console.error('Failed to commit staging files:', commitResult.errors);
    return imageUrls; // Fallback to original URLs
  }

  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  if (!cloudfrontDomain) {
    console.error('AWS_CLOUDFRONT_DOMAIN not configured');
    return imageUrls;
  }

  const productionUrls = commitResult.committedKeys.map(key => 
    `https://${cloudfrontDomain}/${key}`
  );

  return mapStagingUrlsToProductionUrls(imageUrls, commitResult.committedKeys, productionUrls);
}

/**
 * GET /api/orders/[orderId]
 * Get order by ID
 * 
 * Authorization: All roles with 'orders.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * - No subscription required (read-only operation)
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) => {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { orderId } = resolvedParams;
  
  return withPermissions(['orders.view'], { requireActiveSubscription: false })(async (request, { user, userScope }) => {
    try {
      console.log('🔍 GET /api/orders/[orderId] - Looking for order with ID:', orderId);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(orderId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ORDER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const orderIdNum = parseInt(orderId);
      
      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }
      
      // Get order using the optimized database API
      const order: any = await db.orders.findByIdDetail(orderIdNum);

      if (!order) {
        console.log('❌ Order not found in database for orderId:', orderIdNum);
        throw new Error('Order not found');
      }

      console.log('✅ Order found:', order);

      // Flatten order items with parsed productImages
      // Priority 1: Use productImages (snapshot field saved when order was created)
      // Priority 2: Fallback to product.images (from product relation - current images)
      const flattenedOrder = {
        ...order,
        orderItems: order.orderItems?.map((item: any) => {
          // Parse snapshot images first
          const snapshotImages = parseProductImages(item.productImages);
          // If snapshot is empty array, fallback to product.images
          const productImages = snapshotImages.length > 0 
            ? snapshotImages 
            : parseProductImages(item.product?.images);
          
          return {
            ...item,
            productImages: productImages
          };
        }) || order.orderItems
      };

      // Normalize date fields to UTC ISO strings using toISOString()
      const normalizedOrder = {
        ...flattenedOrder,
        createdAt: flattenedOrder.createdAt?.toISOString() || null,
        updatedAt: flattenedOrder.updatedAt?.toISOString() || null,
        pickupPlanAt: flattenedOrder.pickupPlanAt?.toISOString() || null,
        returnPlanAt: flattenedOrder.returnPlanAt?.toISOString() || null,
        pickedUpAt: flattenedOrder.pickedUpAt?.toISOString() || null,
        returnedAt: flattenedOrder.returnedAt?.toISOString() || null,
      };

      return NextResponse.json({
        success: true,
        data: normalizedOrder,
        code: 'ORDER_RETRIEVED_SUCCESS',
        message: 'Order retrieved successfully'
      });

    } catch (error: any) {
      console.error('❌ Error fetching order:', error);
      
      // Use unified error handling system (uses ResponseBuilder internally)
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/orders/[orderId]
 * Update order by ID
 * 
 * Authorization: All roles with 'orders.update' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) => {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { orderId } = resolvedParams;
  
  return withPermissions(['orders.update'])(async (request, { user, userScope }) => {
    try {
      console.log(`🔍 PUT /api/orders/[orderId] - User: ${user.email} (${user.role})`);
      console.log(`🔍 PUT /api/orders/[orderId] - UserScope:`, userScope);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(orderId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ORDER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const orderIdNum = parseInt(orderId);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId && user.role !== USER_ROLE.ADMIN) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }

      // Check if request is FormData or JSON
      const contentType = request.headers.get('content-type') || '';
      const isFormData = contentType.includes('multipart/form-data');
      
      let body: any;
      
      if (isFormData) {
        // Parse multipart form data
        console.log('🔍 Processing multipart form data with image uploads');
        const formData = await request.formData();
        
        // Extract JSON data from 'data' field
        const jsonDataStr = formData.get('data') as string;
        if (!jsonDataStr) {
          return NextResponse.json(
            ResponseBuilder.error('MISSING_ORDER_DATA'),
            { status: 400 }
          );
        }
        
        try {
          body = JSON.parse(jsonDataStr);
        } catch (parseError) {
          return NextResponse.json(
            ResponseBuilder.error('INVALID_JSON_DATA'),
            { status: 400 }
          );
        }
        
        // Get existing order to merge with existing images
        let existingOrder: any = await db.orders.findById(orderIdNum);
        if (!existingOrder) {
          return NextResponse.json(
            ResponseBuilder.error('ORDER_NOT_FOUND'),
            { status: API.STATUS.NOT_FOUND }
          );
        }
        
        // Store existingOrder temporarily for reuse below
        body._existingOrder = existingOrder;
        
        // Helper function to combine images arrays
        const combineImages = (existing: string[] | null | undefined, newImages: string[]): string[] => {
          const existingArray = Array.isArray(existing) ? existing : [];
          return [...existingArray, ...newImages];
        };
        
        // Upload and process notesImages
        const notesImageFiles = formData.getAll('notesImages') as File[];
        if (notesImageFiles.length > 0) {
          try {
            const uploadResult = await uploadOrderNotesImages(notesImageFiles, userMerchantId || 0);
            const productionUrls = await commitOrderNotesImages(
              uploadResult.urls,
              uploadResult.stagingKeys,
              userMerchantId || 0
            );
            body.notesImages = combineImages(existingOrder.notesImages, productionUrls);
          } catch (error: any) {
            console.error('❌ Error uploading notesImages:', error);
            return NextResponse.json(
              ResponseBuilder.error('NOTES_IMAGES_UPLOAD_FAILED'),
              { status: 500 }
            );
          }
        }
        
        // Upload and process pickupNotesImages
        const pickupNotesImageFiles = formData.getAll('pickupNotesImages') as File[];
        if (pickupNotesImageFiles.length > 0) {
          try {
            const uploadResult = await uploadOrderNotesImages(pickupNotesImageFiles, userMerchantId || 0);
            const productionUrls = await commitOrderNotesImages(
              uploadResult.urls,
              uploadResult.stagingKeys,
              userMerchantId || 0
            );
            body.pickupNotesImages = combineImages(existingOrder.pickupNotesImages, productionUrls);
          } catch (error: any) {
            console.error('❌ Error uploading pickupNotesImages:', error);
            return NextResponse.json(
              ResponseBuilder.error('PICKUP_NOTES_IMAGES_UPLOAD_FAILED'),
              { status: 500 }
            );
          }
        }
        
        // Upload and process returnNotesImages
        const returnNotesImageFiles = formData.getAll('returnNotesImages') as File[];
        if (returnNotesImageFiles.length > 0) {
          try {
            const uploadResult = await uploadOrderNotesImages(returnNotesImageFiles, userMerchantId || 0);
            const productionUrls = await commitOrderNotesImages(
              uploadResult.urls,
              uploadResult.stagingKeys,
              userMerchantId || 0
            );
            body.returnNotesImages = combineImages(existingOrder.returnNotesImages, productionUrls);
          } catch (error: any) {
            console.error('❌ Error uploading returnNotesImages:', error);
            return NextResponse.json(
              ResponseBuilder.error('RETURN_NOTES_IMAGES_UPLOAD_FAILED'),
              { status: 500 }
            );
          }
        }
        
        // Upload and process damageNotesImages
        const damageNotesImageFiles = formData.getAll('damageNotesImages') as File[];
        if (damageNotesImageFiles.length > 0) {
          try {
            const uploadResult = await uploadOrderNotesImages(damageNotesImageFiles, userMerchantId || 0);
            const productionUrls = await commitOrderNotesImages(
              uploadResult.urls,
              uploadResult.stagingKeys,
              userMerchantId || 0
            );
            body.damageNotesImages = combineImages(existingOrder.damageNotesImages, productionUrls);
          } catch (error: any) {
            console.error('❌ Error uploading damageNotesImages:', error);
            return NextResponse.json(
              ResponseBuilder.error('DAMAGE_NOTES_IMAGES_UPLOAD_FAILED'),
              { status: 500 }
            );
          }
        }
        
        console.log('🔍 PUT /api/orders/[orderId] - Processed FormData with images');
      } else {
        // Parse JSON request body (backward compatibility)
        body = await request.json();
      }
      
      console.log('🔍 PUT /api/orders/[orderId] - Update request body:', body);

      // ✅ Auto-fill outletId from userScope if not provided
      if (!body.outletId && userScope.outletId) {
        console.log(`✅ Auto-filling outletId from userScope: ${userScope.outletId}`);
        body.outletId = userScope.outletId;
      }

      // Check if order exists and user has access to it
      // Note: If FormData was processed above, existingOrder was already fetched
      let existingOrder: any = isFormData ? body._existingOrder : null;
      if (!existingOrder) {
        existingOrder = await db.orders.findById(orderIdNum);
        if (!existingOrder) {
          return NextResponse.json(
            ResponseBuilder.error('ORDER_NOT_FOUND'),
            { status: API.STATUS.NOT_FOUND }
          );
        }
      } else {
        // Remove temporary field used for FormData processing
        delete body._existingOrder;
      }

      // ✅ Validate outletId if provided in update
      if (body.outletId !== undefined) {
        const targetOutletId = body.outletId;
        
        // If updating outletId, validate based on user role
        if (targetOutletId !== existingOrder.outletId) {
          // Get target outlet to validate
          const targetOutlet = await db.outlets.findById(targetOutletId);
          if (!targetOutlet) {
            return NextResponse.json(
              ResponseBuilder.error('OUTLET_NOT_FOUND'),
              { status: 404 }
            );
          }

          // Outlet users cannot change order outlet
          if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
            if (targetOutletId !== userScope.outletId) {
              return NextResponse.json(
                ResponseBuilder.error('CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET'),
                { status: 403 }
              );
            }
          }

          // Non-admin users can only move to outlets from same merchant
          if (user.role !== USER_ROLE.ADMIN) {
            // Get existing order's outlet to check merchant
            const existingOutlet = await db.outlets.findById(existingOrder.outletId);
            if (!existingOutlet) {
              return NextResponse.json(
                ResponseBuilder.error('OUTLET_NOT_FOUND'),
                { status: 404 }
              );
            }

            if (targetOutlet.merchantId !== existingOutlet.merchantId) {
              return NextResponse.json(
                ResponseBuilder.error('CANNOT_CREATE_ORDER_FOR_OTHER_MERCHANT'),
                { status: 403 }
              );
            }

            // Verify target outlet belongs to user's merchant
            if (targetOutlet.merchantId !== userScope.merchantId) {
              return NextResponse.json(
                ResponseBuilder.error('CANNOT_CREATE_ORDER_FOR_OTHER_MERCHANT'),
                { status: 403 }
              );
            }
          }
        } else if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
          // If not changing outletId but user is outlet-level, validate current order belongs to their outlet
          if (existingOrder.outletId !== userScope.outletId) {
            return NextResponse.json(
              ResponseBuilder.error('CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET'),
              { status: 403 }
            );
          }
        }
      } else {
        // If no outletId in update, validate existing order belongs to user's scope
        if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
          if (existingOrder.outletId !== userScope.outletId) {
            return NextResponse.json(
              ResponseBuilder.error('CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET'),
              { status: 403 }
            );
          }
        } else if (user.role !== USER_ROLE.ADMIN) {
          // Non-admin users can only update orders from their merchant
          const existingOutlet = await db.outlets.findById(existingOrder.outletId);
          if (existingOutlet && existingOutlet.merchantId !== userScope.merchantId) {
            return NextResponse.json(
              ResponseBuilder.error('CANNOT_UPDATE_ORDER_FROM_OTHER_MERCHANT'),
              { status: 403 }
            );
          }
        }
      }

      // Filter to only valid Order fields (exclude calculated fields like subtotal, taxAmount, id)
      const { subtotal, taxAmount, id, ...validUpdateData } = body;
      
      console.log('🔧 Filtered update data keys:', Object.keys(validUpdateData));

      // Update the order using the simplified database API
      const updatedOrder = await db.orders.update(orderIdNum, validUpdateData);
      const auditHelper = createAuditHelper(prisma);
      await auditHelper.logUpdate({
        entityType: 'Order',
        entityId: String(orderIdNum),
        entityName: existingOrder.orderNumber || String(orderIdNum),
        oldValues: existingOrder as Record<string, any>,
        newValues: updatedOrder as Record<string, any>,
        description: `Order updated: ${existingOrder.orderNumber || orderIdNum}`,
        context: buildAuditContext(request, user, userScope)
      }).catch((err) => console.error('Audit log update failed:', err));
      console.log('✅ Order updated successfully:', updatedOrder);

      // Get full order details after update (with all relations)
      const fullOrder: any = await db.orders.findByIdDetail(orderIdNum);
      
      console.log('🔍 PUT /api/orders/[orderId]: Full order after update:', {
        orderId: orderIdNum,
        orderItemsCount: fullOrder?.orderItems?.length,
        firstItem: fullOrder?.orderItems?.[0],
        firstItemProduct: fullOrder?.orderItems?.[0]?.product,
        firstItemProductName: fullOrder?.orderItems?.[0]?.productName,
        firstItemHasProduct: !!fullOrder?.orderItems?.[0]?.product,
        firstItemHasProductName: !!fullOrder?.orderItems?.[0]?.productName
      });
      
      if (!fullOrder) {
        return NextResponse.json(
          ResponseBuilder.error('ORDER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }
      
      // Flatten order response (consistent with create order response)
      const flattenedOrder = {
        id: fullOrder.id,
        orderNumber: fullOrder.orderNumber,
        orderType: fullOrder.orderType,
        status: fullOrder.status,
        outletId: fullOrder.outletId,
        outletName: fullOrder.outlet?.name || null,
        customerId: fullOrder.customerId,
        customerFirstName: fullOrder.customer?.firstName || null,
        customerLastName: fullOrder.customer?.lastName || null,
        customerName: fullOrder.customer ? formatFullName(fullOrder.customer.firstName, fullOrder.customer.lastName) : null,
        customerPhone: fullOrder.customer?.phone || null,
        customerEmail: fullOrder.customer?.email || null,
        merchantId: null, // Will be populated from outlet if needed
        merchantName: null, // Will be populated from outlet if needed
        createdById: fullOrder.createdById,
        createdByName: fullOrder.createdBy ? formatFullName(fullOrder.createdBy.firstName, fullOrder.createdBy.lastName) : null,
        totalAmount: fullOrder.totalAmount,
        depositAmount: fullOrder.depositAmount,
        securityDeposit: fullOrder.securityDeposit,
        damageFee: fullOrder.damageFee,
        lateFee: fullOrder.lateFee,
        discountType: fullOrder.discountType,
        discountValue: fullOrder.discountValue,
        discountAmount: fullOrder.discountAmount,
        pickupPlanAt: fullOrder.pickupPlanAt,
        returnPlanAt: fullOrder.returnPlanAt,
        pickedUpAt: fullOrder.pickedUpAt,
        returnedAt: fullOrder.returnedAt,
        rentalDuration: fullOrder.rentalDuration,
        isReadyToDeliver: fullOrder.isReadyToDeliver,
        collateralType: fullOrder.collateralType,
        collateralDetails: fullOrder.collateralDetails,
        notes: fullOrder.notes,
        pickupNotes: fullOrder.pickupNotes,
        returnNotes: fullOrder.returnNotes,
        damageNotes: fullOrder.damageNotes,
        createdAt: fullOrder.createdAt,
        updatedAt: fullOrder.updatedAt,
        // Flatten order items with product info
        orderItems: fullOrder.orderItems?.map((item: any) => {
          // Priority 1: Use productImages (snapshot field saved when order was created)
          // Priority 2: Fallback to product.images (from product relation - current images)
          const snapshotImages = parseProductImages(item.productImages);
          const productImages = snapshotImages.length > 0 
            ? snapshotImages 
            : parseProductImages(item.product?.images);
          
          const productName = item.product?.name || item.productName || null;
          const productBarcode = item.product?.barcode || item.productBarcode || null;

          console.log('🔍 PUT /api/orders/[orderId]: Mapping orderItem:', {
            itemId: item.id,
            productId: item.productId,
            hasProduct: !!item.product,
            productNameFromProduct: item.product?.name,
            productNameFromSnapshot: item.productName,
            finalProductName: productName,
            productBarcodeFromProduct: item.product?.barcode,
            productBarcodeFromSnapshot: item.productBarcode,
            finalProductBarcode: productBarcode
          });

          return {
            id: item.id,
            productId: item.productId,
            productName: productName,
            productBarcode: productBarcode,
            productImages: productImages,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            deposit: item.deposit,
            notes: item.notes,
            rentalDays: item.rentalDays,
            // Include product object if available (for backward compatibility)
            product: item.product || null
          };
        }) || [],
        // Calculated fields
        itemCount: fullOrder.orderItems?.length || 0,
        paymentCount: fullOrder.payments?.length || 0,
        totalPaid: fullOrder.payments?.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0) || 0
      };

      // Normalize date fields to UTC ISO strings using toISOString()
      const normalizedOrder = {
        ...flattenedOrder,
        createdAt: flattenedOrder.createdAt?.toISOString() || null,
        updatedAt: flattenedOrder.updatedAt?.toISOString() || null,
        pickupPlanAt: flattenedOrder.pickupPlanAt?.toISOString() || null,
        returnPlanAt: flattenedOrder.returnPlanAt?.toISOString() || null,
        pickedUpAt: flattenedOrder.pickedUpAt?.toISOString() || null,
        returnedAt: flattenedOrder.returnedAt?.toISOString() || null,
      };

      return NextResponse.json({
        success: true,
        data: normalizedOrder,
        code: 'ORDER_UPDATED_SUCCESS',
        message: 'Order updated successfully'
      });

    } catch (error: any) {
      console.error('❌ Error updating order:', error);
      
      // Use unified error handling system (uses ResponseBuilder internally)
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/orders/[orderId]
 * Soft delete order by ID
 * 
 * Authorization: Users with 'orders.manage' permission can delete orders
 * - ADMIN: can delete any order regardless of status
 * - MERCHANT, OUTLET_ADMIN: can only delete CANCELLED orders
 * - OUTLET_STAFF: cannot delete orders (no orders.manage permission)
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) => {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { orderId } = resolvedParams;
  
  return withPermissions(['orders.manage'])(async (request, { user, userScope }) => {
    try {
      console.log(`🔍 DELETE /api/orders/[orderId] - User: ${user.email} (${user.role})`);
      console.log(`🔍 DELETE /api/orders/[orderId] - UserScope:`, userScope);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(orderId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ORDER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const orderIdNum = parseInt(orderId);

      // Check if order exists and user has access to it
      const existingOrder = await db.orders.findById(orderIdNum);
      if (!existingOrder) {
        return NextResponse.json(
          ResponseBuilder.error('ORDER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Only allow deleting CANCELLED orders for MERCHANT and OUTLET_ADMIN
      // ADMIN can delete any order regardless of status
      // OUTLET_STAFF cannot delete orders (no orders.manage permission)
      if (user.role !== USER_ROLE.ADMIN && existingOrder.status !== ORDER_STATUS.CANCELLED) {
          return NextResponse.json(
            ResponseBuilder.error('CANNOT_DELETE_NON_CANCELLED_ORDER'),
            { status: API.STATUS.FORBIDDEN }
          );
        }

      // Authorization checks based on user role
      // OUTLET_STAFF cannot delete orders (no orders.manage permission, but double-check here)
      if (user.role === USER_ROLE.OUTLET_STAFF) {
        return NextResponse.json(
          ResponseBuilder.error('INSUFFICIENT_PERMISSIONS'),
          { status: API.STATUS.FORBIDDEN }
        );
      }

      if (user.role === USER_ROLE.OUTLET_ADMIN) {
        // Outlet admin can only delete orders from their outlet
        if (existingOrder.outletId !== userScope.outletId) {
          return NextResponse.json(
            ResponseBuilder.error('CANNOT_DELETE_ORDER_FROM_OTHER_OUTLET'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
      } else if (user.role !== USER_ROLE.ADMIN) {
        // MERCHANT can only delete orders from their merchant
        const existingOutlet = await db.outlets.findById(existingOrder.outletId);
        if (existingOutlet && existingOutlet.merchantId !== userScope.merchantId) {
          return NextResponse.json(
            ResponseBuilder.error('CANNOT_DELETE_ORDER_FROM_OTHER_MERCHANT'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
      }

      // Soft delete the order
      await db.orders.softDelete(orderIdNum);
      const auditHelper = createAuditHelper(prisma);
      await auditHelper.logDelete({
        entityType: 'Order',
        entityId: String(orderIdNum),
        entityName: existingOrder.orderNumber || String(orderIdNum),
        oldValues: existingOrder as Record<string, any>,
        description: `Order deleted: ${existingOrder.orderNumber || orderIdNum}`,
        context: buildAuditContext(request, user, userScope)
      }).catch((err) => console.error('Audit log delete failed:', err));
      console.log('✅ Order soft deleted successfully:', orderIdNum);

      return NextResponse.json(
        ResponseBuilder.success('ORDER_DELETED_SUCCESS', {
          id: orderIdNum,
          deletedAt: new Date().toISOString()
        })
      );

    } catch (error: any) {
      console.error('❌ Error deleting order:', error);
      
      // Use unified error handling system (uses ResponseBuilder internally)
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}