import React from 'react';
import { Pagination } from '../../../ui/pagination';

interface OrderPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function OrderPagination({ 
  currentPage, 
  totalPages, 
  total, 
  onPageChange 
}: OrderPaginationProps) {
  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      total={total}
      limit={20}
      onPageChange={onPageChange}
      itemName="orders"
    />
  );
}
