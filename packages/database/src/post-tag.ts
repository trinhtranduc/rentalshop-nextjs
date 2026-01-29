// ============================================================================
// POST TAG FUNCTIONS - SIMPLIFIED API
// ============================================================================

import { prisma } from './client';

/**
 * Find all post tags (simplified API)
 */
export const findAll = async () => {
  return await prisma.postTag.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
    },
  });
};

/**
 * Find tag by ID (simplified API)
 */
export const findById = async (id: number) => {
  return await prisma.postTag.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
    },
  });
};

/**
 * Find tag by slug (simplified API)
 */
export const findBySlug = async (slug: string) => {
  return await prisma.postTag.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
    },
  });
};

/**
 * Search tags by name (simplified API)
 */
export const search = async (query: string) => {
  return await prisma.postTag.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
    take: 20,
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
    },
  });
};

/**
 * Create post tag (simplified API)
 */
export const create = async (data: { name: string; slug: string }) => {
  // Check if slug already exists
  const existing = await prisma.postTag.findUnique({
    where: { slug },
  });

  if (existing) {
    throw new Error(`Tag with slug "${data.slug}" already exists`);
  }

  return await prisma.postTag.create({
    data: {
      name: data.name,
      slug: data.slug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
    },
  });
};

/**
 * Update post tag (simplified API)
 */
export const update = async (
  id: number,
  data: { name?: string; slug?: string }
) => {
  // Check if slug already exists (for different tag)
  if (data.slug) {
    const existing = await prisma.postTag.findFirst({
      where: {
        slug: data.slug,
        id: { not: id },
      },
    });

    if (existing) {
      throw new Error(`Tag with slug "${data.slug}" already exists`);
    }
  }

  return await prisma.postTag.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
    },
  });
};

/**
 * Delete post tag (simplified API)
 */
export const deleteTag = async (id: number) => {
  return await prisma.postTag.delete({
    where: { id },
  });
};

export const simplifiedPostTags = {
  findAll,
  findById,
  findBySlug,
  search,
  create,
  update,
  delete: deleteTag,
};
