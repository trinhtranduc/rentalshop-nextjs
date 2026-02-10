'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { PostCard, Button } from '@rentalshop/ui';
import { postsApi } from '@rentalshop/utils';
import { ArrowRight, FileText } from 'lucide-react';
import type { Post } from '@rentalshop/types';

interface BlogSectionProps {
  title?: string;
  subtitle?: string;
}

export default function BlogSection({ 
  title = 'Latest Blog Posts',
  subtitle = 'Discover insights and tips for your rental business'
}: BlogSectionProps) {
  const locale = useLocale() as 'en' | 'vi' | 'zh' | 'ko' | 'ja';
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestPosts = async () => {
      try {
        setLoading(true);
        const response = await postsApi.searchPublicPosts({
          page: 1,
          limit: 3,
          sortBy: 'publishedAt',
          sortOrder: 'desc',
          locale,
        });

        if (response.success && response.data) {
          setPosts(response.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching latest posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestPosts();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-gray-50" aria-label="Blog section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{title}</h2>
            <p className="text-xl text-gray-600">{subtitle}</p>
          </div>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-action-primary"></div>
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return null; // Don't show section if no posts
  }

  return (
    <section className="py-20 bg-gray-50" aria-label="Blog section">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-action-primary mr-2" />
            <h2 className="text-4xl font-bold text-gray-900">{title}</h2>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Link href="/blog">
            <Button variant="default" size="lg" className="inline-flex items-center">
              View All Posts
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
