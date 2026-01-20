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

    // Get all categories for mapping (by name to categoryId - number)
    const categories = await db.categories.search({ merchantId, limit: 1000 });
    const categoryMap = new Map<string, number>(); // Map: name -> categoryId (number)
    categories.data?.forEach((cat: any) => {
      // cat.id from db.categories.search is number (publicId) - Category.id is Int in schema
      categoryMap.set(cat.name.toLowerCase().trim(), Number(cat.id));
    });

    // Ensure default category exists BEFORE import (create if not exists)
    // merchant.id is number (publicId), not CUID
    const merchantPublicId = merchant.id;
    let defaultCategoryId: number | undefined;
    
    // Check if default category exists in map
    const defaultCategoryName = 'default';
    const generalCategoryName = 'general';
    defaultCategoryId = categoryMap.get(defaultCategoryName) || categoryMap.get(generalCategoryName);
    
    if (!defaultCategoryId) {
      // Find in database - merchantId is Int (number) in schema
      const existingCategory = await prisma.category.findFirst({
        where: {
          merchantId: merchantPublicId, // Use number (publicId), not CUID
          name: { in: ['Default', 'default', 'General', 'general'] },
          isActive: true
        }
      });
      
      if (existingCategory) {
        // category.id is Int (number) in schema
        defaultCategoryId = existingCategory.id;
        // Add to map for later use
        categoryMap.set(existingCategory.name.toLowerCase().trim(), existingCategory.id);
      } else {
        // Create default category BEFORE import transaction
        console.log('🔧 Creating default category before import...');
        const newCategory = await prisma.category.create({
          data: {
            name: 'Default',
            description: 'Default category for products',
            merchantId: merchantPublicId, // Use number (publicId), not CUID
            isActive: true
          }
        });
        defaultCategoryId = newCategory.id; // number
        // Add to map for later use
        categoryMap.set('default', newCategory.id);
        console.log('✅ Default category created:', newCategory.id);
      }
    }

    // Get or return default category ID (now guaranteed to exist)
    const getDefaultCategoryId = (): number => {
      return defaultCategoryId!; // Already ensured to exist above
    };

    // Import products with transaction
    const results = await prisma.$transaction(async (tx: any) => {
      const imported: any[] = [];
      const errors: Array<{ row: number; error: string }> = [];

      for (let i = 0; i < products.length; i++) {
        const productData = products[i];
        const rowNumber = i + 1; // Start from 1 (matching UI display)

        try {
          // Map categoryName to categoryId (number)
          let categoryId: number | undefined;
          const categoryName = (productData.categoryName || '').trim().toLowerCase();
          
          if (categoryName && categoryName !== 'default') {
            // Try to find category by name
            categoryId = categoryMap.get(categoryName);
            
            if (!categoryId) {
              errors.push({ 
                row: rowNumber, 
                error: `Category "${productData.categoryName}" not found` 
              });
              continue;
            }
          } else {
            // Use default category (already created before transaction)
            categoryId = getDefaultCategoryId();
          }

          // Ensure categoryId is valid
          if (!categoryId || typeof categoryId !== 'number') {
            errors.push({ 
              row: rowNumber, 
              error: 'Category not found. Please check category name or use default category.' 
            });
            continue;
          }

          // Validate product data
          const productInput = {
            name: productData.name,
            description: productData.description || '',
            barcode: productData.barcode || '',
            categoryId: categoryId, // Use number (publicId) directly
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
          // All IDs are numbers (publicId) in schema: merchantId, categoryId, outletId
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
              merchantId: merchant.id, // number (publicId)
              categoryId: categoryId, // number (publicId)
              outletStock: {
                create: [{
                  outletId: outlet.id, // number (publicId)
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
          // Format user-friendly error message
          let errorMessage = 'Failed to import product';
          
          if (error.code === 'P2002') {
            // Unique constraint violation
            errorMessage = 'Product name or barcode already exists';
          } else if (error.code === 'P2003') {
            // Foreign key constraint violation
            errorMessage = 'Invalid category or merchant reference';
          } else if (error.message) {
            // Check if it's a technical error or user-friendly
            const technicalErrors = [
              'Invalid value provided',
              'Expected Int',
              'Expected String',
              'prisma',
              'Prisma',
              'invocation',
              'route.js'
            ];
            
            const isTechnicalError = technicalErrors.some(tech => error.message.includes(tech));
            
            if (isTechnicalError) {
              // Technical error - use generic message
              errorMessage = 'Invalid data format or missing required information';
            } else {
              // User-friendly error - use as is
              errorMessage = error.message;
            }
          }
          
          errors.push({ 
            row: rowNumber, 
            error: errorMessage
          });
          
          // Log technical details for debugging
          console.error(`Error importing product at row ${rowNumber}:`, {
            message: error.message,
            code: error.code,
            stack: error.stack
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
  } catch (error: any) {
    console.error('Error in bulk import:', error);
    
    // Format user-friendly error message
    let errorMessage = 'Failed to import products. Please check your file format and try again.';
    
    if (error.message) {
      const technicalErrors = [
        'Invalid value provided',
        'Expected Int',
        'Expected String',
        'prisma',
        'Prisma',
        'invocation',
        'route.js'
      ];
      
      const isTechnicalError = technicalErrors.some(tech => error.message.includes(tech));
      
      if (!isTechnicalError) {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      ResponseBuilder.error('IMPORT_FAILED'),
      { status: 500 }
    );
  }
});

