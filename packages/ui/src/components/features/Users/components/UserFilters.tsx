import React from 'react';
import { useUsersTranslations, useDedupedApi } from '@rentalshop/hooks';
import { merchantsApi, outletsApi } from '@rentalshop/utils';
import { 
  SearchableSelect,
  Input,
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  Button
} from '@rentalshop/ui';
import type { UserFilters } from '@rentalshop/types';

interface UserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  /** #884: admin Users page — merchant select, then an outlet select for that merchant. Off by default. */
  showMerchantOutletFilters?: boolean;
}

/**
 * ✅ COMPACT USER FILTERS (Following Orders pattern)
 */
export function UserFilters({ filters, onFiltersChange, onSearchChange, onClearFilters, showMerchantOutletFilters = false }: UserFiltersProps) {
  const t = useUsersTranslations();
  const merchantId = filters.merchantId || undefined;

  // #884: same pattern as the admin Orders filter (OrderFilters): merchants once, outlets per chosen merchant.
  // The merchants list route defaults to 10 rows, so ask for a large page.
  const { data: merchantsData, loading: loadingMerchants } = useDedupedApi({
    filters: { userFilterMerchants: true },
    fetchFn: async () => {
      const result = await merchantsApi.getMerchantsPaginated(1, 1000);
      if (result.success && result.data?.merchants) return { merchants: result.data.merchants };
      throw new Error('Failed to load merchants');
    },
    enabled: showMerchantOutletFilters,
    staleTime: 60000,
    cacheTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: outletsData, loading: loadingOutlets } = useDedupedApi({
    filters: { userFilterOutlets: merchantId ?? 0 },
    fetchFn: async () => {
      if (!merchantId) return { outlets: [] };
      const result = await outletsApi.getOutletsByMerchant(merchantId);
      if (result.success && result.data?.outlets) return { outlets: result.data.outlets };
      throw new Error('Failed to load outlets');
    },
    enabled: showMerchantOutletFilters && !!merchantId,
    staleTime: 60000,
    cacheTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const merchantOptions = React.useMemo(
    () => ((merchantsData?.merchants || []) as Array<{ id: number; name?: string }>)
      .filter((m) => m && m.id)
      .map((m) => ({ value: String(m.id), label: m.name || `#${m.id}` })),
    [merchantsData]
  );
  const outletOptions = React.useMemo(
    () => (merchantId ? ((outletsData?.outlets || []) as Array<{ id: number; name?: string }>) : [])
      .filter((o) => o && o.id)
      .map((o) => ({ value: String(o.id), label: o.name || `#${o.id}` })),
    [merchantId, outletsData]
  );
  const [localSearch, setLocalSearch] = React.useState<string>(filters.search || '');
  
  // Sync với filters.search khi thay đổi từ bên ngoài (ví dụ: clear filters)
  React.useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  // Handle input change - chỉ cập nhật local state
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
  };

  // Handle Enter key - chỉ search khi nhấn Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchChange(localSearch);
    }
  };

  return (
    <>
      {/* Search Field */}
      <div className="flex-1 min-w-[280px] max-md:min-w-0 max-md:basis-full">
        <div className="relative">
          <Input
            placeholder={t('placeholders.searchUsers')}
            value={localSearch}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="pl-9 h-10"
          />
          <svg 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        </div>
      </div>

      {/* Role Filter */}
      <Select value={filters.role || 'all'} onValueChange={(value) => handleFilterChange('role', value === 'all' ? '' : value)}>
        <SelectTrigger aria-label={t('fields.role')} className="w-[160px] h-10">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.allRoles')}</SelectItem>
          <SelectItem value="ADMIN">Admin</SelectItem>
          <SelectItem value="MERCHANT">Merchant</SelectItem>
          <SelectItem value="OUTLET_ADMIN">Outlet Admin</SelectItem>
          <SelectItem value="OUTLET_STAFF">Outlet Staff</SelectItem>
              <SelectItem value="OUTLET_INVENTORY">Inventory Staff</SelectItem>
        </SelectContent>
      </Select>

      {showMerchantOutletFilters && (
        <>
          {/* Merchant Filter */}
          <SearchableSelect
            value={merchantId}
            onChange={(value) => onFiltersChange({ merchantId: value || undefined })}
            options={merchantOptions}
            placeholder={loadingMerchants ? 'Loading...' : 'All Merchants'}
            searchPlaceholder="Search merchants..."
            emptyText="No merchants found"
            className="w-full sm:w-[180px]"
          />

          {/* Outlet Filter — waits for a merchant */}
          <SearchableSelect
            key={`outlet-${merchantId ?? 0}`}
            value={merchantId ? filters.outletId || undefined : undefined}
            onChange={(value) => onFiltersChange({ outletId: value || undefined })}
            options={outletOptions}
            placeholder={!merchantId ? 'Select merchant first' : loadingOutlets ? 'Loading...' : 'All Outlets'}
            searchPlaceholder="Search outlets..."
            emptyText="No outlets found"
            className="w-full sm:w-[180px]"
            disabled={!filters.merchantId || loadingOutlets}
          />
        </>
      )}

      {/* Clear Filters */}
      {(filters.search || filters.role || filters.merchantId || filters.outletId) && onClearFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="h-10"
        >
          Clear
        </Button>
      )}
    </>
  );
}
