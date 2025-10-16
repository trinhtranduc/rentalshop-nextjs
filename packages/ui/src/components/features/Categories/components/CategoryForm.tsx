'use client'

import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t('dialog.addNew') : t('dialog.edit')}
          </DialogTitle>
        </DialogHeader>
        
        <CategoryFormContent
          category={category}
          onSave={onSave}
          onCancel={onCancel}
          mode={mode}
        />
      </DialogContent>
    </Dialog>
  );
};
