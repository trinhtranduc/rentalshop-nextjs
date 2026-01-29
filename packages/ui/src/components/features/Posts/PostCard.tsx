'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../../ui';
import { PostContent } from './PostContent';
import { Calendar, User } from 'lucide-react';
import type { Post } from '@rentalshop/types';
import Link from 'next/link';

interface PostCardProps {
  post: Post;
  showFullContent?: boolean;
}

export function PostCard({ post, showFullContent = false }: PostCardProps) {
  return (
    <Card>
      {post.featuredImage && (
        <div className="w-full h-48 overflow-hidden rounded-t-lg">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <CardTitle>
          <Link href={`/blog/${post.slug}`} className="hover:text-action-primary">
            {post.title}
          </Link>
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-text-tertiary mt-2">
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
      </CardHeader>
      <CardContent>
        {post.excerpt && (
          <p className="text-text-secondary mb-4">{post.excerpt}</p>
        )}

        {post.categories && post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.categories.map((cat) => (
              <Badge key={cat.category.id} variant="outline">
                {cat.category.name}
              </Badge>
            ))}
          </div>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <Badge key={tag.tag.id} variant="secondary">
                {tag.tag.name}
              </Badge>
            ))}
          </div>
        )}

        {showFullContent && post.content && (
          <div className="mt-4">
            <PostContent content={post.content} />
          </div>
        )}

        {!showFullContent && (
          <Link
            href={`/blog/${post.slug}`}
            className="text-action-primary hover:underline mt-4 inline-block"
          >
            Read more →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
