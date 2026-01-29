'use client';

import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../ui';
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { PostTag } from '@rentalshop/types';

interface TagListProps {
  tags: PostTag[];
  loading?: boolean;
  onEdit?: (tag: PostTag) => void;
  onDelete?: (tag: PostTag) => void;
  onCreate?: () => void;
  search?: string;
  onSearchChange?: (search: string) => void;
}

export function TagList({
  tags,
  loading = false,
  onEdit,
  onDelete,
  onCreate,
  search = '',
  onSearchChange,
}: TagListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tags</CardTitle>
          {onCreate && (
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Tag
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        {onSearchChange && (
          <div className="mb-4">
            <Input
              placeholder="Search tags..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="max-w-sm"
            />
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : tags.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">No tags found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell className="font-medium">{tag.name}</TableCell>
                  <TableCell className="text-text-tertiary">{tag.slug}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(tag)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(tag)}
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
