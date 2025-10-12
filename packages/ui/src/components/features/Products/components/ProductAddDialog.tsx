'use client'

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  Button
} from '../../../ui';
import { ProductAddForm } from './ProductAddForm';
import type { Category, Outlet, ProductWithDetails } from '@rentalshop/types';

interface ProductAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  outlets: Outlet[];
  merchantId: string;
  onProductCreated?: (product: ProductWithDetails) => void;
  onError?: (error: string) => void;
}

export const ProductAddDialog: React.FC<ProductAddDialogProps> = ({
  open,
  onOpenChange,
  categories,
  outlets,
  merchantId,
  onProductCreated,
  onError
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  console.log('🟢 ProductAddDialog: Rendered with open =', open);

  const handleSave = async (productData: any) => {
    try {
      setIsSubmitting(true);
      
      // Call the parent callback to create the product
      // The parent will handle the API call and show toasts
      if (onProductCreated) {
        await onProductCreated(productData);
      }
      
      // Close dialog on success
      onOpenChange(false);
      
    } catch (error) {
      console.error('❌ ProductAddDialog: Error occurred:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : 'Failed to create product');
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
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Add New Product
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          <ProductAddForm
            categories={categories}
            outlets={outlets}
            merchantId={merchantId}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
