'use client'

import React from 'react';
import { 
  Card, 
  CardContent,
  Button
} from '../../../ui';
import { Plus, Download, Upload, Edit3 } from 'lucide-react';
import { useUserRole } from '@rentalshop/hooks';

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
  // Use hook instead of prop
  const { canManageCategories } = useUserRole();
  // Filter actions based on user role - Only ADMIN and MERCHANT can manage categories
  const allActions = [
    {
      id: 'add-category',
      label: 'Add Category',
      description: 'Create a new product category',
      icon: '➕',
      variant: 'default' as const,
      onClick: onAddCategory,
      roles: canManageCategories ? ['ALL'] : [] // Use permission check
    },
    {
      id: 'import-categories',
      label: 'Import Categories',
      description: 'Import from CSV/Excel',
      icon: '📥',
      variant: 'secondary' as const,
      onClick: onImportCategories,
      roles: canManageCategories ? ['ALL'] : [] // Use permission check
    },
    {
      id: 'export-categories',
      label: 'Export Categories',
      description: 'Export to CSV/Excel',
      icon: '📤',
      variant: 'outline' as const,
      onClick: onExportCategories,
      roles: ['ALL'] // All roles can export
    },
    {
      id: 'bulk-edit',
      label: 'Bulk Edit',
      description: 'Edit multiple categories',
      icon: '✏️',
      variant: 'outline' as const,
      onClick: onBulkEdit,
      roles: canManageCategories ? ['ALL'] : [] // Use permission check
    }
  ];

  // Filter actions based on current user role
  const actions = allActions.filter(action => 
    !action.roles || action.roles.length > 0
  ).map(({ roles, ...action }) => action); // Remove roles property from final actions

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
