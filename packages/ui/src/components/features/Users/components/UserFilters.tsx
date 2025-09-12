import React, { useCallback } from 'react';
import { 
  Input,
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '@rentalshop/ui';
import type { UserFilters } from '@rentalshop/types';

interface UserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

export function UserFilters({ filters, onFiltersChange, onSearchChange, onClearFilters }: UserFiltersProps) {
  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    // For non-search filters, update immediately
    if (key !== 'search') {
      onFiltersChange({
        ...filters,
        [key]: value,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Let the parent component handle throttling
    onSearchChange(e.target.value);
  };

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
          User Search & Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search - Full Width */}
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Search Users
            </label>
            <Input
              placeholder="Search by name, email..."
              value={filters.search || ''} // Use the search term from filters
              onChange={handleInputChange} // Use our direct handler
              className="w-full"
            />
          </div>

          {/* Role Filter - Right Aligned */}
          <div className="space-y-2 md:w-32">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Role
            </label>
            <Select value={filters.role} onValueChange={(value) => handleFilterChange('role', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="CLIENT">Client</SelectItem>
                <SelectItem value="MERCHANT">Merchant</SelectItem>
                <SelectItem value="OUTLET_STAFF">Outlet Staff</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        
      </CardContent>
    </Card>
  );
}
