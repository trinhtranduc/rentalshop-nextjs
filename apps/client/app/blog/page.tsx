'use client';

import React, { useState, useEffect } from 'react';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  PostCard,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  useToast,
} from '@rentalshop/ui';
import { postsApi } from '@rentalshop/utils';
import { Search } from 'lucide-react';
import type { Post, PostCategory, PostTag } from '@rentalshop/types';

export default function BlogPage() {
  const { toastError } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [tags, setTags] = useState<PostTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [selectedTag, setSelectedTag] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const limit = 12;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [postsRes, categoriesRes, tagsRes] = await Promise.all([
          postsApi.searchPublicPosts({
            search: search || undefined,
            categoryId: selectedCategory,
            tagId: selectedTag,
            page,
            limit,
          }),
          postsApi.getPublicCategories(),
          postsApi.getPublicTags(),
        ]);

        if (postsRes.success && postsRes.data) {
          setPosts(postsRes.data.data || []);
        }
        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }
        if (tagsRes.success && tagsRes.data) {
          setTags(tagsRes.data);
        }
      } catch (error) {
        console.error('Error fetching blog data:', error);
        toastError('Failed to load blog posts');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [search, selectedCategory, selectedTag, page, toastError]);

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Blog</PageTitle>
      </PageHeader>
      <PageContent>
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Select
              value={selectedCategory?.toString() || 'all'}
              onValueChange={(value) =>
                setSelectedCategory(value === 'all' ? undefined : parseInt(value))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedTag?.toString() || 'all'}
              onValueChange={(value) =>
                setSelectedTag(value === 'all' ? undefined : parseInt(value))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id.toString()}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="text-center py-12">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-text-tertiary">
            No posts found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {posts.length > 0 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">Page {page}</span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={posts.length < limit}
            >
              Next
            </Button>
          </div>
        )}
      </PageContent>
    </PageWrapper>
  );
}
