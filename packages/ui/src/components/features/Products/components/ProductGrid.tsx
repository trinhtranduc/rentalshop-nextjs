import React from 'react';
import { ProductCard } from './ProductCard';
import { Product } from '../types';

interface ProductGridProps {
  products: Product[];
  onProductAction: (action: string, productId: string) => void;
}

export function ProductGrid({ products, onProductAction }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p className="text-sm">
            Try adjusting your filters or add some products to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
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
          images={product.images || []} // Use actual product images or empty array if none
          category={{ name: product.category }}
          outlet={{ name: product.outletName }}
          onView={(productId) => onProductAction('view', productId)}
          onEdit={(productId) => onProductAction('edit', productId)}
          onDelete={(productId) => onProductAction('delete', productId)}
          variant="admin"
        />
      ))}
    </div>
  );
}
