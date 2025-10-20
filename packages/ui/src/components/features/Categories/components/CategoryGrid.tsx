'use client'

import React from 'react';
import { CategoryCard } from './CategoryCard';
import type { Category } from '@rentalshop/types';
import { useCategoriesTranslations } from '@rentalshop/hooks';

interface CategoryGridProps {
  categories: Category[];
  onViewCategory: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  onViewCategory,
  onEditCategory,
  sortField,
  sortOrder,
  onSortChange
}) => {
  const t = useCategoriesTranslations();
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
            {t('messages.noCategories')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('messages.getStarted')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onView={onViewCategory}
            onEdit={onEditCategory}
          />
        ))}
      </div>
    </div>
  );
};
