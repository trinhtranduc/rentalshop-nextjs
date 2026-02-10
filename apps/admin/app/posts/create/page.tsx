'use client';

import React, { useState, useEffect } from 'react';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  PostForm,
  useToast,
} from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { useRouter } from 'next/navigation';
import { postsApi } from '@rentalshop/utils';
import type { PostCreateInput, PostCategory, PostTag } from '@rentalshop/types';

export default function CreatePostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [tags, setTags] = useState<PostTag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          postsApi.getCategories(),
          postsApi.getTags(),
        ]);

        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }
        if (tagsRes.success && tagsRes.data) {
          setTags(tagsRes.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (data: PostCreateInput) => {
    setLoading(true);
    try {
      const response = await postsApi.createPost(data);
      if (response.success) {
        toastSuccess('Post created successfully');
        // Redirect to posts list with status filter to show the new post
        // If status is DRAFT, filter by DRAFT; if PUBLISHED, filter by PUBLISHED
        const statusFilter = data.status || 'DRAFT';
        router.push(`/posts?status=${statusFilter}&page=1`);
        router.refresh(); // Force refresh to ensure data is fetched
      } else {
        toastError('Failed to create post');
      }
    } catch (error) {
      toastError('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/posts');
  };

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Create Post</PageTitle>
      </PageHeader>
      <PageContent>
        <PostForm
          categories={categories}
          tags={tags}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
          mode="create"
        />
      </PageContent>
    </PageWrapper>
  );
}
