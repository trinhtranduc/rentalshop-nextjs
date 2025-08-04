import { prisma } from './client';
import type { ProductInput, ProductUpdateInput } from '@rentalshop/utils';

/**
 * Product service for CRUD operations
 * Centralized database operations following DRY principles
 */

export interface ProductFilters {
  outletId?: string;
  categoryId?: string;
  isActive?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface ProductListOptions {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'rentPrice' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Create a new product
 * @param data - Product data
 * @returns Created product
 */
export const createProduct = async (data: ProductInput) => {
  const product = await prisma.product.create({
    data: {
      name: data.name,
      description: data.description,
      stock: data.stock,
      rentPrice: data.rentPrice,
      salePrice: data.salePrice,
      deposit: data.deposit,
      categoryId: data.categoryId,
      outletId: data.outletId,
      images: data.images ? JSON.stringify(data.images) : '[]',
    },
    include: {
      outlet: true,
      category: true,
    },
  });

  return {
    ...product,
    images: JSON.parse(product.images),
  };
};

/**
 * Get a product by ID
 * @param id - Product ID
 * @returns Product or null
 */
export const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      outlet: true,
      category: true,
    },
  });

  if (!product) return null;

  return {
    ...product,
    images: JSON.parse(product.images),
  };
};

/**
 * Get products with filtering and pagination
 * @param filters - Filter options
 * @param options - Pagination and sorting options
 * @returns Products list and total count
 */
export const getProducts = async (
  filters: ProductFilters = {},
  options: ProductListOptions = {}
) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    isActive: true,
  };

  if (filters.outletId) where.outletId = filters.outletId;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.minPrice !== undefined) where.rentPrice = { gte: filters.minPrice };
  if (filters.maxPrice !== undefined) {
    where.rentPrice = { ...where.rentPrice, lte: filters.maxPrice };
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // Get total count
  const total = await prisma.product.count({ where });

  // Get products
  const products = await prisma.product.findMany({
    where,
    include: {
      outlet: true,
      category: true,
    },
    orderBy: { [sortBy]: sortOrder },
    skip,
    take: limit,
  });

  const totalPages = Math.ceil(total / limit);

  return {
    products: products.map(product => ({
      ...product,
      images: JSON.parse(product.images),
    })),
    total,
    page,
    totalPages,
  };
};

/**
 * Update a product
 * @param id - Product ID
 * @param data - Update data
 * @returns Updated product
 */
export const updateProduct = async (id: string, data: ProductUpdateInput) => {
  const updateData: any = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.stock !== undefined) updateData.stock = data.stock;
  if (data.rentPrice !== undefined) updateData.rentPrice = data.rentPrice;
  if (data.salePrice !== undefined) updateData.salePrice = data.salePrice;
  if (data.deposit !== undefined) updateData.deposit = data.deposit;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.images) {
    updateData.images = JSON.stringify(data.images);
  }

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      outlet: true,
      category: true,
    },
  });

  return {
    ...product,
    images: JSON.parse(product.images),
  };
};

/**
 * Delete a product (soft delete by setting isActive to false)
 * @param id - Product ID
 * @returns Deleted product
 */
export const deleteProduct = async (id: string) => {
  const product = await prisma.product.update({
    where: { id },
    data: { isActive: false },
    include: {
      outlet: true,
      category: true,
    },
  });

  return {
    ...product,
    images: JSON.parse(product.images),
  };
};

/**
 * Hard delete a product (use with caution)
 * @param id - Product ID
 * @returns Deleted product
 */
export const hardDeleteProduct = async (id: string) => {
  const product = await prisma.product.delete({
    where: { id },
    include: {
      outlet: true,
      category: true,
    },
  });

  return {
    ...product,
    images: JSON.parse(product.images),
  };
};

/**
 * Update product stock
 * @param id - Product ID
 * @param quantity - Quantity to add/subtract (positive for add, negative for subtract)
 * @returns Updated product
 */
export const updateProductStock = async (id: string, quantity: number) => {
  const product = await prisma.product.update({
    where: { id },
    data: {
      stock: {
        increment: quantity,
      },
    },
    include: {
      outlet: true,
      category: true,
    },
  });

  return {
    ...product,
    images: JSON.parse(product.images),
  };
};

/**
 * Check if product is available for rent
 * @param id - Product ID
 * @returns Availability status
 */
export const checkProductAvailability = async (id: string): Promise<boolean> => {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { stock: true, isActive: true },
  });

  return product ? product.stock > 0 && product.isActive : false;
}; 