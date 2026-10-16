'use client';

import { useTranslations } from 'next-intl';
import { isPublicLocale } from '@rentalshop/constants';
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
import { useRouter, useSearchParams } from 'next/navigation';
import { postsApi } from '@rentalshop/utils';
import type { PostCreateInput, PostCategory, PostTag, Post } from '@rentalshop/types';

export default function CreatePostPage() {
  const router = useRouter();
  const query = useSearchParams();
  const t = useTranslations('common.posts');
  const language = query.get('locale');
  const locale = isPublicLocale(language) ? language : 'vi';
  const sourceParam = query.get('translationOf');
  const translationSourceId = sourceParam && /^\d+$/.test(sourceParam) ? Number(sourceParam) : undefined;
  const [source, setSource] = useState<Post | null>(null);
  const [sourceLoading, setSourceLoading] = useState(Boolean(translationSourceId));
  useEffect(() => {
    let active = true;
    if (!translationSourceId) { setSource(null); setSourceLoading(false); return; }
    setSourceLoading(true);
    postsApi.getPost(translationSourceId).then(res => { if (active) setSource(res.success ? res.data ?? null : null); })
      .catch(() => { if (active) setSource(null); })
      .finally(() => { if (active) setSourceLoading(false); });
    return () => { active = false; };
  }, [translationSourceId]);
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
        router.push(`/posts?locale=${data.locale ?? locale}&status=${statusFilter}&page=1`);
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
    router.push(`/posts?locale=${locale}`);
  };

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Create Post</PageTitle>
      </PageHeader>
      <PageContent>
        {translationSourceId && <div className="mb-5 rounded-lg border border-border p-4">
          <strong>{t('translationSource')}: {source?.title ?? '…'}</strong><p className="mt-2 text-sm">{t('translationHelp')}</p>
        </div>}
        {!sourceLoading && (!translationSourceId || source) && <PostForm
          key={`${locale}-${translationSourceId ?? 'new'}`}
          initialData={{ locale, translationSourceId, slug: source?.slug ?? '', status: 'DRAFT' }}
          categories={categories}
          tags={tags}
          onSubmit={data => handleSubmit(data as PostCreateInput)}
          onCancel={handleCancel}
          loading={loading}
          mode="create"
        />}
        {!sourceLoading && translationSourceId && !source && <p role="alert">{t('translationHelp')}</p>}
      </PageContent>
    </PageWrapper>
  );
}
