'use client';

import React, { useState, useMemo } from 'react';
import { ProductCard } from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';
import { cn } from '@rentalshop/ui';
import type { Product, Category } from '@rentalshop/types';

interface PublicProductGridProps {
  products: Product[];
  categories: Category[];
  onProductClick?: (productId: number) => void;
  className?: string;
}

export function PublicProductGrid({ 
  products, 
  categories, 
  onProductClick,
  className 
}: PublicProductGridProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (!selectedCategoryId) {
      return products;
    }
    return products.filter(product => {
      // Handle both categoryId directly or from category object
      const productCategoryId = product.categoryId || product.category?.id;
      return productCategoryId === selectedCategoryId;
    });
  }, [products, selectedCategoryId]);

  // Calculate product stats for display
  const getProductStats = (product: any) => {
    // Calculate total stock, renting, available from outletStock if available
    // Product can have stock (from Product type) or totalStock (from API response)
    let totalStock = (product as any).totalStock || product.stock || 0;
    let totalRenting = product.renting || 0;
    let totalAvailable = product.available || totalStock;

    if (product.outletStock && Array.isArray(product.outletStock)) {
      totalStock = product.outletStock.reduce((sum: number, os: any) => sum + (os.stock || 0), 0);
      totalRenting = product.outletStock.reduce((sum: number, os: any) => sum + (os.renting || 0), 0);
      totalAvailable = product.outletStock.reduce((sum: number, os: any) => sum + (os.available || 0), 0);
    }

    return { totalStock, totalRenting, totalAvailable };
  };

  return (
    <div className={cn('container mx-auto px-4 py-8', className)}>
      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Categories</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategoryId === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategoryId(null)}
              className={cn(
                selectedCategoryId === null && 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              All Products
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategoryId === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategoryId(category.id)}
                className={cn(
                  selectedCategoryId === category.id && 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <>
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            {selectedCategoryId && ` in ${categories.find(c => c.id === selectedCategoryId)?.name}`}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const stats = getProductStats(product);
              // Get categoryId from product (could be direct or from category object)
              const productCategoryId = product.categoryId || product.category?.id;
              const category = categories.find(c => c.id === productCategoryId);
              
              return (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  description={product.description || undefined}
                  stock={stats.totalStock}
                  renting={stats.totalRenting}
                  available={stats.totalAvailable}
                  rentPrice={product.rentPrice}
                  salePrice={product.salePrice || undefined}
                  deposit={product.deposit || 0}
                  images={product.images || []}
                  category={{
                    name: category?.name || product.category?.name || 'Uncategorized'
                  }}
                  outlet={{
                    name: 'Store' // Default outlet name for public view
                  }}
                  onView={onProductClick}
                  variant="client"
                  className="h-full"
                />
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {selectedCategoryId 
                ? 'No products in this category'
                : 'No products available'}
            </h3>
            <p className="text-gray-500">
              {selectedCategoryId 
                ? `There are no products in "${categories.find(c => c.id === selectedCategoryId)?.name}" category at the moment.`
                : 'This store does not have any products available for viewing at the moment. Please check back later.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

