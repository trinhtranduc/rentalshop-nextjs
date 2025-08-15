import { useState, useCallback, useRef } from 'react';

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

  // Handle search input change with debouncing
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

    // Set timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(true);
      onSearch?.(value);
    }, delay);
  }, [delay, minLength, onSearch]);

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