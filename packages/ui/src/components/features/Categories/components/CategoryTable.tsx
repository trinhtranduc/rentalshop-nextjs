'use client'

import React from 'react';
import { 
  Card,
  CardContent,
  Badge,
  Button
} from '@rentalshop/ui';
import { Edit, Eye } from 'lucide-react';
import type { Category } from '@rentalshop/types';

interface CategoryTableProps {
  categories: Category[];
  onViewCategory: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
}

export const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  onViewCategory,
  onEditCategory,
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
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">🏷️</div>
            <h3 className="text-lg font-medium mb-2">No categories found</h3>
            <p className="text-sm">
              Get started by creating your first product category
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with sorting options */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Categories ({categories.length})
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Sort by:</span>
          <div className="flex items-center gap-1">
            {[
              { key: 'name', label: 'Name' },
              { key: 'isActive', label: 'Status' },
              { key: 'createdAt', label: 'Created' },
              { key: 'updatedAt', label: 'Updated' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  sortField === key
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {label}
                {getSortIcon(key) && (
                  <span className="ml-1">{getSortIcon(key)}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Card-style rows */}
      <div className="grid gap-4">
        {categories.map((category) => (
          <Card 
            key={category.id} 
            className="hover:shadow-md transition-shadow duration-200 border-gray-200 dark:border-gray-700"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {/* Left side - Main info */}
                <div className="flex items-center gap-3 flex-1">
                  {/* Category Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {category.name}
                      </h3>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        #{category.id}
                      </div>
                      <Badge 
                        variant={category.isActive ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {category.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      {/* Description */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Description</p>
                        <p className="text-gray-900 dark:text-white">
                          {category.description ? (
                            <span title={category.description}>
                              {category.description.length > 50 
                                ? `${category.description.substring(0, 50)}...` 
                                : category.description
                              }
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">No description</span>
                          )}
                        </p>
                      </div>
                      
                      {/* Created Date */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Created</p>
                        <p className="text-gray-900 dark:text-white">
                          {new Date(category.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      
                      {/* Updated Date */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Updated</p>
                        <p className="text-gray-900 dark:text-white">
                          {category.updatedAt && category.updatedAt !== category.createdAt
                            ? new Date(category.updatedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : '-'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right side - Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewCategory(category)}
                    className="h-8 px-3"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditCategory(category)}
                    className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
