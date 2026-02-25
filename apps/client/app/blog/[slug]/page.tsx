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
import type { Metadata } from 'next';
import { db } from '@rentalshop/database';

// Generate metadata for SEO (runs on server)
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  
  // Try to fetch post from database for metadata
  try {
    // Try all locales to find the published post
    const locales: ('en' | 'vi' | 'zh' | 'ko' | 'ja')[] = ['vi', 'en', 'zh', 'ko', 'ja'];
    let post = null;
    
    for (const locale of locales) {
      try {
        const result = await db.posts.findBySlug(slug, locale);
        // Check if post exists and is published
        if (result && result.status === 'PUBLISHED' && result.publishedAt) {
          post = result;
          break;
        }
      } catch (err) {
        // Continue to next locale if this one fails
        continue;
      }
    }

    if (post) {
      const title = post.seoTitle || post.title;
      const description = post.seoDescription || post.excerpt || `Read ${post.title} on AnyRent blog`;
      
      return {
        title: `${title} - AnyRent Blog`,
        description,
        keywords: post.seoKeywords ? post.seoKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0) : undefined,
        openGraph: {
          title,
          description,
          type: 'article',
          publishedTime: post.publishedAt ? post.publishedAt.toISOString() : undefined,
          modifiedTime: post.updatedAt ? post.updatedAt.toISOString() : undefined,
          images: post.featuredImage ? [post.featuredImage] : undefined,
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: post.featuredImage ? [post.featuredImage] : undefined,
        },
        robots: {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
      };
    }
  } catch (error) {
    console.error('Error generating metadata for blog post:', error);
  }

  // Default metadata if post not found or not published
  return {
    title: 'Blog Post - AnyRent',
    description: 'Read our latest blog posts about rental business management',
    robots: {
      index: false,
      follow: false,
    },
  };
}

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

        let response;
        
        if (categoryId || tagId) {
          // Fetch posts with same category or tag
          response = await postsApi.searchPublicPosts({
            locale,
            categoryId,
            tagId,
            page: 1,
            limit: 6, // Fetch more to ensure we have enough after filtering
            sortBy: 'publishedAt',
            sortOrder: 'desc',
          });
        } else {
          // If no category or tag, fetch latest posts
          response = await postsApi.searchPublicPosts({
            locale,
            page: 1,
            limit: 4,
            sortBy: 'publishedAt',
            sortOrder: 'desc',
          });
        }

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
      {/* Hero Header with Featured Image */}
      <div className="relative w-full h-64 md:h-96 lg:h-[500px] overflow-hidden mb-8">
        {/* Background Image or Gradient */}
        {post.featuredImage ? (
          <div className="absolute inset-0">
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
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400" />
        )}
        
        {/* Placeholder - shown when image fails to load */}
        {post.featuredImage && (
          <div className="hidden absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 flex items-center justify-center">
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
        )}

        {/* Header Content */}
        <div className="relative z-10 h-full flex flex-col justify-end">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
            <div className="max-w-3xl">
              {/* Categories */}
              {post.categories && post.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.categories.map((cat) => (
                    <Badge key={cat.category.id} variant="outline" className="bg-white/90 text-gray-900 border-white/50">
                      {cat.category.name}
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                {post.seoTitle || post.title}
              </h1>
              
              {/* Description */}
              {post.seoDescription && (
                <p className="text-lg md:text-xl text-white/90 mb-6 leading-relaxed">
                  {post.seoDescription}
                </p>
              )}
              
              {/* Meta Info */}
              <div className="flex items-center gap-6 text-sm text-white/80">
                {post.author && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>
                      {post.author.firstName} {post.author.lastName}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : new Date(post.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PageContent className="py-12 px-4 sm:px-6 lg:px-8">
        {/* Post Content Container - Limited width for better readability */}
        <div className="max-w-3xl mx-auto">

        {/* Tags - Only show tags here since categories are in header */}
        {post.tags && post.tags.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
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

        {/* Post Content */}
        {post.content && (
          <div className="prose prose-lg max-w-none mb-12">
            <PostContent content={post.content} />
          </div>
        )}
        </div>

        {/* Related Posts - Always show section */}
        <div className="mt-12 pt-8 border-t border-border max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">Related Posts</h2>
          {loadingRelated ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-action-primary"></div>
            </div>
          ) : relatedPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <PostCard key={relatedPost.id} post={relatedPost} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-tertiary">
              <p>No related posts found.</p>
            </div>
          )}
        </div>
      </PageContent>
    </PageWrapper>
  );
}
