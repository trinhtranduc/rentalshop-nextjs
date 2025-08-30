// ============================================================================
// NEW: CORRECT DUAL ID PRODUCT FUNCTIONS
// ============================================================================
// This file contains only the correct product functions that follow the dual ID system:
// - Input: publicId (number)
// - Database: queries by publicId, uses CUIDs for relationships
// - Return: includes both id (CUID) and publicId (number)

import { prisma } from './client';
import type { ProductSearchFilter } from '@rentalshop/types';

// ============================================================================
// PRODUCT LOOKUP FUNCTIONS (BY PUBLIC ID)
// ============================================================================

/**
 * Get product by publicId (number) - follows dual ID system
 * SECURITY: Enforces merchant isolation to prevent cross-tenant access
 */
export async function getProductByPublicId(publicId: number, merchantId: number) {
  // Find merchant by publicId to get the CUID
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${merchantId} not found`);
  }

  return await prisma.product.findFirst({
    where: { 
      publicId,
      merchantId: merchant.id // Use CUID for merchant isolation
    },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      outletStock: {
        select: {
          id: true,
          stock: true,
          available: true,
          renting: true,
          outlet: {
            select: {
              id: true,
              publicId: true,
              name: true,
              address: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get product by barcode - follows dual ID system
 * SECURITY: Enforces merchant isolation to prevent cross-tenant access
 */
export async function getProductByBarcode(barcode: string, merchantId: number) {
  // Find merchant by publicId to get the CUID
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${merchantId} not found`);
  }

  return await prisma.product.findFirst({
    where: { 
      barcode,
      merchantId: merchant.id // Use CUID for merchant isolation
    },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
    },
  });
}

// ============================================================================
// PRODUCT SEARCH FUNCTIONS
// ============================================================================

/**
 * Search products - follows dual ID system
 * Input: publicIds (numbers), Output: publicIds (numbers)
 */
export async function searchProducts(filters: ProductSearchFilter) {
  const {
    merchantId,
    categoryId,
    search,
    page = 1,
    limit = 20,
    isActive = true
  } = filters;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    isActive,
  };

  if (merchantId) {
    // Find merchant by publicId
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: merchantId },
      select: { id: true }
    });
    
    if (merchant) {
      where.merchantId = merchant.id; // Use CUID
    }
  }

  if (categoryId) {
    // Find category by publicId
    const category = await prisma.category.findUnique({
      where: { publicId: categoryId },
      select: { id: true }
    });
    
    if (category) {
      where.categoryId = category.id; // Use CUID
    }
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { barcode: { equals: search } }
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        publicId: true,
        name: true,
        description: true,
        barcode: true,
        totalStock: true,
        rentPrice: true,
        salePrice: true,
        deposit: true,
        images: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            publicId: true,
            name: true
          }
        },
        merchant: {
          select: {
            id: true,
            publicId: true,
            name: true
          }
        },
        outletStock: {
          select: {
            id: true,
            stock: true,
            available: true,
            renting: true,
            outlet: {
              select: {
                id: true,
                publicId: true,
                name: true,
                address: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip
    }),
    prisma.product.count({ where })
  ]);

  // Transform to match expected types
  const transformedProducts = products.map(product => ({
    id: product.publicId, // Return publicId (number) for external use
    publicId: product.publicId,
    name: product.name,
    description: product.description,
    barcode: product.barcode,
    totalStock: product.totalStock,
    rentPrice: product.rentPrice,
    salePrice: product.salePrice,
    deposit: product.deposit,
    images: product.images,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    category: {
      id: product.category.publicId, // Return publicId (number)
      publicId: product.category.publicId,
      name: product.category.name,
    },
    merchant: {
      id: product.merchant.publicId, // Return publicId (number)
      publicId: product.merchant.publicId,
      name: product.merchant.name,
    },
    outletStock: product.outletStock.map(stock => ({
      id: stock.id, // Keep CUID for internal use
      stock: stock.stock,
      available: stock.available,
      renting: stock.renting,
      outlet: {
        id: stock.outlet.publicId, // Return publicId (number)
        publicId: stock.outlet.publicId,
        name: stock.outlet.name,
        address: stock.outlet.address,
      },
    })),
  }));

  return {
    products: transformedProducts,
    total,
    page,
    limit,
    hasMore: skip + limit < total,
  };
}

