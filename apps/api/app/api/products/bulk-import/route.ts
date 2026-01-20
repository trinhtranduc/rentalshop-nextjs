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

    // Step 1: Validate ALL products BEFORE transaction (all-or-nothing)
    const validationErrors: Array<{ row: number; error: string }> = [];
    const validatedProducts: any[] = [];

    for (let i = 0; i < products.length; i++) {
      const productData = products[i];
      const rowNumber = i + 1; // Start from 1 (matching UI display)

      try {
        // Convert barcode: number -> string
        let barcode = productData.barcode || '';
        if (typeof barcode === 'number') {
          barcode = String(barcode);
        }
        
        // Convert stock: ensure non-negative (if < 0 then = 0)
        let stock = productData.stock ? parseInt(String(productData.stock)) : 0;
        if (stock < 0) {
          stock = 0;
        }

        // Map categoryName to categoryId (number)
        let categoryId: number | undefined;
        const categoryName = (productData.categoryName || '').trim().toLowerCase();
        
        if (categoryName && categoryName !== 'default') {
          // Try to find category by name
          categoryId = categoryMap.get(categoryName);
          
          if (!categoryId) {
            validationErrors.push({ 
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
          validationErrors.push({ 
            row: rowNumber, 
            error: 'Category not found. Please check category name or use default category.' 
          });
          continue;
        }

        // Validate product data with converted values
        const productInput = {
          name: productData.name,
          description: productData.description || '',
          barcode: barcode, // Converted to string
          categoryId: categoryId, // Use number (publicId) directly
          rentPrice: productData.rentPrice || 0,
          salePrice: productData.salePrice || 0,
          costPrice: productData.costPrice || 0,
          deposit: productData.deposit || 0,
          totalStock: stock, // Converted to non-negative
          pricingType: productData.pricingType || null,
          durationConfig: productData.durationConfig || null,
          merchantId,
          outletStock: [{
            outletId,
            stock: stock // Converted to non-negative
          }]
        };

        const validated = productCreateSchema.safeParse(productInput);
        if (!validated.success) {
          validationErrors.push({ 
            row: rowNumber, 
            error: validated.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          });
          continue;
        }

        validatedProducts.push({
          rowNumber,
          data: validated.data,
          categoryId
        });
      } catch (error: any) {
        // Format user-friendly error message with details
        let errorMessage = 'Failed to validate product';
        
        // Convert type names to user-friendly messages
        const typeMap: Record<string, string> = {
          'Int': 'number',
          'String': 'text',
          'Float': 'decimal number',
          'Boolean': 'true/false',
          'DateTime': 'date/time'
        };
        
        if (error.message) {
          // Try to extract useful information from Prisma/validation errors
          const message = error.message;
          
          // Check for Prisma type errors and extract details
          if (message.includes('Expected Int') || message.includes('Expected String') || message.includes('Expected')) {
            // Parse Prisma validation errors
            const expectedMatch = message.match(/Expected (\w+), provided (\w+)/i);
            const fieldMatch = message.match(/Argument `(\w+)`/i) || message.match(/Field `(\w+)`/i);
            
            if (expectedMatch && fieldMatch) {
              const field = fieldMatch[1];
              const expected = expectedMatch[1];
              const provided = expectedMatch[2];
              
              const expectedType = typeMap[expected] || expected.toLowerCase();
              const providedType = typeMap[provided] || provided.toLowerCase();
              
              errorMessage = `${field}: Expected ${expectedType}, but received ${providedType}`;
            } else if (expectedMatch) {
              const expected = expectedMatch[1];
              const provided = expectedMatch[2];
              const expectedType = typeMap[expected] || expected.toLowerCase();
              const providedType = typeMap[provided] || provided.toLowerCase();
              errorMessage = `Invalid data type: Expected ${expectedType}, but received ${providedType}`;
            } else {
              // Try to extract field name from error message
              const fieldMatch2 = message.match(/`(\w+)`/);
              if (fieldMatch2) {
                errorMessage = `${fieldMatch2[1]}: Invalid data format`;
              } else {
                errorMessage = 'Invalid data format or missing required information';
              }
            }
          } else if (message.includes('Invalid value provided')) {
            // Try to extract field name
            const fieldMatch = message.match(/Argument `(\w+)`/i) || message.match(/Field `(\w+)`/i);
            if (fieldMatch) {
              errorMessage = `${fieldMatch[1]}: Invalid value provided`;
            } else {
              errorMessage = 'Invalid value provided for one or more fields';
            }
          } else if (!message.includes('prisma') && !message.includes('Prisma') && !message.includes('invocation') && !message.includes('route.js')) {
            // User-friendly error - use as is
            errorMessage = message;
          } else {
            // Generic technical error
            errorMessage = 'Invalid data format or missing required information';
          }
        }
        
        validationErrors.push({ 
          row: rowNumber, 
          error: errorMessage
        });
        
        // Log technical details for debugging
        console.error(`Error validating product at row ${rowNumber}:`, {
          message: error.message,
          code: error.code,
          stack: error.stack,
          productData: productData
        });
      }
    }

    // Step 2: If ANY validation errors, return errors WITHOUT importing anything (all-or-nothing)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        ResponseBuilder.success('PRODUCTS_IMPORTED', {
          imported: 0,
          failed: validationErrors.length,
          total: products.length,
          errors: validationErrors
        })
      );
    }

    // Step 3: Check for duplicates and filter them out
    const productsToImport: any[] = [];
    const skipped: Array<{ row: number; reason: string }> = [];

    // Check duplicates before transaction
    // Only check by barcode - allow duplicate product names
    for (const validatedProduct of validatedProducts) {
      try {
        // Only check duplicate by barcode (if barcode exists)
        // Allow duplicate product names as long as barcode is different
        if (validatedProduct.data.barcode && validatedProduct.data.barcode.trim() !== '') {
          const existingProduct = await prisma.product.findFirst({
            where: {
              merchantId: merchant.id,
              barcode: validatedProduct.data.barcode.trim()
            }
          });

          if (existingProduct) {
            skipped.push({
              row: validatedProduct.rowNumber,
              reason: 'Product with this barcode already exists'
            });
            continue;
          }
        }

        productsToImport.push(validatedProduct);
      } catch (error: any) {
        // If error checking duplicate, skip this product
        skipped.push({
          row: validatedProduct.rowNumber,
          reason: 'Failed to check duplicate'
        });
        console.error(`Error checking duplicate for product at row ${validatedProduct.rowNumber}:`, error);
      }
    }

    // Step 4: Import non-duplicate products in a single transaction
    if (productsToImport.length === 0) {
      return NextResponse.json(
        ResponseBuilder.success('PRODUCTS_IMPORTED', {
          imported: 0,
          skipped: skipped.length,
          failed: 0,
          total: products.length,
          errors: []
        })
      );
    }

    try {
      const results = await prisma.$transaction(async (tx: any) => {
        const imported: any[] = [];

        for (const validatedProduct of productsToImport) {
          try {
            // Create product
            // All IDs are numbers (publicId) in schema: merchantId, categoryId, outletId
            const product = await tx.product.create({
              data: {
                name: validatedProduct.data.name,
                description: validatedProduct.data.description || null,
                barcode: validatedProduct.data.barcode || null,
                totalStock: validatedProduct.data.totalStock || 0,
                rentPrice: validatedProduct.data.rentPrice,
                salePrice: validatedProduct.data.salePrice || null,
                costPrice: validatedProduct.data.costPrice || null,
                deposit: validatedProduct.data.deposit || 0,
                pricingType: validatedProduct.data.pricingType || null,
                durationConfig: validatedProduct.data.durationConfig || null,
                merchantId: merchant.id, // number (publicId)
                categoryId: validatedProduct.categoryId, // number (publicId)
                outletStock: {
                  create: [{
                    outletId: outlet.id, // number (publicId)
                    stock: validatedProduct.data.totalStock || 0,
                    available: validatedProduct.data.totalStock || 0,
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
            // If ANY error during transaction, throw to rollback entire transaction
            // Format user-friendly error message with details
            let errorMessage = 'Failed to import product';
            
            if (error.code === 'P2002') {
              // Unique constraint violation (should not happen as we checked, but handle just in case)
              errorMessage = 'Product name or barcode already exists';
            } else if (error.code === 'P2003') {
              // Foreign key constraint violation
              errorMessage = 'Invalid category or merchant reference';
            } else if (error.message) {
              const message = error.message;
              
              // Convert type names to user-friendly messages
              const typeMap: Record<string, string> = {
                'Int': 'number',
                'String': 'text',
                'Float': 'decimal number',
                'Boolean': 'true/false',
                'DateTime': 'date/time'
              };
              
              // Try to extract useful information from Prisma/validation errors
              if (message.includes('Expected Int') || message.includes('Expected String') || message.includes('Expected')) {
                // Parse Prisma validation errors
                const expectedMatch = message.match(/Expected (\w+), provided (\w+)/i);
                const fieldMatch = message.match(/Argument `(\w+)`/i) || message.match(/Field `(\w+)`/i);
                
                if (expectedMatch && fieldMatch) {
                  const field = fieldMatch[1];
                  const expected = expectedMatch[1];
                  const provided = expectedMatch[2];
                  
                  const expectedType = typeMap[expected] || expected.toLowerCase();
                  const providedType = typeMap[provided] || provided.toLowerCase();
                  
                  errorMessage = `${field}: Expected ${expectedType}, but received ${providedType}`;
                } else if (expectedMatch) {
                  const expected = expectedMatch[1];
                  const provided = expectedMatch[2];
                  const expectedType = typeMap[expected] || expected.toLowerCase();
                  const providedType = typeMap[provided] || provided.toLowerCase();
                  errorMessage = `Invalid data type: Expected ${expectedType}, but received ${providedType}`;
                } else {
                  const fieldMatch2 = message.match(/`(\w+)`/);
                  if (fieldMatch2) {
                    errorMessage = `${fieldMatch2[1]}: Invalid data format`;
                  } else {
                    errorMessage = 'Invalid data format or missing required information';
                  }
                }
              } else if (message.includes('Invalid value provided')) {
                const fieldMatch = message.match(/Argument `(\w+)`/i) || message.match(/Field `(\w+)`/i);
                if (fieldMatch) {
                  errorMessage = `${fieldMatch[1]}: Invalid value provided`;
                } else {
                  errorMessage = 'Invalid value provided for one or more fields';
                }
              } else if (!message.includes('prisma') && !message.includes('Prisma') && !message.includes('invocation') && !message.includes('route.js')) {
                // User-friendly error - use as is
                errorMessage = message;
              } else {
                // Generic technical error
                errorMessage = 'Invalid data format or missing required information';
              }
            }
            
            // Log technical details for debugging
            console.error(`Error importing product at row ${validatedProduct.rowNumber}:`, {
              message: error.message,
              code: error.code,
              stack: error.stack,
              productData: validatedProduct.data
            });
            
            // Throw error with row number to rollback entire transaction (all-or-nothing)
            throw new Error(`Row ${validatedProduct.rowNumber}: ${errorMessage}`);
          }
        }

        return { imported };
      });

      return NextResponse.json(
        ResponseBuilder.success('PRODUCTS_IMPORTED', {
          imported: results.imported.length,
          skipped: skipped.length,
          failed: 0,
          total: products.length,
          errors: []
        })
      );
    } catch (transactionError: any) {
      // Transaction failed - rollback occurred automatically
      // Format user-friendly error message
      let errorMessage = 'Failed to import products. Transaction rolled back.';
      
      if (transactionError.message) {
        // Check if error message contains row number
        if (transactionError.message.includes('Row ')) {
          // Extract row number and error
          const match = transactionError.message.match(/Row (\d+): (.+)/);
          if (match) {
            const rowNumber = parseInt(match[1]);
            const rowError = match[2];
            
            return NextResponse.json(
              ResponseBuilder.success('PRODUCTS_IMPORTED', {
                imported: 0,
                failed: 1,
                total: products.length,
                errors: [{ row: rowNumber, error: rowError }]
              })
            );
          }
        }
        
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
        
        const isTechnicalError = technicalErrors.some(tech => transactionError.message.includes(tech));
        
        if (!isTechnicalError) {
          errorMessage = transactionError.message;
        }
      }
      
      // Log technical details for debugging
      console.error('Transaction error in bulk import:', {
        message: transactionError.message,
        code: transactionError.code,
        stack: transactionError.stack
      });
      
      return NextResponse.json(
        ResponseBuilder.success('PRODUCTS_IMPORTED', {
          imported: 0,
          failed: products.length,
          total: products.length,
          errors: [{ row: 1, error: errorMessage }]
        })
      );
    }
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

