import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { 
  handleApiError, 
  ResponseBuilder,
  productCreateSchema, clientSafeErrorText, isTechnicalErrorText } from '@rentalshop/utils';
import { API, USER_ROLE, isOutletRole } from '@rentalshop/constants';
import { z } from 'zod';
import {
  OutletTallies,
  existingProductWrites,
  newProductStockRows,
  readRowOutlets,
  rowBranches,
  unknownOutletIds,
  usesBranches,
  type BranchQty,
} from '../../../../lib/import-branch-plan';
import { RowResults } from '../../../../lib/import-row-results';

const MAX_IMPORT_ROWS = 3000;

const bulkImportSchema = z.object({
  products: z
    .array(z.any())
    .min(1, 'At least one product is required')
    .max(MAX_IMPORT_ROWS, `Maximum allowed is ${MAX_IMPORT_ROWS} rows`),
  // #1533: the branch the file's stock belongs to (optional; without it and without `products[].outlets`, as before)
  outletId: z.number().int().positive().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Type mapping for user-friendly error messages
 */
const TYPE_MAP: Record<string, string> = {
  'Int': 'number',
  'String': 'text',
  'Float': 'decimal number',
  'Boolean': 'true/false',
  'DateTime': 'date/time'
};

/**
 * Technical error keywords to filter out
 */
const TECHNICAL_ERROR_KEYWORDS = [
  'prisma', 'Prisma', 'invocation', 'route.js', 
  'Invalid value provided', 'Expected Int', 'Expected String'
];

/**
 * Check if error message is technical (should be hidden from users)
 */
function isTechnicalError(message: string): boolean {
  return isTechnicalErrorText(message) || TECHNICAL_ERROR_KEYWORDS.some(keyword => message.includes(keyword));
}

/**
 * Format Zod validation errors with detailed field information
 */
function formatZodError(error: z.ZodError, productInput: any): string {
  return error.errors.map(e => {
    const fieldPath = e.path.join('.');
    const fieldName = fieldPath || 'unknown field';
    const receivedValue = e.path.reduce((obj: any, key) => obj?.[key], productInput);
    
    let errorMsg = `${fieldName}: ${e.message}`;
    
    // Add received value if available and not too long
    if (receivedValue !== undefined && receivedValue !== null) {
      const valueType = typeof receivedValue;
      const valueStr = valueType === 'object' ? JSON.stringify(receivedValue) : String(receivedValue);
      if (valueStr.length < 50) {
        errorMsg += ` (received: ${valueStr})`;
      }
    }
    
    return errorMsg;
  }).join('; ');
}

/**
 * Format Prisma/validation errors to user-friendly messages
 */
function formatPrismaError(error: any, productData?: any): string {
  if (!error.message) {
    return 'Invalid data format or missing required information';
  }

  const message = error.message;

  // Handle Prisma error codes
  if (error.code === 'P2002') {
    return 'Product barcode already exists';
  }
  if (error.code === 'P2003') {
    return 'Invalid category or merchant reference';
  }

  // Handle ZodError
  if (error.name === 'ZodError' && error.errors) {
    return error.errors.map((e: any) => {
      const fieldPath = e.path.join('.');
      return `${fieldPath || 'unknown field'}: ${e.message}`;
    }).join('; ');
  }

  // Parse Prisma type errors
  if (message.includes('Expected')) {
    const expectedMatch = message.match(/Expected (\w+), provided (\w+)/i);
    const fieldMatch = message.match(/Argument `(\w+)`/i) || message.match(/Field `(\w+)`/i);
    
    if (expectedMatch && fieldMatch) {
      const field = fieldMatch[1];
      const expected = expectedMatch[1];
      const provided = expectedMatch[2];
      const expectedType = TYPE_MAP[expected] || expected.toLowerCase();
      const providedType = TYPE_MAP[provided] || provided.toLowerCase();
      return `${field}: Expected ${expectedType}, but received ${providedType}`;
    }
    
    if (expectedMatch) {
      const expected = expectedMatch[1];
      const provided = expectedMatch[2];
      const expectedType = TYPE_MAP[expected] || expected.toLowerCase();
      const providedType = TYPE_MAP[provided] || provided.toLowerCase();
      return `Invalid data type: Expected ${expectedType}, but received ${providedType}`;
    }
    
    const fieldMatch2 = message.match(/`(\w+)`/);
    if (fieldMatch2) {
      return `${fieldMatch2[1]}: Invalid data format`;
    }
  }

  // Handle "Invalid value provided" errors
  if (message.includes('Invalid value provided')) {
    const fieldMatch = message.match(/Argument `(\w+)`/i) || message.match(/Field `(\w+)`/i);
    if (fieldMatch) {
      return `${fieldMatch[1]}: Invalid value provided`;
    }
    return 'Invalid value provided for one or more fields';
  }

  // Use user-friendly errors as-is, filter technical errors
  if (isTechnicalError(message)) {
    // For technical errors, try to show data summary if available
    if (productData) {
      const dataSummary = Object.keys(productData)
        .map(key => {
          const value = productData[key as keyof typeof productData];
          const valueType = typeof value;
          const valueStr = valueType === 'object' ? JSON.stringify(value) : String(value);
          return `${key}=${valueStr.length > 30 ? valueStr.substring(0, 30) + '...' : valueStr}`;
        })
        .join(', ');
      return `Invalid data format or missing required information. Provided data: ${dataSummary}`;
    }
    return 'Invalid data format or missing required information';
  }

  return clientSafeErrorText(error, 'Invalid data format or missing required information');
}

/**
 * Normalize product data before validation
 */
function normalizeProductData(productData: any, merchantId: number, outletId: number) {
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

  // Helper function to parse price (handles 0, null, undefined, string)
  const parsePrice = (value: any): number => {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    // If already a number, return it (including 0)
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : Math.max(0, value); // Ensure non-negative
    }
    // If string, try to parse
    const str = String(value).trim();
    if (str === '' || str === 'null' || str === 'undefined') {
      return 0;
    }
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : Math.max(0, parsed); // Ensure non-negative
  };

  return {
    name: productData.name,
    description: productData.description || '',
    barcode,
    rentPrice: parsePrice(productData.rentPrice),
    salePrice: parsePrice(productData.salePrice),
    costPrice: parsePrice(productData.costPrice),
    deposit: parsePrice(productData.deposit),
    totalStock: stock,
    pricingType: productData.pricingType || null,
    durationConfig: productData.durationConfig || null,
    merchantId,
    outletStock: [{
      outletId,
      stock
    }]
  };
}

/**
 * Ensure default category exists, return its ID
 */
async function ensureDefaultCategory(merchantPublicId: number, categoryMap: Map<string, number>): Promise<number> {
  const defaultCategoryName = 'default';
  const generalCategoryName = 'general';
  
  // Check if default category exists in map
  let defaultCategoryId = categoryMap.get(defaultCategoryName) || categoryMap.get(generalCategoryName);
  
  if (defaultCategoryId) {
    return defaultCategoryId;
  }

  // Find in database
  const existingCategory = await prisma.category.findFirst({
    where: {
      merchantId: merchantPublicId,
      name: { in: ['Default', 'default', 'General', 'general'] },
      isActive: true
    }
  });
  
  if (existingCategory) {
    categoryMap.set(existingCategory.name.toLowerCase().trim(), existingCategory.id);
    return existingCategory.id;
  }

  // Create default category
  console.log('🔧 Creating default category before import...');
  const newCategory = await prisma.category.create({
    data: {
      name: 'Default',
      description: 'Default category for products',
      merchantId: merchantPublicId,
      isActive: true
    }
  });
  
  categoryMap.set('default', newCategory.id);
  console.log('✅ Default category created:', newCategory.id);
  
  return newCategory.id;
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

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

    // Get merchant
    const merchant = await db.merchants.findById(merchantId);
    if (!merchant) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_NOT_FOUND'),
        { status: 404 }
      );
    }

    // #825 (owner 2026-10-11): outlet staff do not add products, even with a customised permission
    if (user.role === USER_ROLE.OUTLET_STAFF) {
      return NextResponse.json(
        ResponseBuilder.error('INSUFFICIENT_PERMISSIONS'),
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // #825: a branch role always imports into its own outlet; without one it is refused
    if (isOutletRole(user.role) && !userScope.outletId) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_REQUIRED'),
        { status: API.STATUS.FORBIDDEN }
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

    // Get outlet
    const outlet = await db.outlets.findById(outletId);
    if (!outlet) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_NOT_FOUND'),
        { status: 404 }
      );
    }

    // #825: each new product also gets a 0-stock row at every other active outlet of the shop
    const activeOutlets = await prisma.outlet.findMany({
      where: { merchantId: merchant.id, isActive: true },
      select: { id: true },
    });
    // #1341: the import branch lists what it imports; every other active branch gets a 0 row that is NOT listed
    const otherOutletIds = Array.from(new Set<number>(activeOutlets.map((o: { id: number }) => o.id))).filter((id) => id !== outlet.id);

    // #1533: the caller names the branches (`outletId` on the body, `outlets` on a row): stock and "Hiện" per branch.
    // A branch role only ever writes its own outlet; the owner may only name active outlets of the shop.
    const branchMode = usesBranches(parsed.data.outletId, products);
    const activeIds: number[] = Array.from(new Set<number>(activeOutlets.map((o: { id: number }) => o.id)));
    const ownOutletId: number | null = isOutletRole(user.role) ? Number(userScope.outletId) : null;
    // Outlets a new product gets a stock row at
    const stockOutletIds = ownOutletId !== null && !activeIds.includes(ownOutletId) ? [ownOutletId, ...activeIds] : activeIds;
    const bodyOutletId: number | null = ownOutletId ?? parsed.data.outletId ?? null;
    if (branchMode && ownOutletId === null) {
      const named: number[] = parsed.data.outletId !== undefined ? [parsed.data.outletId] : [];
      for (const p of products) {
        const rowOutlets = readRowOutlets(p?.outlets);
        if (Array.isArray(rowOutlets)) named.push(...rowOutlets.map((o) => o.outletId));
      }
      if (unknownOutletIds(named, activeIds).length > 0) {
        return NextResponse.json(ResponseBuilder.error('OUTLET_NOT_FOUND'), { status: 404 });
      }
    }
    const tallies = new OutletTallies(stockOutletIds);
    // #1535: one entry per product sent, returned as `rows`
    const rowResults = new RowResults(products.length);

    // Build category map
    const categories = await db.categories.search({ merchantId, limit: 1000 });
    const categoryMap = new Map<string, number>();
    categories.data?.forEach((cat: any) => {
      categoryMap.set(cat.name.toLowerCase().trim(), Number(cat.id));
    });

    // Ensure default category exists
    const merchantPublicId = merchant.id;
    const defaultCategoryId = await ensureDefaultCategory(merchantPublicId, categoryMap);

    // ========================================================================
    // STEP 1: Validate ALL products BEFORE transaction (all-or-nothing)
    // ========================================================================
    const validationErrors: Array<{ row: number; error: string }> = [];
    // `branches`: #1533 the ticked branches of the row (empty when the call does not name branches)
    const validatedProducts: Array<{ rowNumber: number; data: any; categoryId: number; branches: BranchQty[] }> = [];

      for (let i = 0; i < products.length; i++) {
        const productData = products[i];
      const rowNumber = i + 1;

        try {
        // Normalize product data
        const normalizedData = normalizeProductData(productData, merchantId, outletId);

          // Map categoryName to categoryId
        let categoryId: number;
        const categoryName = (productData.categoryName || '').trim().toLowerCase();
        
        if (categoryName && categoryName !== 'default') {
          categoryId = categoryMap.get(categoryName) || defaultCategoryId;
          if (!categoryMap.has(categoryName)) {
            validationErrors.push({ 
                row: rowNumber, 
                error: `Category "${productData.categoryName}" not found` 
              });
              continue;
            }
        } else {
          categoryId = defaultCategoryId;
          }

        // Validate with schema
          const productInput = {
          ...normalizedData,
          categoryId
          };

          const validated = productCreateSchema.safeParse(productInput);
          if (!validated.success) {
          const errorMessage = formatZodError(validated.error, productInput);
          validationErrors.push({ row: rowNumber, error: errorMessage });
          
          console.error(`Zod validation error at row ${rowNumber}:`, {
            errors: validated.error.errors,
            productInput,
            productData
          });
          continue;
        }

        let branches: BranchQty[] = [];
        if (branchMode) {
          const rowOutlets = readRowOutlets(productData?.outlets);
          if (rowOutlets === 'invalid') {
            validationErrors.push({ row: rowNumber, error: 'outlets: each branch needs an outlet and a whole quantity of 0 or more' });
            continue;
          }
          branches = rowBranches({ rowOutlets, rowStock: Number(validated.data.totalStock) || 0, bodyOutletId, ownOutletId });
          if (branches.length === 0) {
            validationErrors.push({ row: rowNumber, error: 'Choose at least one branch for this product' });
            continue;
          }
        }

        validatedProducts.push({
          rowNumber,
          data: validated.data,
          categoryId,
          branches
        });
      } catch (error: any) {
        const errorMessage = formatPrismaError(error, productData);
        validationErrors.push({ row: rowNumber, error: errorMessage });
        
        console.error(`Error validating product at row ${rowNumber}:`, {
          message: error.message,
          code: error.code,
          name: error.name,
          stack: error.stack,
          productData
        });
      }
    }

    // If ANY validation errors, return errors WITHOUT importing (all-or-nothing)
    if (validationErrors.length > 0) {
      for (const e of validationErrors) rowResults.set({ row: e.row, status: 'failed', error: e.error });
      return NextResponse.json(
        ResponseBuilder.success('PRODUCTS_IMPORTED', {
          imported: 0,
          failed: validationErrors.length,
          total: products.length,
          errors: validationErrors,
          rows: rowResults.toJSON()
        })
      );
    }

    // ========================================================================
    // STEP 2: Check for duplicates and filter them out
    // ========================================================================
    const productsToImport: typeof validatedProducts = [];
    // #1533: existing products (same barcode) that get stock at branches where they have none
    const productsToUpdate: Array<{ rowNumber: number; productId: number; write: Array<BranchQty & { renting: number }>; skippedOutlets: number[] }> = [];
    const skipped: Array<{ row: number; reason: string }> = [];

    for (const validatedProduct of validatedProducts) {
      try {
        // Only check duplicate by barcode (if barcode exists)
        // Allow duplicate product names as long as barcode is different
        if (validatedProduct.data.barcode && validatedProduct.data.barcode.trim() !== '') {
          const existingProduct = await prisma.product.findFirst({
            where: {
              merchantId: merchant.id,
              barcode: validatedProduct.data.barcode.trim()
            },
            ...(branchMode
              ? { select: { id: true, name: true, deletedAt: true, outletStock: { select: { outletId: true, stock: true, renting: true } } } }
              : {})
          });

          if (existingProduct) {
            // #1533: a live product gets stock at the ticked branches that hold none; a branch with stock is left alone
            if (branchMode && !existingProduct.deletedAt) {
              const current: Array<{ outletId: number; stock: number; renting?: number | null }> =
                (existingProduct as { outletStock?: Array<{ outletId: number; stock: number; renting?: number | null }> }).outletStock || [];
              const { write, skipped: holding } = existingProductWrites(validatedProduct.branches, current);
              tallies.skipped(holding);
              if (write.length > 0) {
                productsToUpdate.push({
                  rowNumber: validatedProduct.rowNumber,
                  productId: existingProduct.id,
                  write: write.map((b) => ({ ...b, renting: Number(current.find((c) => c.outletId === b.outletId)?.renting) || 0 })),
                  skippedOutlets: holding,
                });
                continue;
              }
              rowResults.duplicate(validatedProduct.rowNumber, existingProduct, holding);
            } else {
              rowResults.duplicate(validatedProduct.rowNumber, existingProduct);
            }
            skipped.push({
              row: validatedProduct.rowNumber,
              reason: 'Product with this barcode already exists'
            });
            continue;
          }
        }

        productsToImport.push(validatedProduct);
      } catch (error: any) {
        skipped.push({
          row: validatedProduct.rowNumber,
          reason: 'Failed to check duplicate'
        });
        rowResults.set({ row: validatedProduct.rowNumber, status: 'failed', error: 'Failed to check duplicate' });
        console.error(`Error checking duplicate for product at row ${validatedProduct.rowNumber}:`, error);
      }
    }

    // If all products are duplicates, return early
    if (productsToImport.length === 0 && productsToUpdate.length === 0) {
      return NextResponse.json(
        ResponseBuilder.success('PRODUCTS_IMPORTED', {
          imported: 0,
          skipped: skipped.length,
          failed: 0,
          total: products.length,
          errors: [],
          ...(branchMode ? { updated: 0, byOutlet: tallies.toJSON() } : {}),
          rows: rowResults.toJSON()
        })
      );
    }

    // ========================================================================
    // STEP 3: Import non-duplicate products in a single transaction
    // ========================================================================
    try {
      // Calculate timeout based on number of products (60 seconds per 1000 products, min 30s)
      const estimatedTimeout = Math.max(30000, Math.ceil(((productsToImport.length + productsToUpdate.length) / 1000) * 60000));

      const results = await prisma.$transaction(async (tx: any) => {
        const imported: any[] = [];
        const transactionSkipped: Array<{ row: number; reason: string }> = [];
        let updated = 0;

        for (const validatedProduct of productsToImport) {
          // #1533: ticked branches listed with their stock, every other outlet an unlisted 0 row
          const stockRows = branchMode
            ? newProductStockRows(validatedProduct.branches, stockOutletIds)
            : [
                {
                  outletId: outlet.id,
                  stock: validatedProduct.data.totalStock || 0,
                  available: validatedProduct.data.totalStock || 0,
                  renting: 0,
                  isListed: true
                },
                ...otherOutletIds.map((outletId) => ({ outletId, stock: 0, available: 0, renting: 0, isListed: false }))
              ];
          const totalStock = branchMode
            ? validatedProduct.branches.reduce((sum, b) => sum + b.stock, 0)
            : validatedProduct.data.totalStock || 0;
          try {
            // Create product without include to improve performance
          const product = await tx.product.create({
            data: {
                name: validatedProduct.data.name,
                description: validatedProduct.data.description || null,
                barcode: validatedProduct.data.barcode || null,
                totalStock,
                rentPrice: validatedProduct.data.rentPrice,
                salePrice: validatedProduct.data.salePrice || null,
                costPrice: validatedProduct.data.costPrice || null,
                deposit: validatedProduct.data.deposit || 0,
                pricingType: validatedProduct.data.pricingType || null,
                durationConfig: validatedProduct.data.durationConfig || null,
              merchantId: merchant.id,
                categoryId: validatedProduct.categoryId,
              outletStock: {
                create: stockRows
              }
            },
              select: {
                id: true,
                name: true
            }
          });

          imported.push(product);
          rowResults.set({ row: validatedProduct.rowNumber, status: 'created' });
          if (branchMode) tallies.listed(validatedProduct.branches);
        } catch (error: any) {
            // If duplicate (P2002), skip and continue instead of throwing
            if (error.code === 'P2002') {
              // Unique constraint violation - skip this product and continue
              transactionSkipped.push({
                row: validatedProduct.rowNumber,
                reason: 'Product with this barcode already exists'
              });
              rowResults.duplicate(validatedProduct.rowNumber, null);
              console.log(`Skipping duplicate product at row ${validatedProduct.rowNumber}`);
              continue; // Skip this product and continue with next
            }
            
            // For other errors, throw to rollback transaction
            const errorMessage = formatPrismaError(error);
            console.error(`Error importing product at row ${validatedProduct.rowNumber}:`, {
              message: error.message,
              code: error.code,
              stack: error.stack,
              productData: validatedProduct.data
            });
            
            throw new Error(`Row ${validatedProduct.rowNumber}: ${errorMessage}`);
          }
        }

        // #1533: existing products: stock at the ticked branches that held none, listed; totalStock = sum of every row
        for (const update of productsToUpdate) {
          try {
            for (const b of update.write) {
              const available = Math.max(0, b.stock - b.renting);
              await tx.outletStock.upsert({
                where: { productId_outletId: { productId: update.productId, outletId: b.outletId } },
                create: { productId: update.productId, outletId: b.outletId, stock: b.stock, available, renting: 0, isListed: true },
                update: { stock: b.stock, available, isListed: true },
              });
            }
            const sum = await tx.outletStock.aggregate({ where: { productId: update.productId }, _sum: { stock: true } });
            await tx.product.update({ where: { id: update.productId }, data: { totalStock: sum?._sum?.stock ?? 0 } });
          } catch (error: unknown) {
            const errorMessage = formatPrismaError(error);
            const e = error as { message?: string; code?: string };
            console.error(`Error adding branch stock at row ${update.rowNumber}:`, { message: e.message, code: e.code });
            throw new Error(`Row ${update.rowNumber}: ${errorMessage}`);
          }
          updated += 1;
          rowResults.set({ row: update.rowNumber, status: 'updated', outlets: update.write.map((b) => b.outletId), skippedOutlets: update.skippedOutlets });
          tallies.listed(update.write);
        }

        return { imported, skipped: transactionSkipped, updated };
      }, {
        maxWait: 10000, // Wait up to 10 seconds to acquire transaction lock
        timeout: estimatedTimeout // Dynamic timeout based on product count
      });

      // Combine pre-transaction skipped with transaction skipped
      const allSkipped = [...skipped, ...(results.skipped || [])];

      return NextResponse.json(
        ResponseBuilder.success('PRODUCTS_IMPORTED', {
          imported: results.imported.length,
          skipped: allSkipped.length,
          failed: 0,
          total: products.length,
          errors: [],
          ...(branchMode ? { updated: results.updated, byOutlet: tallies.toJSON() } : {}),
          rows: rowResults.toJSON()
        })
      );
    } catch (transactionError: any) {
      // Transaction failed - rollback occurred automatically
      rowResults.rollback();
      let errorMessage = 'Failed to import products. Transaction rolled back.';
      
      if (transactionError.message) {
        // Extract row number and error from transaction error
        if (transactionError.message.includes('Row ')) {
          const match = transactionError.message.match(/Row (\d+): (.+)/);
          if (match) {
            const rowNumber = parseInt(match[1]);
            const rowError = clientSafeErrorText({ message: match[2] }, errorMessage);
            rowResults.set({ row: rowNumber, status: 'failed', error: rowError });
            
            return NextResponse.json(
              ResponseBuilder.success('PRODUCTS_IMPORTED', {
                imported: 0,
                failed: 1,
                total: products.length,
                errors: [{ row: rowNumber, error: rowError }],
                rows: rowResults.toJSON()
              })
            );
          }
        }
        
        // Use user-friendly error if not technical
        errorMessage = clientSafeErrorText(transactionError, errorMessage);
      }
      
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
          errors: [{ row: 1, error: errorMessage }],
          rows: rowResults.toJSON()
      })
    );
    }
  } catch (error: any) {
    console.error('Error in bulk import:', error);
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
