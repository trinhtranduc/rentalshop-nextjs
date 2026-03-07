'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Input } from './input';
import { useCommonTranslations } from '@rentalshop/hooks';
import { cn } from '@rentalshop/ui';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void; // Optional: allow changing items per page
  itemName?: string; // e.g., "orders", "products", "customers"
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  total, 
  limit,
  onPageChange,
  onLimitChange,
  itemName = "items"
}: PaginationProps) {
  const t = useCommonTranslations();
  // Optimistic state for immediate visual feedback
  const [optimisticPage, setOptimisticPage] = useState<number | null>(null);
  // Input state for items per page
  const [limitInput, setLimitInput] = useState<string>(limit.toString());
  
  // Update limit input when limit changes externally
  useEffect(() => {
    setLimitInput(limit.toString());
  }, [limit]);
  
  // Clear optimistic state when actual page changes
  useEffect(() => {
    if (currentPage === optimisticPage) {
      setOptimisticPage(null);
    }
  }, [currentPage, optimisticPage]);
  
  // Handle page click with immediate feedback
  const handlePageClick = (pageNum: number) => {
    setOptimisticPage(pageNum); // 1. Immediate visual feedback
    onPageChange(pageNum); // 2. Trigger navigation
  };

  // Handle limit input change
  const handleLimitInputChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setLimitInput(numericValue);
  };

  // Handle limit input submit
  const handleLimitInputSubmit = () => {
    if (!limitInput) return;
    
    const limitNum = parseInt(limitInput, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 5000) {
      // Invalid limit, reset to current limit
      setLimitInput(limit.toString());
      return;
    }
    
    if (onLimitChange) {
      onLimitChange(limitNum);
    }
  };

  // Handle Enter key in limit input
  const handleLimitInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLimitInputSubmit();
    }
  };
  
  // Display page (use optimistic if available, otherwise actual)
  const displayPage = optimisticPage || currentPage;
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const startItem = (displayPage - 1) * limit + 1;
  const endItem = Math.min(displayPage * limit, total);

  // Always show pagination if onLimitChange is provided (to allow changing items per page)
  // or if there's more than 1 page
  if (totalPages <= 1 && !onLimitChange) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 w-full overflow-x-auto">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
          {t('pagination.showing')} {startItem} {t('pagination.to')} {endItem} {t('pagination.of')} {total} {itemName}
        </div>
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('pagination.itemsPerPage') || 'Items per page'}:</span>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                inputMode="numeric"
                value={limitInput}
                onChange={(e) => handleLimitInputChange(e.target.value)}
                onKeyDown={handleLimitInputKeyDown}
                onBlur={handleLimitInputSubmit}
                className="w-16 h-8 text-center text-sm px-2"
                min={1}
                max={5000}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleLimitInputSubmit}
                disabled={!limitInput || parseInt(limitInput, 10) < 1 || parseInt(limitInput, 10) > 5000}
                className="h-8 px-2"
              >
                Apply
              </Button>
            </div>
            {/* Quick select buttons for common values */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLimitChange(10)}
                className={cn("h-7 px-2 text-xs", limit === 10 && "bg-gray-100 dark:bg-gray-800")}
              >
                10
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLimitChange(25)}
                className={cn("h-7 px-2 text-xs", limit === 25 && "bg-gray-100 dark:bg-gray-800")}
              >
                25
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLimitChange(50)}
                className={cn("h-7 px-2 text-xs", limit === 50 && "bg-gray-100 dark:bg-gray-800")}
              >
                50
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLimitChange(100)}
                className={cn("h-7 px-2 text-xs", limit === 100 && "bg-gray-100 dark:bg-gray-800")}
              >
                100
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
        >
          {t('buttons.previous')}
        </Button>
        
        <div className="flex items-center space-x-1">
          {getPageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-2 text-gray-500">...</span>
              ) : (
                <div className="relative">
                  <Button
                    variant={displayPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageClick(page as number)}
                    className={cn(
                      "w-10 h-10 p-0 relative",
                      optimisticPage === page && "ring-2 ring-blue-500 ring-offset-1"
                    )}
                  >
                    {page}
                  </Button>
                  {/* Subtle loading indicator when navigating */}
                  {optimisticPage === page && optimisticPage !== currentPage && (
                    <div className="absolute -top-1 -right-1">
                      <div className="animate-spin rounded-full h-2 w-2 border border-blue-600 border-t-transparent"></div>
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          {t('buttons.next')}
        </Button>
      </div>
    </div>
  );
}
