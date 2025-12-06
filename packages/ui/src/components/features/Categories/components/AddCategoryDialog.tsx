'use client'

import React, { useState } from 'react';
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

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryCreated?: (category: Category) => void;
  onError?: (error: any) => void;
}

export const AddCategoryDialog: React.FC<AddCategoryDialogProps> = ({
  open,
  onOpenChange,
  onCategoryCreated,
  onError
}) => {
  const t = useCategoriesTranslations();
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
      // ✅ Pass error object (not string) so onError can extract code for translation
      // onCategoryCreated already shows toast, so onError is only for additional handling if needed
      if (onError) {
        onError(error); // Pass full error object to preserve code field
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            {t('dialog.addNew')}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {t('dialog.addNewDescription') || 'Create a new category for organizing products'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 py-4 overflow-y-auto">
        <CategoryFormContent
          category={null}
          onSave={handleSave}
          onCancel={handleCancel}
          mode="create"
          isSubmitting={isSubmitting}
        />
        </div>
      </DialogContent>
    </Dialog>
  );
};
