import React from 'react';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rentalshop/ui';
import type { UserFilters } from '../types';

interface UserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
}

export function UserFilters({ filters, onFiltersChange }: UserFiltersProps) {
  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <Input
            placeholder="Search users..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full"
          />
        </div>

        {/* Role Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <Select value={filters.role} onValueChange={(value) => handleFilterChange('role', value)}>
            <SelectTrigger>
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

        {/* Outlet Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Outlet
          </label>
          <Select value={filters.outlet} onValueChange={(value) => handleFilterChange('outlet', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All outlets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outlets</SelectItem>
              <SelectItem value="main">Main Store</SelectItem>
              <SelectItem value="branch1">Branch 1</SelectItem>
              <SelectItem value="branch2">Branch 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
