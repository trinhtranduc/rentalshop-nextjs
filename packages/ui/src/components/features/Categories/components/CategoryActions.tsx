'use client'

import React from 'react';
import { 
  Card, 
  CardContent,
  Button
} from '../../../ui';
import { Plus, Download, Upload, Edit3 } from 'lucide-react';

interface CategoryActionsProps {
  onAddCategory: () => void;
  onImportCategories: () => void;
  onExportCategories: () => void;
  onBulkEdit: () => void;
}

export const CategoryActions: React.FC<CategoryActionsProps> = ({
  onAddCategory,
  onImportCategories,
  onExportCategories,
  onBulkEdit
}) => {
  const actions = [
    {
      id: 'add-category',
      label: 'Add Category',
      description: 'Create a new product category',
      icon: '➕',
      variant: 'default' as const,
      onClick: onAddCategory
    },
    {
      id: 'import-categories',
      label: 'Import Categories',
      description: 'Import from CSV/Excel',
      icon: '📥',
      variant: 'secondary' as const,
      onClick: onImportCategories
    },
    {
      id: 'export-categories',
      label: 'Export Categories',
      description: 'Export to CSV/Excel',
      icon: '📤',
      variant: 'outline' as const,
      onClick: onExportCategories
    },
    {
      id: 'bulk-edit',
      label: 'Bulk Edit',
      description: 'Edit multiple categories',
      icon: '✏️',
      variant: 'outline' as const,
      onClick: onBulkEdit
    }
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant}
              className="h-auto p-3 flex flex-col items-start space-y-2 text-left"
              onClick={action.onClick}
            >
              <div className="flex items-center space-x-2 w-full">
                <span className="text-lg">{action.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className="text-xs opacity-80">{action.description}</div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
