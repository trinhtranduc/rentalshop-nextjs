'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { PostCard, Button, Badge } from '@rentalshop/ui';
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
          limit: 2,
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
  }, [locale]);

  if (loading) {
    return (
      <section className="relative overflow-hidden py-24 bg-[#F4F8FC]" aria-label="Blog section">
        <div className="pointer-events-none absolute -top-24 right-0 h-[320px] w-[320px] rounded-full bg-[#C9DEF5]/40 blur-3xl" aria-hidden="true" />
        <div className="relative w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-7xl mx-auto">
            <Badge variant="outline" className="mb-5 px-3 py-1 text-xs font-medium text-sky-800 border-sky-200/80 bg-white/80">
              <FileText className="w-4 h-4 mr-2 text-sky-700" />
              Blog
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">{title}</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">{subtitle}</p>
          </div>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-700"></div>
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return null; // Don't show section if no posts
  }

  return (
    <section className="relative overflow-hidden py-24 bg-white" aria-label="Blog section">
      <div className="pointer-events-none absolute bottom-0 left-[-80px] h-[280px] w-[280px] rounded-full bg-[#D7E8F8]/50 blur-3xl" aria-hidden="true" />
      {/* Section Header - Centered with max-width */}
      <div className="relative w-full px-4 sm:px-6 lg:px-8 mb-16">
        <div className="text-center max-w-7xl mx-auto">
          <Badge variant="outline" className="mb-5 px-3 py-1 text-xs font-medium text-sky-800 border-sky-200/80 bg-white/80">
            <FileText className="w-4 h-4 mr-2 text-sky-700" />
            Blog
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">{title}</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">{subtitle}</p>
        </div>
      </div>

      {/* Posts Grid - Full width */}
      <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-16 2xl:px-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-7xl mx-auto">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>

      {/* View All Button - Centered */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-7xl mx-auto">
          <Link href="/blog">
            <Button variant="default" size="lg" className="inline-flex items-center rounded-xl px-8 py-3 text-base font-medium">
              View All Posts
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
