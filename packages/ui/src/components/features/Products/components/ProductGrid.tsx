'use client';

import React, { useState } from 'react';
import { ProductCard } from './ProductCard';
import { Product } from '@rentalshop/types';
import { Button } from '../../../ui/button';

import type { ProductWithDetails, Category, Outlet } from '@rentalshop/types';

interface ProductGridProps {
  products: Product[];
  onProductAction: (action: string, productId: number) => void;
  // New props for enhanced functionality
  categories?: Category[];
  outlets?: Outlet[];
  merchantId?: number;
  onProductCreated?: (product: ProductWithDetails) => void;
  onProductUpdated?: (product: ProductWithDetails) => void;
  onError?: (error: string) => void;
  showAddButton?: boolean;
}

export function ProductGrid({ 
  products, 
  onProductAction,
  categories = [],
  outlets = [],
  merchantId = '',
  onProductCreated,
  onProductUpdated,
  onError,
  showAddButton = false
}: ProductGridProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddProduct = () => {
    setIsAddDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
  };

  const handleSuccess = (product: ProductWithDetails) => {
    if (onProductCreated) {
      onProductCreated(product);
    }
    setIsAddDialogOpen(false);
  };

  const handleError = (error: string) => {
    if (onError) {
      onError(error);
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p className="text-sm mb-4">
            Try adjusting your filters or add some products to get started.
          </p>
          {showAddButton && categories.length > 0 && outlets.length > 0 && merchantId && (
            <Button
              onClick={handleAddProduct}
              className="px-4 py-2"
            >
              Add Your First Product
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            description={product.description}
            stock={product.stock}
            renting={product.renting}
            available={product.available}
            rentPrice={product.rentPrice}
            deposit={product.deposit}
            images={product.images || []}
            category={{ name: product.category }}
            outlet={{ name: product.outletName }}
            onView={(productId) => onProductAction('view', productId)}
            onEdit={(productId) => onProductAction('edit', productId)}
            onDelete={(productId) => onProductAction('delete', productId)}
            variant="admin"
            // Enhanced props for edit functionality
            categories={categories}
            outlets={outlets}
            merchantId={merchantId}
            onProductUpdated={onProductUpdated}
            onError={onError}
          />
        ))}
      </div>


    </>
  );
}
