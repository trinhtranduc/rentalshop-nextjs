'use client'

import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Badge,
  Button
} from '@rentalshop/ui';
import { Edit, Trash2, Eye } from 'lucide-react';
import type { Category } from '@rentalshop/types';

interface CategoryTableProps {
  categories: Category[];
  onViewCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
}

export const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  onViewCategory,
  onDeleteCategory,
  sortField,
  sortOrder,
  onSortChange
}) => {
  const handleSort = (field: string) => {
    if (!onSortChange) return;
    
    const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    onSortChange(field, newOrder);
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-12 h-12 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No categories found
          </h3>
          <p className="text-muted-foreground">
            Get started by creating your first product category
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">ID</TableHead>
            <TableHead>
              {onSortChange ? (
                <Button
                  variant="ghost"
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Name
                  {getSortIcon('name')}
                </Button>
              ) : (
                'Name'
              )}
            </TableHead>
            <TableHead>Description</TableHead>
            <TableHead>
              {onSortChange ? (
                <Button
                  variant="ghost"
                  onClick={() => handleSort('isActive')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Status
                  {getSortIcon('isActive')}
                </Button>
              ) : (
                'Status'
              )}
            </TableHead>
            <TableHead>
              {onSortChange ? (
                <Button
                  variant="ghost"
                  onClick={() => handleSort('createdAt')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Created
                  {getSortIcon('createdAt')}
                </Button>
              ) : (
                'Created'
              )}
            </TableHead>
            <TableHead>
              {onSortChange ? (
                <Button
                  variant="ghost"
                  onClick={() => handleSort('updatedAt')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Updated
                  {getSortIcon('updatedAt')}
                </Button>
              ) : (
                'Updated'
              )}
            </TableHead>
            <TableHead className="w-36">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-mono text-sm">
                #{category.id}
              </TableCell>
              <TableCell className="font-medium">
                {category.name}
              </TableCell>
              <TableCell className="max-w-xs">
                {category.description ? (
                  <span className="truncate block" title={category.description}>
                    {category.description}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">No description</span>
                )}
              </TableCell>
              <TableCell>
                <Badge 
                  variant={category.isActive ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {category.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(category.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {category.updatedAt && category.updatedAt !== category.createdAt
                  ? new Date(category.updatedAt).toLocaleDateString()
                  : '-'
                }
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {/* View Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewCategory(category)}
                    className="h-8 px-3"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  
                  {/* Delete Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteCategory(category)}
                    className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
