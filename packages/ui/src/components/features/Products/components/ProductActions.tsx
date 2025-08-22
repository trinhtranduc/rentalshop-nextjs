import React, { useState } from 'react';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';

import type { ProductWithDetails, Category, Outlet } from '@rentalshop/types';

interface ProductActionsProps {
  onAction: (action: string, productId?: string) => void;
  categories: Category[];
  outlets: Outlet[];
  merchantId: string;
  onProductCreated?: (product: ProductWithDetails) => void;
  onProductUpdated?: (product: ProductWithDetails) => void;
  onError?: (error: string) => void;
}

export function ProductActions({ 
  onAction, 
  categories, 
  outlets, 
  merchantId,
  onProductCreated,
  onProductUpdated,
  onError
}: ProductActionsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsAddDialogOpen(true);
  };

  const handleEditProduct = (product: ProductWithDetails) => {
    setEditingProduct(product);
    setIsAddDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSuccess = (product: ProductWithDetails) => {
    if (editingProduct) {
      onProductUpdated?.(product);
    } else {
      onProductCreated?.(product);
    }
    setIsAddDialogOpen(false);
  };

  const handleError = (error: string) => {
    onError?.(error);
  };

  const actions = [
    {
      id: 'add-product',
      label: 'Add Product',
      description: 'Create a new product',
      icon: '➕',
      variant: 'default' as const,
      onClick: handleAddProduct
    },
    {
      id: 'import-products',
      label: 'Import Products',
      description: 'Import from CSV/Excel',
      icon: '📥',
      variant: 'secondary' as const,
      onClick: () => onAction('import-products')
    },
    {
      id: 'export-products',
      label: 'Export Products',
      description: 'Export to CSV/Excel',
      icon: '📤',
      variant: 'outline' as const,
      onClick: () => onAction('export-products')
    },
    {
      id: 'bulk-edit',
      label: 'Bulk Edit',
      description: 'Edit multiple products',
      icon: '✏️',
      variant: 'outline' as const,
      onClick: () => onAction('bulk-edit')
    },
    {
      id: 'manage-categories',
      label: 'Manage Categories',
      description: 'Organize product categories',
      icon: '🏷️',
      variant: 'outline' as const,
      onClick: () => onAction('manage-categories')
    },
    {
      id: 'inventory-check',
      label: 'Inventory Check',
      description: 'Perform stock count',
      icon: '🔍',
      variant: 'outline' as const,
      onClick: () => onAction('inventory-check')
    }
  ];

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant}
                className="h-auto p-3 flex flex-col items-start space-y-2 text-left"
                onClick={action.onClick}
              >
                <div className="flex items-center space-x-2 w-full">
                  <span className="text-lg">{action.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{action.label}</div>
                    <div className="text-xs opacity-80">{action.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>


    </>
  );
}
