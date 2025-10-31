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
  setQuery: (value: string) => void;
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
  
  // ✅ FIX: Use ref to store the latest onSearch callback to avoid recreating handleSearchChange
  const onSearchRef = useRef(onSearch);
  
  // Update ref when onSearch changes
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  // ============================================================================
  // SEARCH FUNCTIONS
  // ============================================================================

  const handleSearchChange = useCallback((value: string) => {
    console.log('🔍 useThrottledSearch: handleSearchChange called with:', value);
    setQuery(value);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only search if query meets minimum length
    if (value.length >= minLength) {
      console.log('🔍 useThrottledSearch: Query meets minLength, setting up timeout');
      setIsSearching(true);
      isSearchingRef.current = true;
      
      // Set new timeout for debounced search
      timeoutRef.current = setTimeout(() => {
        console.log('🔍 useThrottledSearch: Timeout executing, calling onSearch with:', value);
        onSearchRef.current(value); // ✅ Use ref instead of direct callback
        setIsSearching(false);
        isSearchingRef.current = false;
      }, delay);
    } else if (value.length === 0) {
      console.log('🔍 useThrottledSearch: Query is empty, clearing search');
      // Clear search when query is empty
      setIsSearching(false);
      isSearchingRef.current = false;
      if (!isInitialRender.current) {
        onSearchRef.current(''); // ✅ Use ref instead of direct callback
      }
    } else {
      console.log('🔍 useThrottledSearch: Query too short, not searching');
      // Query too short, not searching
      setIsSearching(false);
      isSearchingRef.current = false;
    }
  }, [delay, minLength]); // ✅ Remove onSearch from dependencies

  const clearSearch = useCallback(() => {
    setQuery('');
    setIsSearching(false);
    isSearchingRef.current = false;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (!isInitialRender.current) {
      onSearchRef.current(''); // ✅ Use ref instead of direct callback
    }
  }, []); // ✅ Remove onSearch from dependencies

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
    setQuery,
  };
}
