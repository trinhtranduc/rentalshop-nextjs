import React from 'react';
import { Button } from '@rentalshop/ui';
import { Grid3X3, List, Plus } from 'lucide-react';

interface UserHeaderProps {
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
  onAddUser: () => void;
}

export function UserHeader({ viewMode, onViewModeChange, onAddUser }: UserHeaderProps) {
  return (
    <div className="flex justify-between items-center gap-4">
      <div className="flex items-center gap-2">
        <Button
          onClick={onAddUser}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
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
