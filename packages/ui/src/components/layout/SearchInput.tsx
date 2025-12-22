'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';

export interface SearchInputProps {
  placeholder?: string;
  delay?: number;
  minLength?: number;
  onSearch: (query: string) => void;
  className?: string;
  disabled?: boolean;
  defaultValue?: string;
}

/**
 * SearchInput Component
 * - Chỉ search khi nhấn Enter, không search khi đang gõ
 * - Lưu giá trị input vào local state
 * - Cho phép xóa search bằng nút X
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search...',
  delay = 500,
  minLength = 2,
  onSearch,
  className,
  disabled = false,
  defaultValue = ''
}) => {
  const [query, setQuery] = useState<string>(defaultValue || '');

  // Set default value
  useEffect(() => {
    if (defaultValue) {
      setQuery(defaultValue);
    }
  }, [defaultValue]);

  // Handle input change - chỉ cập nhật local state
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  // Handle Enter key - chỉ search khi nhấn Enter
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Chỉ search nếu query đủ độ dài hoặc rỗng (để clear search)
      if (query.length >= minLength || query.length === 0) {
        onSearch(query);
      }
    }
  }, [query, minLength, onSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    onSearch('');
  }, [onSearch]);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
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
          <Button
            variant="ghost"
            size="icon"
            onClick={clearSearch}
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}; 