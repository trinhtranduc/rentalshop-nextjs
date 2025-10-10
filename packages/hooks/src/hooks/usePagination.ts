"use client"

import { useState, useCallback } from 'react';
import { PAGINATION } from '@rentalshop/constants';

export interface PaginationState {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

export interface PaginationConfig {
  initialLimit?: number;
  initialOffset?: number;
}

export interface UsePaginationReturn {
  pagination: PaginationState;
  setPagination: (pagination: Partial<PaginationState>) => void;
  handlePageChange: (page: number) => void;
  resetPagination: () => void;
  updatePaginationFromResponse: (response: {
    total: number;
    limit: number;
    offset: number;
    hasMore?: boolean;
  }) => void;
}

export function usePagination(config: PaginationConfig = {}): UsePaginationReturn {
  const { initialLimit = PAGINATION.DEFAULT_PAGE_SIZE, initialOffset = 0 } = config;
  
  const [pagination, setPaginationState] = useState<PaginationState>({
    total: 0,
    limit: initialLimit,
    offset: initialOffset,
    hasMore: false,
    currentPage: 1,
    totalPages: 1
  });

  const setPagination = useCallback((newPagination: Partial<PaginationState>) => {
    setPaginationState(prev => ({
      ...prev,
      ...newPagination,
      currentPage: Math.floor((newPagination.offset ?? prev.offset) / (newPagination.limit ?? prev.limit)) + 1,
      totalPages: Math.ceil((newPagination.total ?? prev.total) / (newPagination.limit ?? prev.limit))
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    const newOffset = (page - 1) * pagination.limit;
    setPagination({
      offset: newOffset,
      currentPage: page
    });
  }, [pagination.limit, setPagination]);



  const resetPagination = useCallback(() => {
    setPagination({
      total: 0,
      offset: initialOffset,
      hasMore: false,
      currentPage: 1,
      totalPages: 1
    });
  }, [initialOffset, setPagination]);

  const updatePaginationFromResponse = useCallback((response: {
    total: number;
    limit: number;
    offset: number;
    hasMore?: boolean;
  }) => {
    setPagination({
      total: response.total,
      limit: response.limit,
      offset: response.offset,
      hasMore: response.hasMore ?? (response.offset + response.limit < response.total),
      currentPage: Math.floor(response.offset / response.limit) + 1,
      totalPages: Math.ceil(response.total / response.limit)
    });
  }, [setPagination]);

  return {
    pagination,
    setPagination,
    handlePageChange,
    resetPagination,
    updatePaginationFromResponse
  };
}
