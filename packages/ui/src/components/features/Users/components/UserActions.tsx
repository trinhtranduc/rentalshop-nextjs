import React from 'react';
import { Button } from '@rentalshop/ui';
import { Plus, Download, Filter } from 'lucide-react';

interface UserActionsProps {
  onAction: (action: string, userId?: string) => void;
}

export function UserActions({ onAction }: UserActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-2">
        <Button
          onClick={() => onAction('add')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
        
        <Button
          variant="outline"
          onClick={() => onAction('export')}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => onAction('bulk-actions')}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <Filter className="w-4 h-4 mr-2" />
          Bulk Actions
        </Button>
      </div>
    </div>
  );
}
