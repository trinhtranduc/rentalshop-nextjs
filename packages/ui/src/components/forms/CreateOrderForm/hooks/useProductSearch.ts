/**
 * Custom hook for product search functionality
 */

import { useState, useCallback } from 'react';
import { productsApi, formatCurrency } from '@rentalshop/utils';
import { PAGINATION } from '@rentalshop/constants';
import type { ProductWithStock, ProductSearchOption } from '../types';
import type { CurrencyCode } from '@rentalshop/types';

export const useProductSearch = (currency: CurrencyCode = 'USD') => {
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Shared function to fetch products from API (DRY principle)
  const fetchProducts = useCallback(async (query: string): Promise<ProductWithStock[]> => {
    if (!query.trim()) return [];
    
    try {
      setIsLoadingProducts(true);
      
      // Use searchProducts API which supports search by name and barcode
      const result = await productsApi.searchProducts({ 
        search: query, 
        limit: PAGINATION.SEARCH_LIMIT
      });
      
      if (result.success && result.data) {
        // Response format can be either:
        // 1. { data: Product[] } - direct array
        // 2. { data: { products: Product[], total, page, ... } } - paginated response
        const products = Array.isArray(result.data) 
          ? result.data 
          : (result.data as any).products || [];
        // Cast to ProductWithStock since API returns products with stock info
        return products as ProductWithStock[];
      }
      return [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Search products for general use
  const searchProducts = useCallback(async (query: string): Promise<ProductWithStock[]> => {
    return fetchProducts(query);
  }, [fetchProducts]);

  // Search products for SearchableSelect - transforms products to SearchableSelect format
  const searchProductsForSelect = useCallback(async (query: string): Promise<ProductSearchOption[]> => {
    const products = await fetchProducts(query);
    
        // Transform the products to match enhanced SearchableSelect format
    return products.map((product: any) => {
          // Get stock information from outletStock array
          const outletStock = product.outletStock?.[0];
          const available = outletStock?.available ?? 0;
          const stock = outletStock?.stock ?? 0;
          const totalStock = stock;
          
          return {
            value: String(product.id), // Use id from server response
            label: product.name,
        image: product.image || product.imageUrl || product.images?.[0], // Support multiple image fields
            subtitle: product.barcode ? `Barcode: ${product.barcode}` : 'No Barcode',
            details: [
              formatCurrency(product.rentPrice || 0, currency),
              `Deposit: ${formatCurrency(product.deposit || 0, currency)}`,
              `Available: ${available}`,
              `Total Stock: ${totalStock}`,
              product.category?.name || 'No Category'
            ].filter(Boolean), // Remove empty values
            type: 'product' as const
          };
        });
  }, [fetchProducts, currency]);

  return {
    isLoadingProducts,
    searchProductsForSelect,
    searchProducts,
  };
};
