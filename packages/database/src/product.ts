// ============================================================================
// NEW: CORRECT DUAL ID PRODUCT FUNCTIONS
// ============================================================================
// This file contains only the correct product functions that follow the dual ID system:
// - Input: id (number)
// - Database: queries by id, uses CUIDs for relationships
// - Return: includes both id (CUID) and id (number)

import { prisma } from './client';
import type { ProductSearchFilter } from '@rentalshop/types';

// ============================================================================
// PRODUCT LOOKUP FUNCTIONS (BY PUBLIC ID)
// ============================================================================

/**
 * Get product by id (number) - follows dual ID system
 * SECURITY: Enforces merchant isolation to prevent cross-tenant access
 */
export async function getProductById(id: number, merchantId: number) {
  // Find merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${merchantId} not found`);
  }

  return await prisma.product.findFirst({
    where: { 
      id,
      merchantId: merchant.id // Use CUID for merchant isolation
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
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
  // Find merchant by id to get the CUID
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${merchantId} not found`);
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
          name: true,
        },
      },
      category: {
        select: {
          id: true,
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
 * Build order by clause for product queries
 */
function buildProductOrderByClause(sortBy?: string, sortOrder?: string): any {
  const validSortFields = [
    'createdAt', 'updatedAt', 'name', 'rentPrice', 'salePrice', 'totalStock'
  ];
  
  const field = validSortFields.includes(sortBy || '') ? sortBy : 'createdAt';
  const order = sortOrder === 'asc' ? 'asc' : 'desc';
  
  return { [field as string]: order };
}

/**
 * Search products - follows dual ID system
 * Input: ids (numbers), Output: ids (numbers)
 */
export async function searchProducts(filters: ProductSearchFilter) {
  const {
    merchantId,
    outletId,
    categoryId,
    search,
    q, // Add q parameter support
    page = 1,
    limit = 20,
    offset, // Add offset support
    isActive = true,
    available,
    minPrice,
    maxPrice,
    sortBy,
    sortOrder
  } = filters;

  // Use offset if provided, otherwise calculate from page
  const skip = offset !== undefined ? offset : (page - 1) * limit;

  // Build where clause
  const where: any = {
    isActive,
  };

  if (merchantId) {
    // Find merchant by id
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true }
    });
    
    if (merchant) {
      where.merchantId = merchant.id; // Use CUID
    }
  }

  if (categoryId) {
    // Find category by id
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true }
    });
    
    if (category) {
      where.categoryId = category.id; // Use CUID
    }
  }

  // Handle search query - use 'q' parameter first, fallback to 'search' for backward compatibility (case-insensitive)
  const searchQuery = q || search;
  if (searchQuery) {
    const searchTerm = searchQuery.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { barcode: { equals: searchTerm } } // Barcode is usually exact match
    ];
  }

  // If outletId is specified, only show products that have stock at that outlet
  if (outletId) {
    // Find outlet by id
    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      select: { id: true }
    });
    
    if (outlet) {
      where.outletStock = {
        some: {
          outletId: outlet.id, // Use CUID
          stock: { gt: 0 }
        }
      };
    }
  }

  // Add availability filter
  if (available !== undefined) {
    if (available) {
      where.outletStock = {
        some: {
          available: { gt: 0 }
        }
      };
    } else {
      where.outletStock = {
        none: {
          available: { gt: 0 }
        }
      };
    }
  }

  // Add price range filters
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.rentPrice = {};
    if (minPrice !== undefined) where.rentPrice.gte = minPrice;
    if (maxPrice !== undefined) where.rentPrice.lte = maxPrice;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
      id: true,
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
            name: true
          }
        },
        merchant: {
          select: {
      id: true,
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
                name: true,
                address: true
              }
            }
          }
        }
      },
      orderBy: buildProductOrderByClause(sortBy, sortOrder),
      take: limit,
      skip: skip
    }),
    prisma.product.count({ where })
  ]);

  // Transform to match expected types
  const transformedProducts = products.map((product: any) => ({
    id: product.id, // Return id (number) for external use
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
      id: product.category.id, // Return id (number)
      name: product.category.name,
    },
    merchant: {
      id: product.merchant.id, // Return id (number)
      name: product.merchant.name,
    },
    outletStock: product.outletStock.map((stock: any) => ({
      id: stock.id, // Keep CUID for internal use
      stock: stock.stock,
      available: stock.available,
      renting: stock.renting,
      outlet: {
        id: stock.outlet.id, // Return id (number)
        name: stock.outlet.name,
        address: stock.outlet.address,
      },
    })),
  }));

  return {
    products: transformedProducts,
    total,
    page: offset !== undefined ? Math.floor(offset / limit) + 1 : page,
    limit,
    offset: skip,
    hasMore: skip + limit < total,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================================================
// DEFAULT CATEGORY FUNCTIONS
// ============================================================================

/**
 * Get or create default category for merchant
 */
async function getOrCreateDefaultCategory(merchantId: number): Promise<any> {
  // First try to find existing default category
  const existingDefault = await prisma.category.findFirst({
    where: {
      merchantId: merchantId, // merchantId is number (public ID)
      name: 'General',
      isActive: true
    }
  });

  if (existingDefault) {
    console.log('✅ Found existing default category:', existingDefault.id);
    return existingDefault;
  }

  // Create default category if not exists
  console.log('🔧 Creating default category for merchant:', merchantId);
  
  // Generate next category id
  const lastCategory = await prisma.category.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  const nextPublicId = (lastCategory?.id || 0) + 1;

  const defaultCategory = await prisma.category.create({
    data: {
      id: nextPublicId,
      name: 'General',
      description: 'Default category for general products',
      merchantId: merchantId,
      isActive: true
    }
  });

  console.log('✅ Created default category:', defaultCategory.id);
  return defaultCategory;
}

// ============================================================================
// PRODUCT CREATION FUNCTIONS
// ============================================================================

/**
 * Create new product - follows dual ID system
 * Input: ids (numbers), Output: id (number)
 */
export async function createProduct(input: any): Promise<any> {
  // Find merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: input.merchantId }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${input.merchantId} not found`);
  }

  // Find category by id if provided
  let category = null;
  if (input.categoryId) {
    category = await prisma.category.findUnique({
      where: { id: input.categoryId }
    });
    
    if (!category) {
      throw new Error(`Category with id ${input.categoryId} not found`);
    }
  }

  // Generate next product id
  const lastProduct = await prisma.product.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  const nextPublicId = (lastProduct?.id || 0) + 1;

  // Create product
  const productData: any = {
    id: nextPublicId,
    name: input.name,
    description: input.description,
    barcode: input.barcode,
    totalStock: input.totalStock || 0,
    rentPrice: input.rentPrice,
    salePrice: input.salePrice,
    costPrice: input.costPrice,
    deposit: input.deposit || 0,
    images: input.images,
    isActive: input.isActive ?? true,
    merchantId: merchant.id, // Use CUID
    // Optional pricing configuration (default FIXED if null)
    pricingType: input.pricingType || null,
    durationConfig: input.durationConfig || null,
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
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return product;
}

// ============================================================================
// PRODUCT UPDATE FUNCTIONS
// ============================================================================

/**
 * Update product - follows dual ID system
 * Input: id (number), Output: id (number)
 */
export async function updateProduct(
  id: number,
  input: any
): Promise<any> {
  // Find product by id
  const existingProduct = await prisma.product.findUnique({
    where: { id }
  });

  if (!existingProduct) {
    throw new Error(`Product with id ${id} not found`);
  }

  // Handle category update if categoryId is provided
  let categoryId = undefined;
  if (input.categoryId !== undefined) {
    if (input.categoryId === null || input.categoryId === 0) {
      // Remove category
      categoryId = null;
    } else {
      // Find category by id
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId }
      });
      
      if (!category) {
        throw new Error(`Category with id ${input.categoryId} not found`);
      }
      
      categoryId = category.id; // Use CUID for database
    }
  }

  // Prepare update data
  const updateData: any = {};
  
  // Only update fields that are provided
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.barcode !== undefined) updateData.barcode = input.barcode;
  if (input.totalStock !== undefined) updateData.totalStock = input.totalStock;
  // Optional pricing configuration
  if (input.pricingType !== undefined) updateData.pricingType = input.pricingType;
  if (input.durationConfig !== undefined) updateData.durationConfig = input.durationConfig;
  if (input.rentPrice !== undefined) updateData.rentPrice = input.rentPrice;
  if (input.salePrice !== undefined) updateData.salePrice = input.salePrice;
  if (input.costPrice !== undefined) updateData.costPrice = input.costPrice;
  if (input.deposit !== undefined) updateData.deposit = input.deposit;
  if (input.images !== undefined) updateData.images = input.images;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (categoryId !== undefined) updateData.categoryId = categoryId;

  // Update product
  const updatedProduct = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
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
  // Find merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${merchantId} not found`);
  }

  return await prisma.product.findMany({
    where: { merchantId: merchant.id }, // Use CUID
    include: {
      category: {
        select: {
          id: true,
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
  // Find category by id
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true }
  });
  
  if (!category) {
    throw new Error(`Category with id ${categoryId} not found`);
  }

  return await prisma.product.findMany({
    where: { categoryId: category.id }, // Use CUID
    include: {
      merchant: {
        select: {
          id: true,
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
  // Find product by id
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true }
  });
  
  if (!product) {
    throw new Error(`Product with id ${productId} not found`);
  }

  // Find outlet by id
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true }
  });
  
  if (!outlet) {
    throw new Error(`Outlet with id ${outletId} not found`);
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
 * Input: id (number), Output: deleted product data
 */
export async function deleteProduct(id: number): Promise<any> {
  // Find product by id
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  
  if (!product) {
    throw new Error(`Product with id ${id} not found`);
  }

  // Delete the product (this will cascade to outletStock due to Prisma schema)
  const deletedProduct = await prisma.product.delete({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Transform to match expected types
  return {
    id: deletedProduct.id,
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
      id: deletedProduct.category.id,
      name: deletedProduct.category.name,
    },
    merchant: {
      id: deletedProduct.merchant.id,
      name: deletedProduct.merchant.name,
    },
  };
}

// ============================================================================
// SIMPLIFIED API FUNCTIONS (for db object)
// ============================================================================

export const simplifiedProducts = {
  /**
   * Find product by ID (simplified API)
   */
  findById: async (id: number) => {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        merchant: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        outletStock: {
          include: {
            outlet: { select: { id: true, name: true, address: true } }
          }
        }
      }
    });
  },

  /**
   * Find product by barcode (simplified API)
   */
  findByBarcode: async (barcode: string) => {
    return await prisma.product.findUnique({
      where: { barcode },
      include: {
        merchant: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        outletStock: {
          include: {
            outlet: { select: { id: true, name: true } }
          }
        }
      }
    });
  },

  /**
   * Create new product (simplified API)
   */
  create: async (data: any) => {
    try {
      console.log('🔍 simplifiedProducts.create called with data:', data);
      
      // If no categoryId provided, get or create default category
      if (!data.categoryId && data.merchant && data.merchant.connect && data.merchant.connect.id) {
        const merchantPublicId = data.merchant.connect.id; // This is the public ID (number)
        const defaultCategory = await getOrCreateDefaultCategory(merchantPublicId);
        
        // Add category connection to data
        data.category = { connect: { id: defaultCategory.id } };
        console.log('✅ Using default category:', defaultCategory.id, 'for merchant:', merchantPublicId);
      }
      
      const product = await prisma.product.create({
        data,
        include: {
          merchant: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          outletStock: {
            include: {
              outlet: { select: { id: true, name: true } }
            }
          }
        }
      });
      
      console.log('✅ Product created successfully:', product.id);
      return product;
    } catch (error) {
      console.error('❌ Error in simplifiedProducts.create:', error);
      throw error;
    }
  },

  /**
   * Update product (simplified API)
   */
  update: async (id: number, data: any) => {
    return await prisma.product.update({
      where: { id },
      data,
      include: {
        merchant: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        outletStock: {
          include: {
            outlet: { select: { id: true, name: true } }
          }
        }
      }
    });
  },

  /**
   * Delete product (soft delete) (simplified API)
   */
  delete: async (id: number) => {
    return await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
  },

  /**
   * Find first product matching criteria (simplified API)
   */
  findFirst: async (whereClause: any) => {
    // Handle both direct where clause and object with where property
    const where = whereClause?.where || whereClause || {};
    return await prisma.product.findFirst({
      where,
      include: {
        merchant: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        outletStock: {
          include: {
            outlet: { select: { id: true, name: true } }
          }
        }
      }
    });
  },

  /**
   * Get product statistics (simplified API)
   */
  getStats: async (whereClause?: any) => {
    // Handle both direct where clause and object with where property
    const where = whereClause?.where || whereClause || {};
    return await prisma.product.count({ where });
  },

  /**
   * Search products with simple filters (simplified API)
   * Handles conversion of public IDs (numbers) to CUIDs for database queries
   */
  search: async (filters: any) => {
    const { page = 1, limit = 20, sortBy, sortOrder, ...whereFilters } = filters;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isActive: whereFilters.isActive !== undefined ? whereFilters.isActive : true
    };
    
    // Convert merchantId (public ID) to CUID
    if (whereFilters.merchantId) {
      const merchant = await prisma.merchant.findUnique({
        where: { id: whereFilters.merchantId },
        select: { id: true }
      });
      if (merchant) {
        where.merchantId = merchant.id; // Use CUID
      } else {
        // Merchant not found, return empty result
        return {
          data: [],
          total: 0,
          page,
          limit,
          hasMore: false
        };
      }
    }
    
    // Convert categoryId (public ID) to CUID
    if (whereFilters.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: whereFilters.categoryId },
        select: { id: true }
      });
      if (category) {
        where.categoryId = category.id; // Use CUID
      } else {
        // Category not found, return empty result
        return {
          data: [],
          total: 0,
          page,
          limit,
          hasMore: false
        };
      }
    }
    
    // Convert outletId (public ID) to CUID and filter by outlet stock
    if (whereFilters.outletId) {
      const outlet = await prisma.outlet.findUnique({
        where: { id: whereFilters.outletId },
        select: { id: true }
      });
      if (outlet) {
        where.outletStock = {
          some: {
            outletId: outlet.id, // Use CUID
            stock: { gt: 0 }
          }
        };
      } else {
        // Outlet not found, return empty result
        return {
          data: [],
          total: 0,
          page,
          limit,
          hasMore: false
        };
      }
    }
    
    // Availability filter
    if (whereFilters.available !== undefined) {
      if (whereFilters.available) {
        where.outletStock = {
          ...(where.outletStock || {}),
          some: {
            available: { gt: 0 }
          }
        };
      } else {
        where.outletStock = {
          ...(where.outletStock || {}),
          none: {
            available: { gt: 0 }
          }
        };
      }
    }
    
    // Text search (case-insensitive)
    if (whereFilters.search) {
      const searchTerm = whereFilters.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { barcode: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Price range
    if (whereFilters.minPrice !== undefined || whereFilters.maxPrice !== undefined) {
      where.rentPrice = {};
      if (whereFilters.minPrice !== undefined) where.rentPrice.gte = whereFilters.minPrice;
      if (whereFilters.maxPrice !== undefined) where.rentPrice.lte = whereFilters.maxPrice;
    }

    // Build orderBy clause
    const orderBy = buildProductOrderByClause(sortBy, sortOrder);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          merchant: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          outletStock: {
            include: {
              outlet: { select: { id: true, name: true, address: true } }
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ]);

    return {
      data: products,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    };
  },

  count: async (options?: { where?: any }) => {
    const where = options?.where || {};
    return await prisma.product.count({ where });
  }
};
