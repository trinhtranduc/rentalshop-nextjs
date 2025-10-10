import React from 'react';
import { Pagination } from '@rentalshop/ui';

interface OutletPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function OutletPagination({
  currentPage,
  totalPages,
  total,
  limit,
  onPageChange
}: OutletPaginationProps) {
  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      total={total}
      limit={limit}
      onPageChange={onPageChange}
    />
  );
}
