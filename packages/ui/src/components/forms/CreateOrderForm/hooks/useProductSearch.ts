/**
 * Custom hook for product search functionality
 */

import { useState, useCallback } from 'react';
import { productsApi } from '@rentalshop/utils';
import { PAGINATION } from '@rentalshop/constants';
import type { ProductWithStock, ProductSearchOption } from '../types';

export const useProductSearch = () => {
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Search products for SearchableSelect
  const searchProductsForSelect = useCallback(async (query: string): Promise<ProductSearchOption[]> => {
    if (!query.trim()) {
      return [];
    }
    
    try {
      setIsLoadingProducts(true);
      
      const result = await productsApi.getProducts({ 
        search: query, 
        limit: PAGINATION.SEARCH_LIMIT
      });
      
      if (result.success && result.data?.products) {
        // Transform the products to match enhanced SearchableSelect format
        return result.data.products.map((product: any) => {
          // Get stock information from outletStock array
          const outletStock = product.outletStock?.[0];
          const available = outletStock?.available ?? 0;
          const stock = outletStock?.stock ?? 0;
          const totalStock = stock;
          
          return {
            value: String(product.id), // Use id from server response
            label: product.name,
            image: product.image || product.imageUrl, // Support both image and imageUrl fields
            subtitle: product.barcode ? `Barcode: ${product.barcode}` : 'No Barcode',
            details: [
              `$${(product.rentPrice || 0).toFixed(2)}`,
              `Deposit: $${(product.deposit || 0).toFixed(2)}`,
              `Available: ${available}`,
              `Total Stock: ${totalStock}`,
              product.category?.name || 'No Category'
            ].filter(Boolean), // Remove empty values
            type: 'product' as const
          };
        });
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
    if (!query.trim()) return [];
    
    try {
      setIsLoadingProducts(true);
      
      const result = await productsApi.getProducts({ 
        search: query, 
        limit: PAGINATION.SEARCH_LIMIT
      });
      
      if (result.success && result.data?.products) {
        // Return the products directly since they're already ProductWithStock
        return result.data.products;
      }
      return [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  return {
    isLoadingProducts,
    searchProductsForSelect,
    searchProducts,
  };
};
