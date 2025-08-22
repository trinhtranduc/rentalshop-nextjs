'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ThrottledSearchOptions {
  delay: number;
  minLength: number;
  onSearch: (query: string) => void;
}

export interface ThrottledSearchReturn {
  query: string;
  isSearching: boolean;
  handleSearchChange: (value: string) => void;
  clearSearch: () => void;
  cleanup: () => void;
}

// ============================================================================
// USE THROTTLED SEARCH HOOK
// ============================================================================

export function useThrottledSearch(options: ThrottledSearchOptions): ThrottledSearchReturn {
  const { delay, minLength, onSearch } = options;
  
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSearchingRef = useRef(false);
  const isInitialRender = useRef(true); // Track initial render

  // ============================================================================
  // SEARCH FUNCTIONS
  // ============================================================================

  const handleSearchChange = useCallback((value: string) => {
    setQuery(value);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only search if query meets minimum length
    if (value.length >= minLength) {
      setIsSearching(true);
      isSearchingRef.current = true;
      
      // Set new timeout for debounced search
      timeoutRef.current = setTimeout(() => {
        onSearch(value);
        setIsSearching(false);
        isSearchingRef.current = false;
      }, delay);
    } else if (value.length === 0) {
      // Clear search when query is empty
      setIsSearching(false);
      isSearchingRef.current = false;
      if (!isInitialRender.current) {
        onSearch('');
      }
    } else {
      // Query too short, not searching
      setIsSearching(false);
      isSearchingRef.current = false;
    }
  }, [delay, minLength, onSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setIsSearching(false);
    isSearchingRef.current = false;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (!isInitialRender.current) {
        onSearch('');
      }
  }, [onSearch]);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    // Mark that initial render is complete
    isInitialRender.current = false;
    
    
    // Cleanup on unmount
    return cleanup;
  }, [cleanup]);

  // ============================================================================
  // RETURN VALUES
  // ============================================================================

  return {
    query,
    isSearching,
    handleSearchChange,
    clearSearch,
    cleanup,
  };
}
