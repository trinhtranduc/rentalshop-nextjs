import React from 'react';
import { Input } from '../../../ui/input';
import { Card, CardContent } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Search, X } from 'lucide-react';

interface CategorySearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function CategorySearch({ value, onChange, onClear }: CategorySearchProps) {
  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-700">
      <CardContent className="pt-6 space-y-4">
        <div className="flex justify-between items-end gap-4">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Search Categories
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search by category name..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-10 pr-10"
              />
              {value && (
                <Button
                  onClick={onClear}
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full w-10"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

