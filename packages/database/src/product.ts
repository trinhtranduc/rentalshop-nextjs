import { prisma } from './client';
import type { ProductSearchFilter } from './types';

export interface ProductWithStock {
  id: string;
  name: string;
  description?: string;
  barcode?: string;
  totalStock: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
  };
  merchant: {
    id: string;
    name: string;
  };
  outletStock: Array<{
    id: string;
    stock: number;
    available: number;
    renting: number;
    outlet: {
      id: string;
      name: string;
    };
  }>;
}

export const getProducts = async (filters: ProductSearchFilter) => {
  try {
    const {
      merchantId,
      outletId,
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
      ...(merchantId && { merchantId }),
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search } },        // SQLite compatible - case sensitive
          { description: { contains: search } }, // SQLite compatible - case sensitive
          { barcode: { equals: search } }        // Exact match for barcode
        ]
      })
    };

    // If outletId is specified, only show products that have stock at that outlet
    if (outletId) {
      where.outletStock = {
        some: {
          outletId,
          stock: { gt: 0 }
        }
      };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
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
            include: {
              outlet: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            ...(outletId && { where: { outletId } })
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      products,
      total,
      page,
      totalPages
    };
  } catch (error) {
    console.error('Error in getProducts:', error);
    throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getProductById = async (id: string) => {
  try {
    return await prisma.product.findUnique({
      where: { id },
      include: {
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
          include: {
            outlet: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error in getProductById:', error);
    throw new Error(`Failed to fetch product: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const createProduct = async (data: {
  merchantId: string;
  categoryId: string;
  name: string;
  description?: string;
  barcode?: string;
  totalStock: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images?: string;
  outletStock?: Array<{
    outletId: string;
    stock: number;
  }>;
}) => {
  try {
    const { outletStock, ...productData } = data;

    // Generate the next public ID for the product
    const lastProduct = await prisma.product.findFirst({
      orderBy: { publicId: 'desc' },
      select: { publicId: true }
    });
    const nextPublicId = (lastProduct?.publicId || 0) + 1;

    return await prisma.product.create({
      data: {
        ...productData,
        publicId: nextPublicId,
        outletStock: {
          create: outletStock?.map(os => ({
            outletId: os.outletId,
            stock: os.stock,
            available: os.stock,
            renting: 0
          })) || []
        }
      },
      include: {
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
          include: {
            outlet: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error in createProduct:', error);
    throw new Error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const updateProduct = async (
  id: string,
  data: {
    categoryId?: string;
    name?: string;
    description?: string;
    barcode?: string;
    totalStock?: number;
    rentPrice?: number;
    salePrice?: number;
    deposit?: number;
    images?: string;
    isActive?: boolean;
  }
) => {
  try {
    const { salePrice, ...rest } = data;
    const normalizedSalePrice: number | undefined = salePrice == null ? undefined : salePrice;
    const updateData = {
      ...rest,
      ...(normalizedSalePrice !== undefined ? { salePrice: normalizedSalePrice } : {}),
    };

    return await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
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
          include: {
            outlet: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error in updateProduct:', error);
    throw new Error(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const deleteProduct = async (id: string) => {
  try {
    return await prisma.product.delete({
      where: { id }
    });
  } catch (error) {
    console.error('Error in deleteProduct:', error);
    throw new Error(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const updateOutletStock = async (
  productId: string,
  outletId: string,
  data: {
    stock?: number;
    available?: number;
    renting?: number;
  }
) => {
  try {
    return await prisma.outletStock.upsert({
      where: {
        productId_outletId: {
          productId,
          outletId
        }
      },
      update: data,
      create: {
        productId,
        outletId,
        stock: data.stock || 0,
        available: data.available || data.stock || 0,
        renting: data.renting || 0
      }
    });
  } catch (error) {
    console.error('Error in updateOutletStock:', error);
    throw new Error(`Failed to update outlet stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getProductStockSummary = async (merchantId: string) => {
  try {
    const products = await prisma.product.findMany({
      where: { merchantId, isActive: true },
      include: {
        outletStock: {
          include: {
            outlet: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    return products.map(product => ({
      id: product.id,
      name: product.name,
      totalStock: product.totalStock,
      totalAvailable: product.outletStock.reduce((sum, os) => sum + os.available, 0),
      totalRenting: product.outletStock.reduce((sum, os) => sum + os.renting, 0),
      outlets: product.outletStock.map((os) => ({
        outletId: os.outlet.id,
        outletName: os.outlet.name,
        stock: os.stock,
        available: os.available,
        renting: os.renting
      }))
    }));
  } catch (error) {
    console.error('Error in getProductStockSummary:', error);
    throw new Error(`Failed to fetch product stock summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}; 