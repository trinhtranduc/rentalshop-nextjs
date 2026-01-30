'use client';

import React, { useState, useEffect } from 'react';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  PostForm,
  useToast,
  PageLoadingIndicator,
} from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { useRouter, useParams } from 'next/navigation';
import { postsApi } from '@rentalshop/utils';
import type { PostUpdateInput, PostCategory, PostTag, Post } from '@rentalshop/types';

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [tags, setTags] = useState<PostTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const postId = params?.id ? parseInt(params.id as string) : null;

  useEffect(() => {
    if (!postId) return;

    const fetchData = async () => {
      try {
        const [postRes, categoriesRes, tagsRes] = await Promise.all([
          postsApi.getPost(postId),
          postsApi.getCategories(),
          postsApi.getTags(),
        ]);

        if (postRes.success && postRes.data) {
          setPost(postRes.data);
        }
        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }
        if (tagsRes.success && tagsRes.data) {
          setTags(tagsRes.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toastError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleSubmit = async (data: PostUpdateInput) => {
    if (!postId) return;

    setSaving(true);
    try {
      const response = await postsApi.updatePost(postId, data);
      if (response.success) {
        toastSuccess('Post updated successfully');
        router.push('/posts');
      } else {
        toastError('Failed to update post');
      }
    } catch (error) {
      toastError('Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/posts');
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageLoadingIndicator />
      </PageWrapper>
    );
  }

  if (!post) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Post Not Found</PageTitle>
        </PageHeader>
        <PageContent>
          <p>Post not found.</p>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Edit Post</PageTitle>
      </PageHeader>
      <PageContent>
        <PostForm
          initialData={{
            title: post.title,
            slug: post.slug,
            content: post.content,
            excerpt: post.excerpt,
            seoTitle: post.seoTitle,
            seoDescription: post.seoDescription,
            seoKeywords: post.seoKeywords,
            status: post.status,
            categoryIds: post.categories?.map((c) => c.category.id) || [],
            tagIds: post.tags?.map((t) => t.tag.id) || [],
            featuredImage: post.featuredImage,
          }}
          categories={categories}
          tags={tags}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={saving}
          mode="edit"
        />
      </PageContent>
    </PageWrapper>
  );
}
