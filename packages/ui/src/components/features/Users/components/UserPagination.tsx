import React from 'react';
import { Pagination } from '../../../ui/pagination';

interface UserPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function UserPagination({ currentPage, totalPages, total, onPageChange }: UserPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-700">
        Showing page {currentPage} of {totalPages} ({total} total users)
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
        limit={20}
        onPageChange={onPageChange}
      />
    </div>
  );
}
