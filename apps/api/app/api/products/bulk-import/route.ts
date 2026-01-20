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

    // Get all categories for mapping (by name to CUID)
    const categories = await db.categories.search({ merchantId, limit: 1000 });
    const categoryMap = new Map<string, string>(); // Map: name -> CUID
    categories.data?.forEach((cat: any) => {
      // cat.id from db.categories.search is CUID (string)
      categoryMap.set(cat.name.toLowerCase().trim(), String(cat.id));
    });

    // Ensure default category exists BEFORE import (create if not exists)
    const merchantCuid = merchant.id;
    let defaultCategoryCuid: string | undefined;
    
    // Check if default category exists in map
    const defaultCategoryName = 'default';
    const generalCategoryName = 'general';
    defaultCategoryCuid = categoryMap.get(defaultCategoryName) || categoryMap.get(generalCategoryName);
    
    if (!defaultCategoryCuid) {
      // Find in database
      const existingCategory = await prisma.category.findFirst({
        where: {
          merchantId: merchantCuid,
          name: { in: ['Default', 'default', 'General', 'general'] },
          isActive: true
        }
      });
      
      if (existingCategory) {
        defaultCategoryCuid = String(existingCategory.id); // Use CUID (string)
        // Add to map for later use
        categoryMap.set(existingCategory.name.toLowerCase().trim(), String(existingCategory.id));
      } else {
        // Create default category BEFORE import transaction
        console.log('🔧 Creating default category before import...');
        const newCategory = await prisma.category.create({
          data: {
            name: 'Default',
            description: 'Default category for products',
            merchantId: merchantCuid,
            isActive: true
          }
        });
        defaultCategoryCuid = String(newCategory.id); // Use CUID (string)
        // Add to map for later use
        categoryMap.set('default', String(newCategory.id));
        console.log('✅ Default category created:', newCategory.id);
      }
    }

    // Get or return default category CUID (now guaranteed to exist)
    const getDefaultCategoryCuid = (): string => {
      return defaultCategoryCuid!; // Already ensured to exist above
    };

    // Import products with transaction
    const results = await prisma.$transaction(async (tx: any) => {
      const imported: any[] = [];
      const errors: Array<{ row: number; error: string }> = [];

      for (let i = 0; i < products.length; i++) {
        const productData = products[i];
        const rowNumber = i + 1; // Start from 1 (matching UI display)

        try {
          // Map categoryName to categoryCUID
          let categoryCuid: string | undefined;
          const categoryName = (productData.categoryName || '').trim().toLowerCase();
          
          if (categoryName && categoryName !== 'default') {
            // Try to find category by name
            categoryCuid = categoryMap.get(categoryName);
            
            if (!categoryCuid) {
              errors.push({ 
                row: rowNumber, 
                error: `Category "${productData.categoryName}" not found` 
              });
              continue;
            }
          } else {
            // Use default category (already created before transaction)
            categoryCuid = getDefaultCategoryCuid();
          }

          // Validate product data (use publicId for categoryId in validation, but we'll use CUID when creating)
          // First, get category publicId for validation
          let categoryPublicId: number | undefined;
          if (categoryCuid) {
            const category = await tx.category.findUnique({
              where: { id: categoryCuid },
              select: { publicId: true }
            });
            if (category) {
              categoryPublicId = category.publicId;
            }
          }

          // Validate product data
          const productInput = {
            name: productData.name,
            description: productData.description || '',
            barcode: productData.barcode || '',
            categoryId: categoryPublicId,
            rentPrice: productData.rentPrice || 0,
            salePrice: productData.salePrice || 0,
            costPrice: productData.costPrice || 0,
            deposit: productData.deposit || 0,
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

