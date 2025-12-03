/**
 * Custom hook for customer search functionality
 */

import { useState, useCallback } from 'react';
import { customersApi } from '@rentalshop/utils';
import { PAGINATION } from '@rentalshop/constants';
import type { CustomerSearchResult, CustomerSearchOption } from '../types';

export const useCustomerSearch = () => {
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerSearchResult[]>([]);

  // Customer search function for SearchableSelect
  const searchCustomers = useCallback(async (query: string): Promise<CustomerSearchOption[]> => {
    // Clear results immediately when query is empty
    if (!query.trim()) {
      setCustomerSearchResults([]);
      return [];
    }
    
    try {
      setIsLoadingCustomers(true);
      
      // Clear previous results before new search to ensure UI updates
      setCustomerSearchResults([]);
      
      // Use getCustomersWithFilters to search by name or phone
      const result = await customersApi.getCustomersWithFilters(
        { 
          search: query.trim(), 
        isActive: true 
        },
        1, // page
        PAGINATION.SEARCH_LIMIT // limit
      );
      
      if (result.success && result.data?.customers && result.data.customers.length > 0) {
        // Store the full customer data for later use
        setCustomerSearchResults(result.data.customers);
        
        // Return in SearchableSelect format
        const searchOptions = result.data.customers.map((customer: CustomerSearchResult) => ({
          value: customer.id,
          label: `${customer.firstName} ${customer.lastName} - ${customer.phone}`,
          type: 'customer' as const
        }));
        
        return searchOptions;
      } else {
        // No results found - ensure empty array is set
        setCustomerSearchResults([]);
        return [];
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      setCustomerSearchResults([]);
      return [];
    } finally {
      setIsLoadingCustomers(false);
    }
  }, []);

  // Clear customer search results
  const clearCustomerSearchResults = useCallback(() => {
    setCustomerSearchResults([]);
  }, []);

  // Set customer search results
  const setCustomerResults = useCallback((customers: CustomerSearchResult[]) => {
    setCustomerSearchResults(customers);
  }, []);

  return {
    isLoadingCustomers,
    customerSearchResults,
    searchCustomers,
    clearCustomerSearchResults,
    setCustomerResults,
  };
};
