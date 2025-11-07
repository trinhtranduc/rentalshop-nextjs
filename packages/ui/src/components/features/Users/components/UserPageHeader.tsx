import React from 'react';
import { Button } from '@rentalshop/ui/base';
import { Plus, Download } from 'lucide-react';

interface UserPageHeaderProps {
  title?: string;
  subtitle?: string;
  showExportButton?: boolean;
  showAddButton?: boolean;
  onExport?: () => void;
  onAdd?: () => void;
  addButtonText?: string;
  exportButtonText?: string;
  className?: string;
}

export function UserPageHeader({
  title = "Users",
  subtitle = "Manage users in the system",
  showExportButton = false,
  showAddButton = true,
  onExport,
  onAdd,
  addButtonText = "Add User",
  exportButtonText = "Export",
  className = ""
}: UserPageHeaderProps) {
  return (
    <div className={`flex justify-between items-start ${className}`}>

      <div className="flex gap-3">
        {showExportButton && (
          <Button
            onClick={onExport}
            className="h-9 px-4 text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            {exportButtonText}
          </Button>
        )}
        
        {showAddButton && (
          <Button 
            onClick={onAdd}
            className="bg-green-600 hover:bg-green-700 text-white h-9 px-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            {addButtonText}
          </Button>
        )}
      </div>
    </div>
  );
}