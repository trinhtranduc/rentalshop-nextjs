import React from 'react';
import { ProductCard, ProductCardProps } from './ProductCard';
import { cn } from '../../lib/cn';

export interface Product {
  id: string;
  name: string;
  description?: string;
  stock: number;
  renting: number;
  available: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images: string[];
  category: {
    name: string;
  };
  outlet: {
    name: string;
  };
}

export interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  error?: string;
  variant?: 'client' | 'admin' | 'mobile';
  onRent?: (productId: string) => void;
  onView?: (productId: string) => void;
  onEdit?: (productId: string) => void;
  onDelete?: (productId: string) => void;
  className?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading = false,
  error,
  variant = 'client',
  onRent,
  onView,
  onEdit,
  onDelete,
  className,
}) => {
  if (loading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6', className)}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Products</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-gray-400 text-6xl mb-4">📦</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Found</h3>
        <p className="text-gray-600">
          {variant === 'admin' 
            ? 'No products have been added yet. Create your first product to get started.'
            : 'No products are currently available. Please check back later.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      'grid gap-6',
      variant === 'mobile' 
        ? 'grid-cols-1 sm:grid-cols-2' 
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      className
    )}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          {...product}
          variant={variant}
          onRent={onRent}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}; 