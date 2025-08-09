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
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { barcode: { equals: search } }
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
    (prisma as any).product.findMany({
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
      } as any,
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
      } as any,
      orderBy: { name: 'asc' },
      skip,
      take: limit
    }),
    (prisma as any).product.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    products,
    total,
    page,
    totalPages
  };
};

export const getProductById = async (id: string) => {
  return await (prisma as any).product.findUnique({
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
      } as any,
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
    } as any
  });
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
  const { outletStock, ...productData } = data;

  return await (prisma as any).product.create({
    data: {
      ...productData,
      outletStock: {
        create: outletStock?.map(os => ({
          outletId: os.outletId,
          stock: os.stock,
          available: os.stock,
          renting: 0
        })) || []
      }
    } as any,
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
      } as any,
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
    } as any
  });
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
  return await (prisma as any).product.update({
    where: { id },
    data: data as any,
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
      } as any,
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
    } as any
  });
};

export const deleteProduct = async (id: string) => {
  return await (prisma as any).product.delete({
    where: { id }
  });
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
  return await (prisma as any).outletStock.upsert({
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
};

export const getProductStockSummary = async (merchantId: string) => {
  const products: any[] = await (prisma as any).product.findMany({
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
    } as any
  });

  return products.map(product => ({
    id: product.id,
    name: product.name,
    totalStock: (product as any).totalStock,
    totalAvailable: (product as any).outletStock.reduce((sum: number, os: any) => sum + os.available, 0),
    totalRenting: (product as any).outletStock.reduce((sum: number, os: any) => sum + os.renting, 0),
    outlets: (product as any).outletStock.map((os: any) => ({
      outletId: os.outlet.id,
      outletName: os.outlet.name,
      stock: os.stock,
      available: os.available,
      renting: os.renting
    }))
  }));
}; 