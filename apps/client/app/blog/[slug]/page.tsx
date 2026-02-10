'use client';

import React, { useState, useEffect } from 'react';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  PostContent,
  Badge,
  useToast,
  PageLoadingIndicator,
} from '@rentalshop/ui';
import { postsApi } from '@rentalshop/utils';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Calendar, User } from 'lucide-react';
import type { Post } from '@rentalshop/types';

export default function BlogPostPage() {
  const params = useParams();
  const locale = useLocale() as 'en' | 'vi' | 'zh' | 'ko' | 'ja';
  const { toastError } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const slug = params?.slug as string;

  useEffect(() => {
    if (!slug) return;

    const fetchPost = async () => {
      setLoading(true);
      try {
        const response = await postsApi.getPostBySlug(slug, locale);
        if (response.success && response.data) {
          setPost(response.data);
        } else {
          toastError('Post not found');
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        toastError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug, locale, toastError]);

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
          <p>The post you're looking for doesn't exist.</p>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>{post.seoTitle || post.title}</PageTitle>
        {post.seoDescription && (
          <p className="text-text-secondary mt-2">{post.seoDescription}</p>
        )}
      </PageHeader>
      <PageContent>
        {/* Featured Image */}
        {post.featuredImage && (
          <div className="w-full h-64 md:h-96 overflow-hidden rounded-lg mb-6">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Post Meta */}
        <div className="flex items-center gap-4 text-sm text-text-tertiary mb-6">
          {post.author && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>
                {post.author.firstName} {post.author.lastName}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString()
                : new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Categories & Tags */}
        {(post.categories && post.categories.length > 0) ||
        (post.tags && post.tags.length > 0) ? (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.categories?.map((cat) => (
              <Badge key={cat.category.id} variant="outline">
                {cat.category.name}
              </Badge>
            ))}
            {post.tags?.map((tag) => (
              <Badge key={tag.tag.id} variant="secondary">
                {tag.tag.name}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Post Content */}
        {post.content && (
          <div className="prose prose-lg max-w-none">
            <PostContent content={post.content} />
          </div>
        )}
      </PageContent>
    </PageWrapper>
  );
}
