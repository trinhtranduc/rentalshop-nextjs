'use client'

import React, { useState } from 'react';
import { Button, ButtonColorful } from '@rentalshop/ui';
import { Plus, Edit, Package } from 'lucide-react';
import { ProductDialog } from './ProductDialog';
import type { ProductWithDetails, Category, Outlet } from './types';

interface ProductActionsProps {
  categories: Category[];
  outlets: Outlet[];
  merchantId: string;
  onProductCreated?: (product: ProductWithDetails) => void;
  onProductUpdated?: (product: ProductWithDetails) => void;
  onError?: (error: string) => void;
  variant?: 'default' | 'colorful' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProductActions: React.FC<ProductActionsProps> = ({
  categories,
  outlets,
  merchantId,
  onProductCreated,
  onProductUpdated,
  onError,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  };

  const handleEditProduct = (product: ProductWithDetails) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSuccess = (product: ProductWithDetails) => {
    if (editingProduct) {
      onProductUpdated?.(product);
    } else {
      onProductCreated?.(product);
    }
  };

  const handleError = (error: string) => {
    onError?.(error);
  };

  const renderButton = () => {
    const baseProps = {
      onClick: handleAddProduct,
      className
    };

    switch (variant) {
      case 'colorful':
        return (
          <ButtonColorful
            {...baseProps}
            variant="default"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </ButtonColorful>
        );
      
      case 'minimal':
        return (
          <Button
            {...baseProps}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        );
      
      default:
        return (
          <Button
            {...baseProps}
            variant="default"
            size="default"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        );
    }
  };

  return (
    <>
      {renderButton()}
      
      <ProductDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        product={editingProduct}
        categories={categories}
        outlets={outlets}
        merchantId={merchantId}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </>
  );
};

// Export a function to programmatically open the edit dialog
export const openEditProductDialog = (
  product: ProductWithDetails,
  setEditingProduct: (product: ProductWithDetails | null) => void,
  setIsDialogOpen: (open: boolean) => void
) => {
  setEditingProduct(product);
  setIsDialogOpen(true);
};

// Export a function to programmatically open the add dialog
export const openAddProductDialog = (
  setEditingProduct: (product: ProductWithDetails | null) => void,
  setIsDialogOpen: (open: boolean) => void
) => {
  setEditingProduct(null);
  setIsDialogOpen(true);
};
