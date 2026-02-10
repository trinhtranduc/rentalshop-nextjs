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
  PostCard,
} from '@rentalshop/ui';
import { postsApi } from '@rentalshop/utils';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Calendar, User, Tag, FolderOpen } from 'lucide-react';
import type { Post } from '@rentalshop/types';

export default function BlogPostPage() {
  const params = useParams();
  const locale = useLocale() as 'en' | 'vi' | 'zh' | 'ko' | 'ja';
  const { toastError } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRelated, setLoadingRelated] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, locale]);

  // Fetch related posts when post is loaded
  useEffect(() => {
    if (!post) return;

    const fetchRelatedPosts = async () => {
      setLoadingRelated(true);
      try {
        // Get first category or first tag to find related posts
        // Priority: category first, then tag
        const categoryId = post.categories && post.categories.length > 0 
          ? post.categories[0].category.id 
          : undefined;
        const tagId = !categoryId && post.tags && post.tags.length > 0 
          ? post.tags[0].tag.id 
          : undefined;

        if (!categoryId && !tagId) {
          setLoadingRelated(false);
          return;
        }

        // Fetch posts with same category or tag
        const response = await postsApi.searchPublicPosts({
          locale,
          categoryId,
          tagId,
          page: 1,
          limit: 6, // Fetch more to ensure we have enough after filtering
          sortBy: 'publishedAt',
          sortOrder: 'desc',
        });

        if (response.success && response.data) {
          // Filter out current post and limit to 3 related posts
          const filtered = response.data.data
            .filter((p) => p.id !== post.id)
            .slice(0, 3);
          setRelatedPosts(filtered);
        }
      } catch (error) {
        console.error('Error fetching related posts:', error);
      } finally {
        setLoadingRelated(false);
      }
    };

    fetchRelatedPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id, locale]);

  if (loading) {
    return (
      <PageWrapper>
        <PageLoadingIndicator loading={true} />
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
        {/* Featured Image - Always show with placeholder if missing */}
        <div className="w-full h-64 md:h-96 overflow-hidden rounded-lg mb-6 bg-gray-100 flex items-center justify-center">
          {post.featuredImage ? (
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          {/* Placeholder - shown when no image or image fails to load */}
          <div className={`${post.featuredImage ? 'hidden' : ''} w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300`}>
            <svg
              className="w-24 h-24 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

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
          <div className="mb-8 space-y-4">
            {post.categories && post.categories.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="h-4 w-4 text-text-tertiary" />
                  <span className="text-sm font-medium text-text-secondary">Categories</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.categories.map((cat) => (
                    <Badge key={cat.category.id} variant="outline" className="text-sm">
                      {cat.category.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {post.tags && post.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-text-tertiary" />
                  <span className="text-sm font-medium text-text-secondary">Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge key={tag.tag.id} variant="secondary" className="text-sm">
                      {tag.tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Post Content */}
        {post.content && (
          <div className="prose prose-lg max-w-none mb-12">
            <PostContent content={post.content} />
          </div>
        )}

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12 pt-8 border-t border-border">
            <h2 className="text-2xl font-bold text-text-primary mb-6">Related Posts</h2>
            {loadingRelated ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-action-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <PostCard key={relatedPost.id} post={relatedPost} />
                ))}
              </div>
            )}
          </div>
        )}
      </PageContent>
    </PageWrapper>
  );
}
