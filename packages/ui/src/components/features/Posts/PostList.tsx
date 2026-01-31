'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Pagination,
} from '../../ui';
import { Search, Plus, Edit, Trash2, Eye, EyeOff, FileText, CheckSquare, Square } from 'lucide-react';
import type { Post } from '@rentalshop/types';

interface PostListProps {
  posts: Post[];
  loading?: boolean;
  onEdit?: (post: Post) => void;
  onView?: (post: Post) => void;
  onDelete?: (post: Post) => void;
  onPublish?: (post: Post) => void;
  onUnpublish?: (post: Post) => void;
  onCreate?: () => void;
  filters?: {
    status?: string;
    search?: string;
  };
  onFiltersChange?: (filters: { status?: string; search?: string }) => void;
  // Pagination props
  pagination?: {
    currentPage: number;
    totalPages: number;
    total: number;
    limit: number;
  };
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  // Bulk operations
  onBulkDelete?: (postIds: number[]) => void;
  onBulkPublish?: (postIds: number[]) => void;
  onBulkUnpublish?: (postIds: number[]) => void;
}

export function PostList({
  posts,
  loading = false,
  onEdit,
  onView,
  onDelete,
  onPublish,
  onUnpublish,
  onCreate,
  filters = {},
  onFiltersChange,
  pagination,
  onPageChange,
  onLimitChange,
  onBulkDelete,
  onBulkPublish,
  onBulkUnpublish,
}: PostListProps) {
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set());

  const hasBulkOperations = onBulkDelete || onBulkPublish || onBulkUnpublish;

  const allSelected = useMemo(() => {
    return posts.length > 0 && selectedPosts.size === posts.length;
  }, [posts.length, selectedPosts.size]);

  const someSelected = useMemo(() => {
    return selectedPosts.size > 0 && selectedPosts.size < posts.length;
  }, [posts.length, selectedPosts.size]);

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(posts.map((p) => p.id)));
    }
  };

  const handleSelectPost = (postId: number) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPosts(newSelected);
  };

  const handleBulkPublish = () => {
    if (onBulkPublish && selectedPosts.size > 0) {
      onBulkPublish(Array.from(selectedPosts));
      setSelectedPosts(new Set());
    }
  };

  const handleBulkUnpublish = () => {
    if (onBulkUnpublish && selectedPosts.size > 0) {
      onBulkUnpublish(Array.from(selectedPosts));
      setSelectedPosts(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedPosts.size > 0) {
      onBulkDelete(Array.from(selectedPosts));
      setSelectedPosts(new Set());
    }
  };

  // Clear selection when posts change
  React.useEffect(() => {
    setSelectedPosts(new Set());
  }, [posts]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Posts</CardTitle>
          {onCreate && (
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Search posts..."
            value={filters.search || ''}
            onChange={(e) =>
              onFiltersChange?.({ ...filters, search: e.target.value })
            }
            className="flex-1"
          />
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              onFiltersChange?.({ ...filters, status: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions Bar */}
        {hasBulkOperations && selectedPosts.size > 0 && (
          <div className="flex items-center justify-between p-3 mb-4 bg-bg-secondary rounded-lg border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedPosts.size} post{selectedPosts.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onBulkPublish && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkPublish}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              )}
              {onBulkUnpublish && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkUnpublish}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Unpublish
                </Button>
              )}
              {onBulkDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">No posts found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {hasBulkOperations && (
                  <TableHead className="w-12">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-8 w-8 p-0"
                      title={allSelected ? 'Deselect all' : 'Select all'}
                    >
                      {allSelected ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : someSelected ? (
                        <div className="h-4 w-4 border-2 border-current rounded" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                )}
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  {hasBulkOperations && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectPost(post.id)}
                        className="h-8 w-8 p-0"
                        title={selectedPosts.has(post.id) ? 'Deselect' : 'Select'}
                      >
                        {selectedPosts.has(post.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    {post.author
                      ? `${post.author.firstName} ${post.author.lastName}`
                      : 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {post.categories?.slice(0, 2).map((cat) => (
                        <Badge key={cat.category.id} variant="outline">
                          {cat.category.name}
                        </Badge>
                      ))}
                      {post.categories && post.categories.length > 2 && (
                        <Badge variant="outline">+{post.categories.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {onView && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(post)}
                          title="View post"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(post)}
                          title="Edit post"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {post.status === 'PUBLISHED' && onUnpublish && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onUnpublish(post)}
                          title="Unpublish post"
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      )}
                      {post.status !== 'PUBLISHED' && onPublish && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPublish(post)}
                          title="Publish post"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(post)}
                          title="Delete post"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {pagination && onPageChange && (
          <div className="mt-4 pt-4 border-t">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={onPageChange}
              onLimitChange={onLimitChange}
              itemName="posts"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
