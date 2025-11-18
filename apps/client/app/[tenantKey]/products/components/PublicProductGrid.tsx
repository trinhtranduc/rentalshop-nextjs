'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ProductCard, SearchableSelect, Pagination, Input, Button } from '@rentalshop/ui';
import { cn } from '@rentalshop/ui';
import { Search, X } from 'lucide-react';
import type { Product, Category } from '@rentalshop/types';
import { useTranslations } from 'next-intl';

interface PublicProductGridProps {
  products: Product[];
  categories: Category[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  onProductClick?: (productId: number) => void;
  className?: string;
}

export function PublicProductGrid({ 
  products, 
  categories, 
  pagination,
  onProductClick,
  className 
}: PublicProductGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('products');

  // Get current filters from URL
  const currentCategoryId = searchParams.get('categoryId') 
    ? parseInt(searchParams.get('categoryId')!, 10) 
    : null;
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Update URL with new filters
  const updateFilters = useCallback((updates: { categoryId?: number | null; search?: string; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (updates.categoryId === null || updates.categoryId === undefined) {
      params.delete('categoryId');
    } else if (updates.categoryId) {
      params.set('categoryId', updates.categoryId.toString());
    }
    
    if (updates.search === undefined) {
      // Don't change search
    } else if (updates.search === '') {
      params.delete('search');
    } else {
      params.set('search', updates.search);
    }
    
    if (updates.page === undefined) {
      // Don't change page
    } else if (updates.page === 1) {
      params.delete('page');
    } else {
      params.set('page', updates.page.toString());
    }
    
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  // Category options for SearchableSelect
  const categoryOptions = useMemo(() => {
    return categories.map(cat => ({
      value: cat.id.toString(),
      label: cat.name || 'Uncategorized'
    }));
  }, [categories]);

  // Calculate product stats for display
  const getProductStats = (product: any) => {
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

  const handleCategoryChange = (categoryId: number | undefined) => {
    updateFilters({ categoryId: categoryId || null, page: 1 });
  };

  const handleSearchChange = (search: string) => {
    updateFilters({ search, page: 1 });
  };

  const handleClearSearch = () => {
    updateFilters({ search: '' });
  };

  const handlePageChange = (page: number) => {
    updateFilters({ page });
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;

  return (
    <div className={cn('container mx-auto px-4 py-8', className)}>
      {/* Filters Section */}
      <div className="mb-6 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder={t('search.placeholder')}
            value={currentSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10 h-12"
          />
          {currentSearch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              {t('fields.category')}:
            </label>
            <div className="flex-1 max-w-xs">
              <SearchableSelect
                value={currentCategoryId || undefined}
                onChange={handleCategoryChange}
                options={categoryOptions}
                placeholder={t('allCategories')}
                emptyText={t('noCategories')}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Products Count */}
      {pagination && pagination.total > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          {t('showingProducts', { 
            count: products.length, 
            total: pagination.total 
          })}
        </div>
      )}

      {/* Products Grid */}
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {products.map((product) => {
              const stats = getProductStats(product);
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
                    name: 'Store'
                  }}
                  onView={onProductClick}
                  variant="client"
                  className="h-full"
                />
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={handlePageChange}
                itemName={t('products') || 'products'}
              />
            </div>
          )}
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
              {currentSearch || currentCategoryId
                ? t('noProductsFound')
                : t('noProducts')}
            </h3>
            <p className="text-gray-500">
              {currentSearch || currentCategoryId
                ? t('tryDifferentSearch')
                : t('checkBackLater')}
            </p>
            {(currentSearch || currentCategoryId) && (
              <Button
                variant="outline"
                onClick={() => {
                  updateFilters({ categoryId: null, search: '', page: 1 });
                }}
                className="mt-4"
              >
                {t('clearFilters')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
