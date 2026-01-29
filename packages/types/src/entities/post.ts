// ============================================================================
// POST ENTITY TYPES
// ============================================================================

export interface PostCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostTag {
  id: number;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface PostAuthor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string; // JSON string (TipTap format)
  excerpt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  authorId: number;
  author?: PostAuthor;
  categories?: Array<{
    category: PostCategory;
  }>;
  tags?: Array<{
    tag: PostTag;
  }>;
  featuredImage?: string;
}

export interface PostCreateInput {
  title: string;
  slug: string;
  content: string; // JSON string (TipTap format)
  excerpt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  categoryIds?: number[];
  tagIds?: number[];
  featuredImage?: string;
}

export interface PostUpdateInput {
  title?: string;
  slug?: string;
  content?: string; // JSON string (TipTap format)
  excerpt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  categoryIds?: number[];
  tagIds?: number[];
  featuredImage?: string;
}

export interface PostSearchFilter {
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  categoryId?: number;
  tagId?: number;
  authorId?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PostCategoryCreateInput {
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
}

export interface PostCategoryUpdateInput {
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}

export interface PostTagCreateInput {
  name: string;
  slug: string;
}

export interface PostTagUpdateInput {
  name?: string;
  slug?: string;
}
