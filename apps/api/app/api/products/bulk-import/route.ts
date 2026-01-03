import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db, prisma } from '@rentalshop/database';
import { 
  handleApiError, 
  ResponseBuilder,
  productCreateSchema
} from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';
import { z } from 'zod';

const bulkImportSchema = z.object({
  products: z.array(z.any()).min(1, 'At least one product is required')
});

/**
 * POST /api/products/bulk-import
 * Bulk import products from Excel file
 * 
 * Authorization: All roles with 'products.manage' permission can access
 */
export const POST = withPermissions(['products.manage'])(async (request, { user, userScope }) => {
  try {
    const body = await request.json();
    
    // Validate request body
    const parsed = bulkImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { products } = parsed.data;

    // Resolve merchant ID
    let merchantId = userScope.merchantId;
    if (user.role === USER_ROLE.ADMIN && products[0]?.merchantId) {
      merchantId = products[0].merchantId;
    }
    if (!merchantId) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_ID_REQUIRED'),
        { status: 400 }
      );
    }

    // Get merchant CUID
    const merchant = await db.merchants.findById(merchantId);
    if (!merchant) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Get outlet ID (from user scope or first outlet)
    let outletId = userScope.outletId;
    if (!outletId) {
      const outlets = await db.outlets.search({ merchantId });
      if (!outlets.data || outlets.data.length === 0) {
        return NextResponse.json(
          ResponseBuilder.error('NO_OUTLETS_FOUND'),
          { status: 400 }
        );
      }
      outletId = outlets.data[0].id;
    }

    // Get outlet CUID
    const outlet = await db.outlets.findById(outletId);
    if (!outlet) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Get all categories for mapping
    const categories = await db.categories.search({ merchantId });
    const categoryMap = new Map<string, number>();
    categories.data?.forEach((cat: any) => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
    });

    // Import products with transaction
    const results = await prisma.$transaction(async (tx: any) => {
      const imported: any[] = [];
      const errors: Array<{ row: number; error: string }> = [];

      for (let i = 0; i < products.length; i++) {
        const productData = products[i];
        const rowNumber = i + 2; // +2 because Excel row 1 is header, data starts at row 2

        try {
          // Map categoryName to categoryId
          let categoryId: number | undefined;
          if (productData.categoryName) {
            const categoryNameLower = String(productData.categoryName).toLowerCase().trim();
            categoryId = categoryMap.get(categoryNameLower);
            
            if (!categoryId) {
              errors.push({ 
                row: rowNumber, 
                error: `Category "${productData.categoryName}" not found` 
              });
              continue;
            }
          }

          // Validate product data
          const productInput = {
            name: productData.name,
            description: productData.description,
            barcode: productData.barcode,
            categoryId,
            rentPrice: productData.rentPrice,
            salePrice: productData.salePrice,
            costPrice: productData.costPrice,
            deposit: productData.deposit,
            totalStock: productData.stock || 0,
            pricingType: productData.pricingType || null,
            durationConfig: productData.durationConfig || null,
            merchantId,
            outletStock: [{
              outletId,
              stock: productData.stock || 0
            }]
          };

          const validated = productCreateSchema.safeParse(productInput);
          if (!validated.success) {
            errors.push({ 
              row: rowNumber, 
              error: validated.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
            });
            continue;
          }

          // Get category CUID
          let categoryCuid: string | undefined;
          if (categoryId) {
            const category = await tx.category.findUnique({
              where: { id: categoryId }
            });
            if (category) {
              categoryCuid = category.id;
            }
          }

          // Create product
          const product = await tx.product.create({
            data: {
              name: validated.data.name,
              description: validated.data.description || null,
              barcode: validated.data.barcode || null,
              totalStock: validated.data.totalStock || 0,
              rentPrice: validated.data.rentPrice,
              salePrice: validated.data.salePrice || null,
              costPrice: validated.data.costPrice || null,
              deposit: validated.data.deposit || 0,
              pricingType: validated.data.pricingType || null,
              durationConfig: validated.data.durationConfig || null,
              merchantId: merchant.id,
              categoryId: categoryCuid,
              outletStock: {
                create: [{
                  outletId: outlet.id,
                  stock: validated.data.totalStock || 0,
                  available: validated.data.totalStock || 0,
                  renting: 0
                }]
              }
            },
            include: {
              category: { select: { id: true, name: true } },
              merchant: { select: { id: true, name: true } }
            }
          });

          imported.push(product);
        } catch (error: any) {
          errors.push({ 
            row: rowNumber, 
            error: error.message || 'Failed to import product' 
          });
        }
      }

      return { imported, errors };
    });

    return NextResponse.json(
      ResponseBuilder.success('PRODUCTS_IMPORTED', {
        imported: results.imported.length,
        failed: results.errors.length,
        total: products.length,
        errors: results.errors
      })
    );
  } catch (error) {
    console.error('Error in bulk import:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

