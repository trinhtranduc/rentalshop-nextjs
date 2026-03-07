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
  productIds: z.array(z.number().int().positive()).min(1, 'At least one product ID is required').max(100, 'Cannot delete more than 100 products at once'),
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

    // Process each product deletion
    for (const product of products) {
      try {
        // Delete product images from S3
        const imageUrls = parseProductImages(product.images);
        if (imageUrls.length > 0) {
          const deletePromises = imageUrls.map(async (imageUrl) => {
            try {
              const s3Key = extractS3KeyFromUrl(imageUrl);
              if (s3Key) {
                await deleteFromS3(s3Key);
                console.log(`✅ Deleted image from S3: ${s3Key} for product ${product.publicId}`);
              }
            } catch (error) {
              console.error(`Error deleting image ${imageUrl} for product ${product.publicId}:`, error);
            }
          });
          await Promise.all(deletePromises);
        }

        // Delete embeddings from Qdrant (background job)
        try {
          const { getVectorStore } = await import('@rentalshop/database/server');
          const vectorStore = getVectorStore();
          vectorStore.deleteProductEmbeddings(product.publicId).catch((error: any) => {
            console.error(`Error deleting embeddings for product ${product.publicId}:`, error);
          });
        } catch (error) {
          console.error('Error starting embedding deletion:', error);
        }

        // Soft delete by setting isActive to false
        await prisma.product.update({
          where: { id: product.id },
          data: { isActive: false },
        });

        deletedProducts.push({
          id: product.publicId,
          name: product.name,
        });
      } catch (error: any) {
        errors.push({
          id: product.publicId,
          name: product.name,
          error: error.message || 'Failed to delete product',
        });
        console.error(`Error deleting product ${product.publicId}:`, error);
      }
    }

    console.log(`✅ Batch deleted ${deletedProducts.length} products successfully`);

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
    console.error('❌ Error in batch delete products:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
