'use client';

import React from 'react';
import { Card, CardContent } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Search } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface SearchAndFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }[];
  className?: string;
}

export default function SearchAndFilters({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  className = ''
}: SearchAndFiltersProps) {
  return (
    <Card className={className}>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-4 h-4" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-action-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters */}
          {filters.length > 0 && (
            <div className="flex gap-2">
              {filters.map((filter, index) => (
                <select
                  key={index}
                  value={filter.value}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => filter.onChange(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-action-primary focus:border-transparent"
                >
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
