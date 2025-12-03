'use client'

import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../../../ui';
import { useCategoriesTranslations } from '@rentalshop/hooks';
import { CategoryFormContent } from './CategoryFormContent';
import type { Category } from '@rentalshop/types';

interface CategoryFormProps {
  category?: Category | null;
  onSave: (category: Category) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

/**
 * CategoryForm - Wrapper component that includes Dialog
 * This is kept for backward compatibility
 * For new code, use CategoryFormContent with your own Dialog wrapper
 */
export const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  onSave,
  onCancel,
  mode
}) => {
  const t = useCategoriesTranslations();
  
  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            {mode === 'create' ? t('dialog.addNew') : t('dialog.edit')}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {mode === 'create' 
              ? (t('dialog.addNewDescription') || 'Create a new category for organizing products')
              : (t('dialog.editDescription') || 'Update category information')
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 py-4 overflow-y-auto">
          <CategoryFormContent
            category={category}
            onSave={onSave}
            onCancel={onCancel}
            mode={mode}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
