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
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleCreate = () => {
    router.push('/posts/create');
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

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Blog Posts</PageTitle>
      </PageHeader>
      <PageContent>
        <PostList
          posts={posts}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          onCreate={handleCreate}
          filters={{ search, status }}
          onFiltersChange={(filters) => {
            updateURL(filters);
          }}
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
