import React, { useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useThrottledSearch } from '../../hooks/useThrottledSearch';

export interface SearchInputProps {
  placeholder?: string;
  delay?: number;
  minLength?: number;
  onSearch: (query: string) => void;
  className?: string;
  disabled?: boolean;
  defaultValue?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search...',
  delay = 500,
  minLength = 2,
  onSearch,
  className,
  disabled = false,
  defaultValue = ''
}) => {
  const {
    query,
    isSearching,
    handleSearchChange,
    clearSearch,
    cleanup
  } = useThrottledSearch({
    delay,
    minLength,
    onSearch
  });

  // Set default value
  useEffect(() => {
    if (defaultValue && !query) {
      handleSearchChange(defaultValue);
    }
  }, [defaultValue, query, handleSearchChange]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg',
            'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'transition-colors duration-200'
          )}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {isSearching && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}; 