import React from 'react';
import { Card, CardContent, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui';
import { Search, X } from 'lucide-react';

interface MerchantFiltersData {
  search: string;
  status: string;
  plan: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface MerchantFiltersProps {
  filters: MerchantFiltersData;
  onFiltersChange: (filters: MerchantFiltersData) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

export function MerchantFilters({ 
  filters, 
  onFiltersChange, 
  onSearchChange,
  onClearFilters 
}: MerchantFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value });
  };

  const handlePlanChange = (value: string) => {
    onFiltersChange({ ...filters, plan: value });
  };

  const handleClearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    }
  };

  return (
    <Card className="mb-6 shadow-sm border-gray-200 dark:border-gray-700">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Search */}
          <div className="flex-1 w-full lg:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search merchants by name or email..."
                value={filters.search}
                onChange={handleSearchChange}
                className="pl-10 w-full lg:w-80"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
              <Select value={filters.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Plan Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Plan:</label>
              <Select value={filters.plan} onValueChange={handlePlanChange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {onClearFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 px-3"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MerchantFilters;
