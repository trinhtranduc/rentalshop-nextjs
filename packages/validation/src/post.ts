import { z } from 'zod';

// Helper function to generate slug from string
export const slugRegex = /^[a-z0-9-]+$/;

export const postCreateSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500).optional(),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  seoKeywords: z.string().max(255).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  categoryIds: z.array(z.number().int().positive()).optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
  featuredImage: z.string().url().optional().or(z.literal('')),
});

export const postUpdateSchema = postCreateSchema.partial().extend({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export const postCategoryCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

export const postCategoryUpdateSchema = postCategoryCreateSchema.partial();

export const postTagCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens'),
});

export const postTagUpdateSchema = postTagCreateSchema.partial();

export const postSearchSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  categoryId: z.number().int().positive().optional(),
  tagId: z.number().int().positive().optional(),
  authorId: z.number().int().positive().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'publishedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PostCreateInput = z.infer<typeof postCreateSchema>;
export type PostUpdateInput = z.infer<typeof postUpdateSchema>;
export type PostCategoryCreateInput = z.infer<typeof postCategoryCreateSchema>;
export type PostCategoryUpdateInput = z.infer<typeof postCategoryUpdateSchema>;
export type PostTagCreateInput = z.infer<typeof postTagCreateSchema>;
export type PostTagUpdateInput = z.infer<typeof postTagUpdateSchema>;
export type PostSearchInput = z.infer<typeof postSearchSchema>;
