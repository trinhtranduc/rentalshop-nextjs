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
      {/* Featured Image - Always show with placeholder if missing */}
      <div className="w-full h-48 overflow-hidden rounded-t-lg bg-gray-100">
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
            className="w-16 h-16 text-gray-400"
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
