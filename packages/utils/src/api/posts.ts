// ============================================================================
// POSTS API CLIENT
// ============================================================================

import { authenticatedFetch, parseApiResponse, type ApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { Post, PostCreateInput, PostUpdateInput, PostSearchFilter, PostCategory, PostTag } from '@rentalshop/types';

export interface PostsResponse {
  data: Post[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Public fetch function for unauthenticated requests
const publicFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const defaultOptions: RequestInit = {
    method: 'GET',
    headers,
    ...options,
  };

  return await fetch(url, defaultOptions);
};

export const postsApi = {
  /**
   * Search posts with filters (authenticated)
   */
  async searchPosts(filters: PostSearchFilter): Promise<ApiResponse<PostsResponse>> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters.tagId) params.append('tagId', filters.tagId.toString());
    if (filters.authorId) params.append('authorId', filters.authorId.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const url = params.toString()
      ? `${apiUrls.posts.list}?${params.toString()}`
      : apiUrls.posts.list;

    const response = await authenticatedFetch(url);
    return await parseApiResponse<PostsResponse>(response);
  },

  /**
   * Get post by ID
   */
  async getPost(id: number): Promise<ApiResponse<Post>> {
    const response = await authenticatedFetch(apiUrls.posts.get(id));
    return await parseApiResponse<Post>(response);
  },

  /**
   * Get post by slug (public - no authentication required)
   */
  async getPostBySlug(slug: string): Promise<ApiResponse<Post>> {
    const response = await publicFetch(apiUrls.posts.getBySlug(slug));
    return await parseApiResponse<Post>(response);
  },

  /**
   * Search published posts (public - no authentication required)
   * For landing page and public blog listing
   */
  async searchPublicPosts(filters: Omit<PostSearchFilter, 'status'> & { status?: 'PUBLISHED' }): Promise<ApiResponse<PostsResponse>> {
    const params = new URLSearchParams();
    
    // Always force PUBLISHED for public access
    params.append('status', 'PUBLISHED');
    if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters.tagId) params.append('tagId', filters.tagId.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const url = `${apiUrls.posts.public}?${params.toString()}`;
    const response = await publicFetch(url);
    return await parseApiResponse<PostsResponse>(response);
  },

  /**
   * Create new post
   */
  async createPost(data: PostCreateInput): Promise<ApiResponse<Post>> {
    const response = await authenticatedFetch(apiUrls.posts.create, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<Post>(response);
  },

  /**
   * Update post
   */
  async updatePost(id: number, data: PostUpdateInput): Promise<ApiResponse<Post>> {
    const response = await authenticatedFetch(apiUrls.posts.update(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<Post>(response);
  },

  /**
   * Delete post
   */
  async deletePost(id: number): Promise<ApiResponse<void>> {
    const response = await authenticatedFetch(apiUrls.posts.delete(id), {
      method: 'DELETE',
    });
    return await parseApiResponse<void>(response);
  },

  /**
   * Get all categories (authenticated)
   */
  async getCategories(): Promise<ApiResponse<PostCategory[]>> {
    const response = await authenticatedFetch(apiUrls.posts.categories.list);
    return await parseApiResponse<PostCategory[]>(response);
  },

  /**
   * Get all active categories (public - no authentication required)
   */
  async getPublicCategories(): Promise<ApiResponse<PostCategory[]>> {
    const response = await publicFetch(apiUrls.posts.categories.public);
    return await parseApiResponse<PostCategory[]>(response);
  },

  /**
   * Create category
   */
  async createCategory(data: { name: string; slug: string; description?: string }): Promise<ApiResponse<PostCategory>> {
    const response = await authenticatedFetch(apiUrls.posts.categories.create, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<PostCategory>(response);
  },

  /**
   * Get all tags (authenticated)
   */
  async getTags(search?: string): Promise<ApiResponse<PostTag[]>> {
    const url = search
      ? `${apiUrls.posts.tags.list}?search=${encodeURIComponent(search)}`
      : apiUrls.posts.tags.list;
    const response = await authenticatedFetch(url);
    return await parseApiResponse<PostTag[]>(response);
  },

  /**
   * Get all tags (public - no authentication required)
   */
  async getPublicTags(search?: string): Promise<ApiResponse<PostTag[]>> {
    const url = search
      ? `${apiUrls.posts.tags.public}?search=${encodeURIComponent(search)}`
      : apiUrls.posts.tags.public;
    const response = await publicFetch(url);
    return await parseApiResponse<PostTag[]>(response);
  },

  /**
   * Create tag
   */
  async createTag(data: { name: string; slug: string }): Promise<ApiResponse<PostTag>> {
    const response = await authenticatedFetch(apiUrls.posts.tags.create, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await parseApiResponse<PostTag>(response);
  },
};
