'use client';

import React, { useState, useEffect } from 'react';
import { Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Button } from '@rentalshop/ui';
import { Search, X } from 'lucide-react';
import type { RequestLogsFilters } from '@rentalshop/utils';

interface RequestLogsFiltersProps {
  filters: RequestLogsFilters;
  onFiltersChange: (filters: Partial<RequestLogsFilters>) => void;
}

/**
 * Request Logs Filters Component
 */
export function RequestLogsFilters({
  filters,
  onFiltersChange,
}: RequestLogsFiltersProps) {
  const [localFilters, setLocalFilters] = useState({
    method: filters.method || '',
    path: filters.path || '',
    statusCode: filters.statusCode?.toString() || '',
    userId: filters.userId?.toString() || '',
    search: filters.search || '',
    startDate: filters.startDate || '',
    endDate: filters.endDate || '',
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localFilters.search !== filters.search) {
        onFiltersChange({ search: localFilters.search || undefined });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localFilters.search]);

  const handleFilterChange = (key: string, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
    
    if (key === 'method') {
      onFiltersChange({ method: value || undefined });
    } else if (key === 'path') {
      onFiltersChange({ path: value || undefined });
    } else if (key === 'statusCode') {
      onFiltersChange({ statusCode: value ? parseInt(value) : undefined });
    } else if (key === 'userId') {
      onFiltersChange({ userId: value ? parseInt(value) : undefined });
    } else if (key === 'startDate') {
      onFiltersChange({ startDate: value || undefined });
    } else if (key === 'endDate') {
      onFiltersChange({ endDate: value || undefined });
    }
  };

  const clearFilters = () => {
    setLocalFilters({
      method: '',
      path: '',
      statusCode: '',
      userId: '',
      search: '',
      startDate: '',
      endDate: '',
    });
    onFiltersChange({
      method: undefined,
      path: undefined,
      statusCode: undefined,
      userId: undefined,
      search: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const hasActiveFilters = 
    localFilters.method ||
    localFilters.path ||
    localFilters.statusCode ||
    localFilters.userId ||
    localFilters.search ||
    localFilters.startDate ||
    localFilters.endDate;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Method</label>
          <Select
            value={localFilters.method || 'all'}
            onValueChange={(value) => handleFilterChange('method', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Path</label>
          <Input
            placeholder="/api/orders"
            value={localFilters.path}
            onChange={(e) => handleFilterChange('path', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Status Code</label>
          <Select
            value={localFilters.statusCode || 'all'}
            onValueChange={(value) => handleFilterChange('statusCode', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All status codes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="200">200 OK</SelectItem>
              <SelectItem value="201">201 Created</SelectItem>
              <SelectItem value="400">400 Bad Request</SelectItem>
              <SelectItem value="401">401 Unauthorized</SelectItem>
              <SelectItem value="403">403 Forbidden</SelectItem>
              <SelectItem value="404">404 Not Found</SelectItem>
              <SelectItem value="500">500 Server Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">User ID</label>
          <Input
            type="number"
            placeholder="User ID"
            value={localFilters.userId}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <Input
            type="datetime-local"
            value={localFilters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <Input
            type="datetime-local"
            value={localFilters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in path, request body, response body..."
              value={localFilters.search}
              onChange={(e) => setLocalFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
