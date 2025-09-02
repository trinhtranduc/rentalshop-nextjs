import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button
} from '@rentalshop/ui';
import { 
  Search, 
  Filter, 
  X 
} from 'lucide-react';
import type { OutletFilters as OutletFiltersType } from '@rentalshop/types';

interface OutletFiltersProps {
  filters: OutletFiltersType;
  onFiltersChange: (filters: OutletFiltersType) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
}

export function OutletFilters({
  filters,
  onFiltersChange,
  onSearchChange,
  onClearFilters
}: OutletFiltersProps) {
  const handleStatusFilter = (value: string) => {
    const status = value === 'all' ? undefined : value;
    onFiltersChange({ ...filters, status });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: undefined,
      status: undefined,
      limit: filters.limit
    });
    if (onClearFilters) {
      onClearFilters();
    }
  };

  const hasActiveFilters = filters.search || filters.status;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search outlets..."
                value={filters.search || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={filters.status || 'all'}
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                onClick={handleClearFilters}
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
