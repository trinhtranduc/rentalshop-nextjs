'use client'

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from '../../../ui';
import { CategoryFormContent } from './CategoryFormContent';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
        </DialogHeader>
        
        <CategoryFormContent
          category={null}
          onSave={handleSave}
          onCancel={handleCancel}
          mode="create"
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
};
