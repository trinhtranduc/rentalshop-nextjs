import React from 'react';
import { Button } from '@rentalshop/ui';
import { Grid3X3, List, Users } from 'lucide-react';

interface UserHeaderProps {
  totalUsers: number;
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
}

export function UserHeader({ totalUsers, viewMode, onViewModeChange }: UserHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Users className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Users</h2>
          <p className="text-sm text-gray-600">
            {totalUsers} {totalUsers === 1 ? 'user' : 'users'} total
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'table' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('table')}
          className="flex items-center gap-2"
        >
          <List className="w-4 h-4" />
          Table
        </Button>
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
          className="flex items-center gap-2"
        >
          <Grid3X3 className="w-4 h-4" />
          Grid
        </Button>
      </div>
    </div>
  );
}
