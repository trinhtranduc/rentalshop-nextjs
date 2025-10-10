import React from 'react';
import { 
  MerchantListHeader,
  MerchantFilters,
  MerchantTable,
  MerchantPagination
} from './components';
import type { Merchant } from '@rentalshop/types';

interface MerchantFiltersData {
  search: string;
  status: string;
  plan: string;
}

interface MerchantsData {
  merchants: Merchant[];
  total: number;
  currentPage: number;
  totalPages: number;
  stats: {
    totalMerchants: number;
    activeMerchants: number;
    trialAccounts: number;
    totalRevenue: number;
  };
}

interface MerchantsProps {
  data: MerchantsData;
  filters: MerchantFiltersData;
  onFiltersChange: (filters: MerchantFiltersData) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  onMerchantAction: (action: string, merchantId: number) => void;
  onPageChange: (page: number) => void;
  onSort?: (column: string) => void;
}

export function Merchants({ 
  data, 
  filters, 
  onFiltersChange, 
  onSearchChange,
  onClearFilters,
  onMerchantAction, 
  onPageChange,
  onSort
}: MerchantsProps) {

  const handleMerchantAction = (action: string, merchantId: number) => {
    onMerchantAction(action, merchantId);
  };


  return (
    <div className="space-y-6">
      <MerchantListHeader stats={data.stats} />
      
      <MerchantFilters 
        filters={filters}
        onFiltersChange={onFiltersChange}
        onSearchChange={onSearchChange}
        onClearFilters={onClearFilters}
      />      
      
      <MerchantTable 
        merchants={data.merchants}
        onMerchantAction={handleMerchantAction}
        sortBy={filters.search ? 'name' : 'createdAt'}
        sortOrder="desc"
        onSort={onSort}
      />
      
      <MerchantPagination 
        currentPage={data.currentPage}
        totalPages={data.totalPages}
        total={data.total}
        onPageChange={onPageChange}
        startIndex={(data.currentPage - 1) * 10}
        endIndex={data.currentPage * 10}
      />

    </div>
  );
}

export default Merchants;
