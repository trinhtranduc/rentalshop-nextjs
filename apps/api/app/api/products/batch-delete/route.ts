import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { deleteFromS3, extractS3KeyFromUrl, parseProductImages } from '@rentalshop/utils/server';
import { API, USER_ROLE } from '@rentalshop/constants';
import { z } from 'zod';

export const runtime = 'nodejs';

/**
 * Batch delete schema
 */
const batchDeleteSchema = z.object({
  productIds: z.array(z.number().int().positive()).min(1, 'At least one product ID is required').max(3000, 'Cannot delete more than 3000 products at once'),
});

/**
 * POST /api/products/batch-delete
 * Soft delete multiple products in batch
 * 
 * Authorization: Users with 'products.manage' permission can delete products
 */
export const POST = withPermissions(['products.manage'])(async (request, { user, userScope }) => {
  try {
    console.log(`🔍 POST /api/products/batch-delete - User: ${user.email} (${user.role})`);

    const body = await request.json();
    
    // Validate input
    const parsed = batchDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { productIds } = parsed.data;

    // Get user scope for merchant isolation
    const userMerchantId = userScope.merchantId;
    
    // ADMIN users can delete products without merchantId (they have system-wide access)
    // Non-admin users need merchantId
    if (user.role !== USER_ROLE.ADMIN && !userMerchantId) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
        { status: 400 }
      );
    }

    // Fetch all products to validate
    const products = await prisma.product.findMany({
      where: {
        publicId: { in: productIds },
        isActive: true, // Only active products
      },
      include: {
        merchant: {
          select: {
            id: true,
            publicId: true,
          },
        },
      },
    });

    // Check if all products exist
    const foundIds = new Set(products.map(p => p.publicId));
    const notFoundIds = productIds.filter(id => !foundIds.has(id));
    
    if (notFoundIds.length > 0) {
      return NextResponse.json(
        ResponseBuilder.error('PRODUCTS_NOT_FOUND', {
          notFoundIds,
          message: `Products with IDs ${notFoundIds.join(', ')} not found or already deleted`
        }),
        { status: 404 }
      );
    }

    // Check authorization: verify all products belong to user's merchant
    const unauthorizedProducts: Array<{ id: number; name: string }> = [];
    
    if (user.role !== USER_ROLE.ADMIN) {
      for (const product of products) {
        const productMerchantId = product.merchant?.publicId;
        if (productMerchantId !== userMerchantId) {
          unauthorizedProducts.push({
            id: product.publicId,
            name: product.name,
          });
        }
      }
    }

    if (unauthorizedProducts.length > 0) {
      return NextResponse.json(
        ResponseBuilder.error('UNAUTHORIZED_TO_DELETE_SOME_PRODUCTS', {
          unauthorizedProducts,
          message: `You don't have permission to delete ${unauthorizedProducts.length} product(s)`
        }),
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // All validations passed - proceed with batch delete
    const deletedProducts: Array<{ id: number; name: string }> = [];
    const errors: Array<{ id: number; name: string; error: string }> = [];

    // Process each product deletion with better error handling
    for (const product of products) {
      try {
        // Delete product images from S3 (non-blocking - continue even if S3 fails)
        const imageUrls = parseProductImages(product.images);
        if (imageUrls.length > 0) {
          const deletePromises = imageUrls.map(async (imageUrl) => {
            try {
              const s3Key = extractS3KeyFromUrl(imageUrl);
              if (s3Key) {
                await deleteFromS3(s3Key);
                console.log(`✅ Deleted image from S3: ${s3Key} for product ${product.publicId}`);
              }
            } catch (error: any) {
              // Log but don't fail the entire deletion if S3 fails
              console.error(`⚠️ Warning: Failed to delete image ${imageUrl} for product ${product.publicId}:`, error?.message || error);
            }
          });
          // Don't await - let it run in background, don't block deletion
          Promise.all(deletePromises).catch((error) => {
            console.error(`⚠️ Warning: Some S3 deletions failed for product ${product.publicId}:`, error);
          });
        }

        // Delete embeddings from Qdrant (background job - non-blocking)
        try {
          const { getVectorStore } = await import('@rentalshop/database/server');
          const vectorStore = getVectorStore();
          // Fire and forget - don't block deletion if Qdrant fails
          vectorStore.deleteProductEmbeddings(product.publicId).catch((error: any) => {
            console.error(`⚠️ Warning: Failed to delete embeddings for product ${product.publicId}:`, error?.message || error);
          });
        } catch (error: any) {
          // Log but don't fail - Qdrant is optional
          console.error(`⚠️ Warning: Could not start embedding deletion for product ${product.publicId}:`, error?.message || error);
        }

        // Soft delete by setting isActive to false (this is the critical operation)
        await prisma.product.update({
          where: { id: product.id },
          data: { isActive: false },
        });

        deletedProducts.push({
          id: product.publicId,
          name: product.name,
        });
      } catch (error: any) {
        // Only database errors should cause failure
        const errorMessage = error?.message || 'Failed to delete product';
        errors.push({
          id: product.publicId,
          name: product.name,
          error: errorMessage,
        });
        console.error(`❌ Error deleting product ${product.publicId}:`, {
          message: errorMessage,
          code: error?.code,
          name: error?.name,
        });
      }
    }

    console.log(`✅ Batch deleted ${deletedProducts.length} products successfully (${errors.length} failed)`);

    // If all products failed, return error
    if (deletedProducts.length === 0 && errors.length > 0) {
      const firstError = errors[0];
      return NextResponse.json(
        ResponseBuilder.error('BATCH_DELETE_FAILED', {
          message: `Failed to delete all products. First error: ${firstError.error}`,
          errors,
        }),
        { status: 500 }
      );
    }

    // If some succeeded, return partial success
    return NextResponse.json(
      ResponseBuilder.success('PRODUCTS_BATCH_DELETED_SUCCESS', {
        deleted: deletedProducts.length,
        failed: errors.length,
        total: productIds.length,
        deletedProducts,
        errors: errors.length > 0 ? errors : undefined,
      })
    );
  } catch (error: any) {
    console.error('❌ Error in batch delete products:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack?.substring(0, 500), // Limit stack trace length
    });
    
    // Check for specific error types that should return SERVICE_UNAVAILABLE
    if (
      error?.code === 'P1001' || // Prisma connection error
      error?.code === 'ECONNREFUSED' || // Connection refused
      error?.message?.includes('timeout') ||
      error?.message?.includes('TIMEOUT') ||
      error?.code === 'ETIMEDOUT' ||
      error?.status === 502 || // Bad Gateway
      error?.code === 502
    ) {
      return NextResponse.json(
        ResponseBuilder.error('SERVICE_UNAVAILABLE'),
        { status: 503 }
      );
    }
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
