'use client';

import React, { useState, useEffect } from 'react';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  useToast,
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PageLoadingIndicator,
} from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { useRouter, useParams } from 'next/navigation';
import { postsApi } from '@rentalshop/utils';
import { ArrowLeft, Edit, Eye, Calendar, User, Tag } from 'lucide-react';
import { PostContent } from '@rentalshop/ui';
import type { Post } from '@rentalshop/types';

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { toastError } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const postId = params?.id ? parseInt(params.id as string) : null;

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        const response = await postsApi.getPost(postId);
        if (response.success && response.data) {
          setPost(response.data);
        } else {
          toastError('Post not found');
          router.push('/posts');
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        toastError('Failed to load post');
        router.push('/posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, router, toastError]);

  const handleEdit = () => {
    if (post) {
      router.push(`/posts/${post.id}/edit`);
    }
  };

  const handleBack = () => {
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
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-text-tertiary">Post not found.</p>
              <Button onClick={handleBack} className="mt-4" variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Posts
              </Button>
            </CardContent>
          </Card>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={handleBack} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <PageTitle>{post.title}</PageTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                post.status === 'PUBLISHED'
                  ? 'default'
                  : post.status === 'DRAFT'
                  ? 'secondary'
                  : 'outline'
              }
            >
              {post.status}
            </Badge>
            <Button onClick={handleEdit} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-6">
          {/* Post Meta Information */}
          <Card>
            <CardHeader>
              <CardTitle>Post Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-text-tertiary" />
                  <span className="text-sm text-text-tertiary">Author:</span>
                  <span className="text-sm font-medium">
                    {post.author
                      ? `${post.author.firstName} ${post.author.lastName}`
                      : 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-text-tertiary" />
                  <span className="text-sm text-text-tertiary">Created:</span>
                  <span className="text-sm font-medium">
                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {post.publishedAt && (
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-text-tertiary" />
                    <span className="text-sm text-text-tertiary">Published:</span>
                    <span className="text-sm font-medium">
                      {new Date(post.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-text-tertiary" />
                  <span className="text-sm text-text-tertiary">Last Updated:</span>
                  <span className="text-sm font-medium">
                    {new Date(post.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categories and Tags */}
          {(post.categories && post.categories.length > 0) ||
          (post.tags && post.tags.length > 0) ? (
            <Card>
              <CardHeader>
                <CardTitle>Categories & Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {post.categories && post.categories.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4 text-text-tertiary" />
                        <span className="text-sm font-medium">Categories:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {post.categories.map((cat) => (
                          <Badge key={cat.category.id} variant="outline">
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
                        <span className="text-sm font-medium">Tags:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <Badge key={tag.tag.id} variant="secondary">
                            {tag.tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Featured Image */}
          {post.featuredImage && (
            <Card>
              <CardHeader>
                <CardTitle>Featured Image</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  className="w-full h-auto rounded-lg max-w-2xl"
                />
              </CardContent>
            </Card>
          )}

          {/* Excerpt */}
          {post.excerpt && (
            <Card>
              <CardHeader>
                <CardTitle>Excerpt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary">{post.excerpt}</p>
              </CardContent>
            </Card>
          )}

          {/* Post Content */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <PostContent content={post.content} />
            </CardContent>
          </Card>

          {/* SEO Information */}
          {(post.seoTitle || post.seoDescription || post.seoKeywords) && (
            <Card>
              <CardHeader>
                <CardTitle>SEO Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {post.seoTitle && (
                    <div>
                      <span className="text-sm font-medium text-text-tertiary">SEO Title:</span>
                      <p className="text-sm mt-1">{post.seoTitle}</p>
                    </div>
                  )}
                  {post.seoDescription && (
                    <div>
                      <span className="text-sm font-medium text-text-tertiary">
                        SEO Description:
                      </span>
                      <p className="text-sm mt-1">{post.seoDescription}</p>
                    </div>
                  )}
                  {post.seoKeywords && (
                    <div>
                      <span className="text-sm font-medium text-text-tertiary">SEO Keywords:</span>
                      <p className="text-sm mt-1">{post.seoKeywords}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContent>
    </PageWrapper>
  );
}
