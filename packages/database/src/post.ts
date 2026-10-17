// ============================================================================
// POST FUNCTIONS - SIMPLIFIED API
// ============================================================================
// This file contains post functions that follow the simplified API pattern
// - Input: id (number)
// - Database: queries by id, uses numbers for relationships
// - Return: includes id (number)

import { prisma } from './client';
import { randomUUID } from 'node:crypto';
import type { PublicLocale } from '@rentalshop/constants';

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
 * Find post by slug and locale (simplified API)
 */
export const findBySlug = async (slug: string, locale: string = 'vi') => {
  return await prisma.post.findUnique({
    where: { 
      slug_locale: {
        slug,
        locale,
      }
    },
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
  locale?: PublicLocale;
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
    locale,
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

  if (locale) {
    where.locale = locale;
    console.log('🔍 db.posts.search - Filtering by locale:', locale);
  } else {
    console.log('🔍 db.posts.search - No locale filter (will return all locales)');
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
  locale?: PublicLocale;
  content: string;
  translationSourceId?: number;
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
    translationSourceId,
    locale = 'vi',
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

  // Check if slug already exists for this locale
  const existingPost = await prisma.post.findUnique({
    where: { 
      slug_locale: {
        slug,
        locale,
      }
    },
  });

  if (existingPost) {
    throw new Error(`Post with slug "${slug}" already exists for locale "${locale}"`);
  }

  // Normalize featuredImage: convert empty string to null
  const normalizedFeaturedImage = featuredImage && featuredImage.trim() !== '' 
    ? featuredImage 
    : null;

  // Build create data
  const createData: any = {
      title,
      slug,
      locale,
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
  const post = await prisma.$transaction(async (tx) => {
    if (translationSourceId !== undefined) {
      await tx.$queryRaw`SELECT id FROM "Post" WHERE id = ${translationSourceId} FOR UPDATE`;
      const source = await tx.post.findUnique({ where: { id: translationSourceId } });
      if (!source) throw new Error('POST_NOT_FOUND');
      const key = source.translationKey ?? randomUUID();
      if (!source.translationKey) await tx.post.update({ where: { id: source.id }, data: { translationKey: key } });
      createData.translationKey = key;
    }
    return tx.post.create({
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
    locale?: PublicLocale;
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
    locale,
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

  // Get current post to check locale if slug is being updated
  const currentPost = await prisma.post.findUnique({
    where: { id },
    select: { locale: true, slug: true },
  });

  const targetLocale = locale || currentPost?.locale || 'vi';

  // Check if slug already exists for this locale (for different post)
  if (slug !== undefined || locale !== undefined) {
    const existingPost = await prisma.post.findFirst({
      where: {
        slug: slug ?? currentPost?.slug,
        locale: targetLocale,
        id: { not: id },
      },
    });

    if (existingPost) {
      throw new Error(`Post with slug "${slug}" already exists for locale "${targetLocale}"`);
    }
  }

  // Build update data
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (slug !== undefined) updateData.slug = slug;
  if (locale !== undefined) updateData.locale = locale;
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

/** Authorized CMS can inspect drafts; public readers receive published editions only. */
export async function translationsOf(post: { id: number; slug: string; translationKey?: string | null }, publishedOnly = true) {
  return prisma.post.findMany({
    where: {
      ...(post.translationKey ? { translationKey: post.translationKey } : { slug: post.slug, translationKey: null }),
      ...(publishedOnly ? { status: 'PUBLISHED' } : {}),
    },
    select: { id: true, locale: true, slug: true, title: true, status: true },
    orderBy: { locale: 'asc' },
  });
}

// ============================================================================
// SIMPLIFIED API EXPORT
// ============================================================================

export const simplifiedPosts = {
  translationsOf,
  findById,
  findBySlug,
  search,
  create,
  update,
  delete: deletePost,
  publish,
  unpublish,
};
