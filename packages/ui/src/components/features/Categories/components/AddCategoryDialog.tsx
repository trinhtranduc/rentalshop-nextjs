'use client'

import React, { useState } from 'react';
import { CategoryForm } from './CategoryForm';
import type { Category } from '@rentalshop/types';

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryCreated?: (category: Category) => void;
  onError?: (error: string) => void;
}

export const AddCategoryDialog: React.FC<AddCategoryDialogProps> = ({
  open,
  onOpenChange,
  onCategoryCreated,
  onError
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (categoryData: Category) => {
    try {
      setIsSubmitting(true);
      
      // Call the parent callback to create the category
      // The parent will handle the API call and show toasts
      if (onCategoryCreated) {
        await onCategoryCreated(categoryData);
      }
      
      // Close dialog on success
      onOpenChange(false);
      
    } catch (error) {
      console.error('❌ AddCategoryDialog: Error occurred:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : 'Failed to create category');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return; // Prevent cancellation while submitting
    onOpenChange(false);
  };

  // CategoryForm already has Dialog wrapper, so just render it when open
  if (!open) return null;

  return (
    <CategoryForm
      category={null}
      onSave={handleSave}
      onCancel={handleCancel}
      mode="create"
    />
  );
};
