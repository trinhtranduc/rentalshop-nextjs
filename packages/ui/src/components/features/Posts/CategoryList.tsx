'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { PostCategory } from '@rentalshop/types';

interface CategoryListProps {
  categories: PostCategory[];
  loading?: boolean;
  onEdit?: (category: PostCategory) => void;
  onDelete?: (category: PostCategory) => void;
  onCreate?: () => void;
  search?: string;
  onSearchChange?: (search: string) => void;
}

export function CategoryList({
  categories,
  loading = false,
  onEdit,
  onDelete,
  onCreate,
  search = '',
  onSearchChange,
}: CategoryListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Categories</CardTitle>
          {onCreate && (
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Category
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        {onSearchChange && (
          <div className="mb-4">
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="max-w-sm"
            />
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">No categories found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-text-tertiary">{category.slug}</TableCell>
                  <TableCell className="text-text-tertiary">
                    {category.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.isActive ? 'default' : 'secondary'}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(category)}
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
