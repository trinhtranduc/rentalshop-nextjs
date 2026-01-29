// ============================================================================
// POST CATEGORY FUNCTIONS - SIMPLIFIED API
// ============================================================================

import { prisma } from './client';

/**
 * Find all post categories (simplified API)
 */
export const findAll = async (options: { isActive?: boolean } = {}) => {
  const where: any = {};
  if (options.isActive !== undefined) {
    where.isActive = options.isActive;
  }

  return await prisma.postCategory.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Find category by ID (simplified API)
 */
export const findById = async (id: number) => {
  return await prisma.postCategory.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Find category by slug (simplified API)
 */
export const findBySlug = async (slug: string) => {
  return await prisma.postCategory.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Create post category (simplified API)
 */
export const create = async (data: {
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
}) => {
  // Check if slug already exists
  const existing = await prisma.postCategory.findUnique({
    where: { slug: data.slug },
  });

  if (existing) {
    throw new Error(`Category with slug "${data.slug}" already exists`);
  }

  return await prisma.postCategory.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      isActive: data.isActive ?? true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Update post category (simplified API)
 */
export const update = async (
  id: number,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    isActive?: boolean;
  }
) => {
  // Check if slug already exists (for different category)
  if (data.slug) {
    const existing = await prisma.postCategory.findFirst({
      where: {
        slug: data.slug,
        id: { not: id },
      },
    });

    if (existing) {
      throw new Error(`Category with slug "${data.slug}" already exists`);
    }
  }

  return await prisma.postCategory.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Delete post category (simplified API)
 */
export const deleteCategory = async (id: number) => {
  return await prisma.postCategory.delete({
    where: { id },
  });
};

export const simplifiedPostCategories = {
  findAll,
  findById,
  findBySlug,
  create,
  update,
  delete: deleteCategory,
};
