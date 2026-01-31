'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  PostList,
  useToast,
  Button,
  ConfirmationDialog,
} from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { postsApi } from '@rentalshop/utils';
import { Plus } from 'lucide-react';
import type { Post } from '@rentalshop/types';

export default function PostsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [pagination, setPagination] = useState<{
    currentPage: number;
    totalPages: number;
    total: number;
    limit: number;
  } | null>(null);

  // URL params
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  // Fetch posts
  React.useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const response = await postsApi.searchPosts({
          search,
          status: status as any,
          page,
          limit,
        });
        if (response.success && response.data) {
          setPosts(response.data.data || []);
          // Set pagination data
          const total = response.data.total || 0;
          const totalPages = response.data.totalPages || Math.ceil(total / limit) || 1;
          setPagination({
            currentPage: page,
            totalPages,
            total,
            limit,
          });
        }
      } catch (error) {
        toastError('Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [search, status, page, limit, toastError]);

  const updateURL = useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    // Reset to page 1 when filters change
    if (updates.search !== undefined || updates.status !== undefined) {
      params.set('page', '1');
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage.toString() });
  }, [updateURL]);

  const handleLimitChange = useCallback((newLimit: number) => {
    updateURL({ limit: newLimit.toString(), page: '1' });
  }, [updateURL]);

  const handleCreate = () => {
    router.push('/posts/create');
  };

  const handleView = (post: Post) => {
    router.push(`/posts/${post.id}`);
  };

  const handleEdit = (post: Post) => {
    router.push(`/posts/${post.id}/edit`);
  };

  const handleDelete = (post: Post) => {
    setPostToDelete(post);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!postToDelete) return;

    try {
      const response = await postsApi.deletePost(postToDelete.id);
      if (response.success) {
        toastSuccess('Post deleted successfully');
        setPosts(posts.filter((p) => p.id !== postToDelete.id));
      } else {
        toastError('Failed to delete post');
      }
    } catch (error) {
      toastError('Failed to delete post');
    } finally {
      setShowDeleteDialog(false);
      setPostToDelete(null);
    }
  };

  const handlePublish = async (post: Post) => {
    try {
      const response = await postsApi.updatePost(post.id, { status: 'PUBLISHED' });
      if (response.success) {
        toastSuccess('Post published successfully');
        setPosts(posts.map((p) => (p.id === post.id ? { ...p, status: 'PUBLISHED' } : p)));
      }
    } catch (error) {
      toastError('Failed to publish post');
    }
  };

  const handleUnpublish = async (post: Post) => {
    try {
      const response = await postsApi.updatePost(post.id, { status: 'DRAFT' });
      if (response.success) {
        toastSuccess('Post unpublished successfully');
        setPosts(posts.map((p) => (p.id === post.id ? { ...p, status: 'DRAFT' } : p)));
      }
    } catch (error) {
      toastError('Failed to unpublish post');
    }
  };

  const handleBulkPublish = async (postIds: number[]) => {
    try {
      const promises = postIds.map((id) =>
        postsApi.updatePost(id, { status: 'PUBLISHED' })
      );
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;
      if (successCount > 0) {
        toastSuccess(`${successCount} post(s) published successfully`);
        // Refresh posts
        const response = await postsApi.searchPosts({
          search,
          status: status as any,
          page,
          limit,
        });
        if (response.success && response.data) {
          setPosts(response.data.data || []);
        }
      }
    } catch (error) {
      toastError('Failed to publish posts');
    }
  };

  const handleBulkUnpublish = async (postIds: number[]) => {
    try {
      const promises = postIds.map((id) =>
        postsApi.updatePost(id, { status: 'DRAFT' })
      );
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;
      if (successCount > 0) {
        toastSuccess(`${successCount} post(s) unpublished successfully`);
        // Refresh posts
        const response = await postsApi.searchPosts({
          search,
          status: status as any,
          page,
          limit,
        });
        if (response.success && response.data) {
          setPosts(response.data.data || []);
        }
      }
    } catch (error) {
      toastError('Failed to unpublish posts');
    }
  };

  const handleBulkDelete = async (postIds: number[]) => {
    if (!confirm(`Are you sure you want to delete ${postIds.length} post(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const promises = postIds.map((id) => postsApi.deletePost(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;
      if (successCount > 0) {
        toastSuccess(`${successCount} post(s) deleted successfully`);
        // Refresh posts
        const response = await postsApi.searchPosts({
          search,
          status: status as any,
          page,
          limit,
        });
        if (response.success && response.data) {
          setPosts(response.data.data || []);
        }
      }
    } catch (error) {
      toastError('Failed to delete posts');
    }
  };

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Blog Posts</PageTitle>
      </PageHeader>
      <PageContent>
        <PostList
          posts={posts}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          onCreate={handleCreate}
          filters={{ search, status }}
          onFiltersChange={(filters) => {
            updateURL(filters);
          }}
          pagination={pagination || undefined}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          onBulkPublish={handleBulkPublish}
          onBulkUnpublish={handleBulkUnpublish}
          onBulkDelete={handleBulkDelete}
        />
        <ConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={confirmDelete}
          type="danger"
          title="Delete Post"
          description={`Are you sure you want to delete "${postToDelete?.title}"? This action cannot be undone.`}
        />
      </PageContent>
    </PageWrapper>
  );
}
