'use client'

import React from 'react';
import { Button } from '@rentalshop/ui';
import { Plus } from 'lucide-react';

interface CategoryHeaderProps {
  onAddCategory: () => void;
}

export const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  onAddCategory
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Product Categories</h1>
        <p className="text-muted-foreground">
          Manage your product categories for better organization
        </p>
      </div>
      
      <Button onClick={onAddCategory} className="flex items-center space-x-2">
        <Plus className="h-4 w-4" />
        <span>Add Category</span>
      </Button>
    </div>
  );
};
