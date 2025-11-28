'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { useCommonTranslations } from '@rentalshop/hooks';
import { cn } from '@rentalshop/ui';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  itemName?: string; // e.g., "orders", "products", "customers"
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  total, 
  limit,
  onPageChange,
  itemName = "items"
}: PaginationProps) {
  const t = useCommonTranslations();
  // Optimistic state for immediate visual feedback
  const [optimisticPage, setOptimisticPage] = useState<number | null>(null);
  
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

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
      <div className="text-sm text-gray-700 dark:text-gray-300">
        {t('pagination.showing')} {startItem} {t('pagination.to')} {endItem} {t('pagination.of')} {total} {itemName}
      </div>
      
      <div className="flex items-center space-x-2">
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
