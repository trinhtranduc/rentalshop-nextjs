'use client';

import React from 'react';
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
} from '../../ui';
import { Search, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import type { Post } from '@rentalshop/types';

interface PostListProps {
  posts: Post[];
  loading?: boolean;
  onEdit?: (post: Post) => void;
  onDelete?: (post: Post) => void;
  onPublish?: (post: Post) => void;
  onUnpublish?: (post: Post) => void;
  onCreate?: () => void;
  filters?: {
    status?: string;
    search?: string;
  };
  onFiltersChange?: (filters: { status?: string; search?: string }) => void;
}

export function PostList({
  posts,
  loading = false,
  onEdit,
  onDelete,
  onPublish,
  onUnpublish,
  onCreate,
  filters = {},
  onFiltersChange,
}: PostListProps) {
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

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">No posts found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
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
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(post)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {post.status === 'PUBLISHED' && onUnpublish && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onUnpublish(post)}
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      )}
                      {post.status !== 'PUBLISHED' && onPublish && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPublish(post)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(post)}
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
      </CardContent>
    </Card>
  );
}