// ============================================================================
// PRODUCT CREATION FUNCTIONS
// ============================================================================

/**
 * Create new product - follows dual ID system
 * Input: publicIds (numbers), Output: publicId (number)
 */
export async function createProduct(input: any): Promise<any> {
  // Find merchant by publicId
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: input.merchantId }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${input.merchantId} not found`);
  }

  // Find category by publicId if provided
  let category = null;
  if (input.categoryId) {
    category = await prisma.category.findUnique({
      where: { publicId: input.categoryId }
    });
    
    if (!category) {
      throw new Error(`Category with publicId ${input.categoryId} not found`);
    }
  }

  // Generate next product publicId
  const lastProduct = await prisma.product.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  const nextPublicId = (lastProduct?.publicId || 0) + 1;

  // Create product
  const productData: any = {
    publicId: nextPublicId,
    name: input.name,
    description: input.description,
    barcode: input.barcode,
    totalStock: input.totalStock || 0,
    rentPrice: input.rentPrice,
    salePrice: input.salePrice,
    deposit: input.deposit || 0,
    images: input.images,
    isActive: input.isActive ?? true,
    merchantId: merchant.id, // Use CUID
  };

  // Only add categoryId if category is provided
  if (category) {
    productData.categoryId = category.id;
  }

  const product = await prisma.product.create({
    data: productData,
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
    },
  });

  // Create outlet stock records (required)
  if (!input.outletStock || !Array.isArray(input.outletStock) || input.outletStock.length === 0) {
    throw new Error('Product must have at least one outlet stock entry');
  }
  
  console.log('🔍 Creating outlet stock records for product:', product.id);
  
  const outletStockPromises = input.outletStock.map(async (stockItem: any) => {
    console.log('🔍 Processing outlet stock item:', stockItem);
    
    // Find outlet by publicId
    const outlet = await prisma.outlet.findUnique({
      where: { publicId: stockItem.outletId }
    });
    
    if (!outlet) {
      throw new Error(`Outlet with publicId ${stockItem.outletId} not found`);
    }

    console.log('✅ Found outlet:', outlet.id, 'for publicId:', stockItem.outletId);

    // Create outlet stock record
    try {
      const stockValue = stockItem.stock || 0; // Ensure stock is never undefined/null
      
      const outletStockRecord = await prisma.outletStock.create({
        data: {
          productId: product.id, // Use CUID
          outletId: outlet.id, // Use CUID
          stock: stockValue,
          available: stockValue,
          renting: 0,
        },
      });
      console.log('✅ Created outlet stock record:', outletStockRecord);
      return outletStockRecord;
    } catch (error) {
      console.error('❌ Failed to create outlet stock record:', error);
      throw error;
    }
  });

  // Wait for all outlet stock records to be created
  const results = await Promise.all(outletStockPromises);
  console.log('✅ Created outlet stock records:', results.length);

  // Return product with outlet stock information
  const productWithStock = await prisma.product.findUnique({
    where: { id: product.id },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      outletStock: {
        include: {
                  outlet: {
          select: {
            id: true,
            publicId: true,
            name: true,
            address: true,
          },
        },
        },
      },
    },
  });

  return productWithStock;
}

// ============================================================================
// PRODUCT UPDATE FUNCTIONS
// ============================================================================

/**
 * Update product - follows dual ID system
 * Input: publicId (number), Output: publicId (number)
 */
export async function updateProduct(
  publicId: number,
  input: any
): Promise<any> {
  // Find product by publicId
  const existingProduct = await prisma.product.findUnique({
    where: { publicId }
  });

  if (!existingProduct) {
    throw new Error(`Product with publicId ${publicId} not found`);
  }

  // Update product
  const updatedProduct = await prisma.product.update({
    where: { publicId },
    data: {
      name: input.name,
      description: input.description,
      barcode: input.barcode,
      totalStock: input.totalStock,
      rentPrice: input.rentPrice,
      salePrice: input.salePrice,
      deposit: input.deposit,
      images: input.images,
      isActive: input.isActive,
    },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
    },
  });

  return updatedProduct;
}

// ============================================================================
// PRODUCT UTILITY FUNCTIONS
// ============================================================================

/**
 * Get products by merchant - follows dual ID system
 */
export async function getProductsByMerchant(merchantId: number) {
  // Find merchant by publicId
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${merchantId} not found`);
  }

  return await prisma.product.findMany({
    where: { merchantId: merchant.id }, // Use CUID
    include: {
      category: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get products by category - follows dual ID system
 */
export async function getProductsByCategory(categoryId: number) {
  // Find category by publicId
  const category = await prisma.category.findUnique({
    where: { publicId: categoryId },
    select: { id: true }
  });
  
  if (!category) {
    throw new Error(`Category with publicId ${categoryId} not found`);
  }

  return await prisma.product.findMany({
    where: { categoryId: category.id }, // Use CUID
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update product stock - follows dual ID system
 */
export async function updateProductStock(
  productId: number,
  outletId: number,
  stockChange: number
): Promise<any> {
  // Find product by publicId
  const product = await prisma.product.findUnique({
    where: { publicId: productId },
    select: { id: true }
  });
  
  if (!product) {
    throw new Error(`Product with publicId ${productId} not found`);
  }

  // Find outlet by publicId
  const outlet = await prisma.outlet.findUnique({
    where: { publicId: outletId },
    select: { id: true }
  });
  
  if (!outlet) {
    throw new Error(`Outlet with publicId ${outletId} not found`);
  }

  // Update or create outlet stock
  const outletStock = await prisma.outletStock.upsert({
    where: {
      productId_outletId: {
        productId: product.id, // Use CUID
        outletId: outlet.id, // Use CUID
      },
    },
    update: {
      stock: { increment: stockChange },
      available: { increment: stockChange },
    },
    create: {
      productId: product.id, // Use CUID
      outletId: outlet.id, // Use CUID
      stock: stockChange,
      available: stockChange,
      renting: 0,
    },
  });

  return outletStock;
}

/**
 * Delete product - follows dual ID system
 * Input: publicId (number), Output: deleted product data
 */
export async function deleteProduct(publicId: number): Promise<any> {
  // Find product by publicId
  const product = await prisma.product.findUnique({
    where: { publicId },
    include: {
      category: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
    },
  });
  
  if (!product) {
    throw new Error(`Product with publicId ${publicId} not found`);
  }

  // Delete the product (this will cascade to outletStock due to Prisma schema)
  const deletedProduct = await prisma.product.delete({
    where: { publicId },
    include: {
      category: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
    },
  });

  // Transform to match expected types
  return {
    id: deletedProduct.publicId,
    publicId: deletedProduct.publicId,
    name: deletedProduct.name,
    description: deletedProduct.description,
    barcode: deletedProduct.barcode,
    totalStock: deletedProduct.totalStock,
    rentPrice: deletedProduct.rentPrice,
    salePrice: deletedProduct.salePrice,
    deposit: deletedProduct.deposit,
    images: deletedProduct.images,
    isActive: deletedProduct.isActive,
    createdAt: deletedProduct.createdAt,
    updatedAt: deletedProduct.updatedAt,
    category: {
      id: deletedProduct.category.publicId,
      publicId: deletedProduct.category.publicId,
      name: deletedProduct.category.name,
    },
    merchant: {
      id: deletedProduct.merchant.publicId,
      publicId: deletedProduct.merchant.publicId,
      name: deletedProduct.merchant.name,
    },
  };
}
