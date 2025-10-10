import React from 'react';
import { Button } from '@rentalshop/ui';
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-1">{subtitle}</p>
      </div>
      
      <div className="flex gap-3">
        {showExportButton && (
          <button 
            onClick={onExport}
            className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-md flex items-center text-sm transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            {exportButtonText}
          </button>
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