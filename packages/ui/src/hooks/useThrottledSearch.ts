import { useState, useCallback, useRef } from 'react';
import { throttle } from '@rentalshop/utils';

export interface UseThrottledSearchOptions {
  delay?: number;
  minLength?: number;
  onSearch?: (query: string) => void;
}

export const useThrottledSearch = (options: UseThrottledSearchOptions = {}) => {
  const {
    delay = 500,
    minLength = 2,
    onSearch
  } = options;

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create throttled search function
  const throttledSearch = useCallback(
    throttle((searchQuery: string) => {
      if (searchQuery.length >= minLength) {
        setIsSearching(true);
        onSearch?.(searchQuery);
      }
    }, delay),
    [delay, minLength, onSearch]
  );

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setQuery(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If query is empty, clear search immediately
    if (!value.trim()) {
      onSearch?.('');
      return;
    }

    // If query is too short, don't search
    if (value.length < minLength) {
      return;
    }

    // Set timeout for throttled search
    searchTimeoutRef.current = setTimeout(() => {
      throttledSearch(value);
    }, delay);
  }, [throttledSearch, delay, minLength, onSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    onSearch?.('');
  }, [onSearch]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  return {
    query,
    isSearching,
    handleSearchChange,
    clearSearch,
    cleanup
  };
}; 