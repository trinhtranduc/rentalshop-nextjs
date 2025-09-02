import React from 'react';
import { Pagination } from '@rentalshop/ui';

interface OutletPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function OutletPagination({
  currentPage,
  totalPages,
  total,
  onPageChange
}: OutletPaginationProps) {
  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      total={total}
      onPageChange={onPageChange}
    />
  );
}
