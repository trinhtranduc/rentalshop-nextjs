// ============================================================================
// POST FUNCTIONS - SIMPLIFIED API
// ============================================================================
// This file contains post functions that follow the simplified API pattern
// - Input: id (number)
// - Database: queries by id, uses numbers for relationships
// - Return: includes id (number)

import { prisma } from './client';

// ============================================================================
// POST LOOKUP FUNCTIONS
// ============================================================================

/**
 * Find post by ID (simplified API)
 */
export const findById = async (id: number) => {
  return await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      categories: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });
};

/**
 * Find post by slug (simplified API)
 */
export const findBySlug = async (slug: string) => {
  return await prisma.post.findUnique({
    where: { slug },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      categories: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });
};

/**
 * Search posts with filters (simplified API)
 */
export const search = async (filters: {
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  categoryId?: number;
  tagId?: number;
  authorId?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}) => {
  const {
    status,
    categoryId,
    tagId,
    authorId,
    search: searchQuery,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (authorId) {
    where.authorId = authorId;
  }

  if (searchQuery) {
    where.OR = [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { excerpt: { contains: searchQuery, mode: 'insensitive' } },
      { content: { contains: searchQuery, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    where.categories = {
      some: {
        categoryId,
      },
    };
  }

  if (tagId) {
    where.tags = {
      some: {
        tagId,
      },
    };
  }

  const skip = (page - 1) * limit;
  const orderBy: any = { [sortBy]: sortOrder };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    data: posts,
    total,
    page,
    limit,
    hasMore: skip + limit < total,
  };
};

// ============================================================================
// POST CREATION FUNCTIONS
// ============================================================================

/**
 * Create new post (simplified API)
 */
export const create = async (data: {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  authorId: number;
  categoryIds?: number[];
  tagIds?: number[];
  featuredImage?: string;
}) => {
  const {
    title,
    slug,
    content,
    excerpt,
    seoTitle,
    seoDescription,
    seoKeywords,
    status = 'DRAFT',
    authorId,
    categoryIds = [],
    tagIds = [],
    featuredImage,
  } = data;

  // Check if slug already exists
  const existingPost = await prisma.post.findUnique({
    where: { slug },
  });

  if (existingPost) {
    throw new Error(`Post with slug "${slug}" already exists`);
  }

  // Normalize featuredImage: convert empty string to null
  const normalizedFeaturedImage = featuredImage && featuredImage.trim() !== '' 
    ? featuredImage 
    : null;

  // Build create data
  const createData: any = {
    title,
    slug,
    content,
    excerpt: excerpt || null,
    seoTitle: seoTitle || null,
    seoDescription: seoDescription || null,
    seoKeywords: seoKeywords || null,
    status,
    authorId,
    featuredImage: normalizedFeaturedImage,
    publishedAt: status === 'PUBLISHED' ? new Date() : null,
  };

  // Only add categories relation if categoryIds is provided and not empty
  if (categoryIds && categoryIds.length > 0) {
    createData.categories = {
      create: categoryIds.map((categoryId) => ({
        categoryId,
      })),
    };
  }

  // Only add tags relation if tagIds is provided and not empty
  if (tagIds && tagIds.length > 0) {
    createData.tags = {
      create: tagIds.map((tagId) => ({
        tagId,
      })),
    };
  }

  // Create post with relations
  const post = await prisma.post.create({
    data: createData,
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      categories: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  return post;
};

// ============================================================================
// POST UPDATE FUNCTIONS
// ============================================================================

/**
 * Update post (simplified API)
 */
export const update = async (
  id: number,
  data: {
    title?: string;
    slug?: string;
    content?: string;
    excerpt?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    categoryIds?: number[];
    tagIds?: number[];
    featuredImage?: string;
  }
) => {
  const {
    title,
    slug,
    content,
    excerpt,
    seoTitle,
    seoDescription,
    seoKeywords,
    status,
    categoryIds,
    tagIds,
    featuredImage,
  } = data;

  // Check if slug already exists (for different post)
  if (slug) {
    const existingPost = await prisma.post.findFirst({
      where: {
        slug,
        id: { not: id },
      },
    });

    if (existingPost) {
      throw new Error(`Post with slug "${slug}" already exists`);
    }
  }

  // Build update data
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (slug !== undefined) updateData.slug = slug;
  if (content !== undefined) updateData.content = content;
  if (excerpt !== undefined) updateData.excerpt = excerpt;
  if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
  if (seoDescription !== undefined) updateData.seoDescription = seoDescription;
  if (seoKeywords !== undefined) updateData.seoKeywords = seoKeywords;
  if (status !== undefined) {
    updateData.status = status;
    // Set publishedAt when publishing
    if (status === 'PUBLISHED' && !updateData.publishedAt) {
      updateData.publishedAt = new Date();
    }
  }
  if (featuredImage !== undefined) updateData.featuredImage = featuredImage;

  // Update categories if provided
  if (categoryIds !== undefined) {
    // Delete existing relations
    await prisma.postCategoryRelation.deleteMany({
      where: { postId: id },
    });
    // Create new relations
    if (categoryIds.length > 0) {
      updateData.categories = {
        create: categoryIds.map((categoryId) => ({
          categoryId,
        })),
      };
    }
  }

  // Update tags if provided
  if (tagIds !== undefined) {
    // Delete existing relations
    await prisma.postTagRelation.deleteMany({
      where: { postId: id },
    });
    // Create new relations
    if (tagIds.length > 0) {
      updateData.tags = {
        create: tagIds.map((tagId) => ({
          tagId,
        })),
      };
    }
  }

  const post = await prisma.post.update({
    where: { id },
    data: updateData,
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      categories: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  return post;
};

/**
 * Delete post (simplified API)
 */
export const deletePost = async (id: number) => {
  // Relations will be deleted via cascade
  return await prisma.post.delete({
    where: { id },
  });
};

/**
 * Publish post (simplified API)
 */
export const publish = async (id: number) => {
  return await prisma.post.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });
};

/**
 * Unpublish post (simplified API)
 */
export const unpublish = async (id: number) => {
  return await prisma.post.update({
    where: { id },
    data: {
      status: 'DRAFT',
    },
  });
};

// ============================================================================
// SIMPLIFIED API EXPORT
// ============================================================================

export const simplifiedPosts = {
  findById,
  findBySlug,
  search,
  create,
  update,
  delete: deletePost,
  publish,
  unpublish,
};
