import React from 'react';
import { Card, CardContent, Button } from '../../../ui';

interface MerchantPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  startIndex: number;
  endIndex: number;
}

export function MerchantPagination({ 
  currentPage, 
  totalPages, 
  total, 
  onPageChange,
  startIndex,
  endIndex
}: MerchantPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <Card className="mt-6 shadow-sm border-gray-200 dark:border-gray-700">
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {startIndex + 1} to {Math.min(endIndex, total)} of {total} merchants
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className="w-10 h-9"
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MerchantPagination;
