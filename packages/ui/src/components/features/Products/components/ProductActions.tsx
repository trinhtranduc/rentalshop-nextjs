'use client';

import React, { useState } from 'react';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { useUserRole } from '@rentalshop/hooks';

import type { ProductWithDetails, Category, Outlet } from '@rentalshop/types';

interface ProductActionsProps {
  onAction: (action: string, productId?: number) => void;
  categories: Category[];
  outlets: Outlet[];
  merchantId: number;
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
  // Use hook instead of prop
  const { role: currentUserRole, canManageProducts, canManageCategories } = useUserRole();
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

  // Filter actions based on user role - OUTLET_STAFF cannot create/update products or manage categories
  const allActions = [
    {
      id: 'add-product',
      label: 'Add Product',
      description: 'Create a new product',
      icon: '➕',
      variant: 'default' as const,
      onClick: handleAddProduct,
      roles: canManageProducts ? ['ALL'] : [] // Use permission check
    },
    {
      id: 'import-products',
      label: 'Import Products',
      description: 'Import from CSV/Excel',
      icon: '📥',
      variant: 'secondary' as const,
      onClick: () => onAction('import-products'),
      roles: canManageProducts ? ['ALL'] : [] // Use permission check
    },
    {
      id: 'export-products',
      label: 'Export Products',
      description: 'Export to CSV/Excel',
      icon: '📤',
      variant: 'outline' as const,
      onClick: () => onAction('export-products'),
      roles: ['ALL'] // All roles can export
    },
    {
      id: 'bulk-edit',
      label: 'Bulk Edit',
      description: 'Edit multiple products',
      icon: '✏️',
      variant: 'outline' as const,
      onClick: () => onAction('bulk-edit'),
      roles: canManageProducts ? ['ALL'] : [] // Use permission check
    },
    {
      id: 'manage-categories',
      label: 'Manage Categories',
      description: 'Organize product categories',
      icon: '🏷️',
      variant: 'outline' as const,
      onClick: () => onAction('manage-categories'),
      roles: canManageCategories ? ['ALL'] : [] // Use permission check
    },
    {
      id: 'inventory-check',
      label: 'Inventory Check',
      description: 'Perform stock count',
      icon: '🔍',
      variant: 'outline' as const,
      onClick: () => onAction('inventory-check'),
      roles: ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'] // All roles can do inventory check
    }
  ];

  // Filter actions based on current user role
  const actions = allActions.filter(action => 
    !action.roles || action.roles.length > 0
  ).map(({ roles, ...action }) => action); // Remove roles property from final actions

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
