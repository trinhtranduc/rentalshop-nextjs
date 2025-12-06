'use client'

import React, { useState } from 'react';
import { 
  Card, 
  CardContent,
  Button
} from '../../../ui';
import { Plus, Download, Upload, Edit3 } from 'lucide-react';
import { usePermissions } from '@rentalshop/hooks';
import { AddCategoryDialog } from './AddCategoryDialog';

interface CategoryActionsProps {
  onAddCategory: () => void;
  onImportCategories: () => void;
  onExportCategories: () => void;
  onBulkEdit: () => void;
  onCategoryCreated?: (category: any) => void;
  onError?: (error: string) => void;
}

export const CategoryActions: React.FC<CategoryActionsProps> = ({
  onAddCategory,
  onImportCategories,
  onExportCategories,
  onBulkEdit,
  onCategoryCreated,
  onError
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  // ✅ Use permissions hook for UI control
  const { canManageProducts, canExportProducts } = usePermissions();
  // ✅ Filter actions based on permissions - Only users with products.manage can manage categories
  const allActions = [
    {
      id: 'add-category',
      label: 'Add Category',
      description: 'Create a new product category',
      icon: '➕',
      variant: 'default' as const,
      onClick: () => setIsAddDialogOpen(true),
      roles: canManageProducts ? ['ALL'] : [] // ✅ Use products.manage permission
    },
    {
      id: 'import-categories',
      label: 'Import Categories',
      description: 'Import from CSV/Excel',
      icon: '📥',
      variant: 'secondary' as const,
      onClick: onImportCategories,
      roles: canManageProducts ? ['ALL'] : [] // ✅ Use products.manage permission
    },
    {
      id: 'export-categories',
      label: 'Export Categories',
      description: 'Export to CSV/Excel',
      icon: '📤',
      variant: 'outline' as const,
      onClick: onExportCategories,
      roles: canExportProducts ? ['ALL'] : [] // ✅ Use products.export permission
    },
    {
      id: 'bulk-edit',
      label: 'Bulk Edit',
      description: 'Edit multiple categories',
      icon: '✏️',
      variant: 'outline' as const,
      onClick: onBulkEdit,
      roles: canManageProducts ? ['ALL'] : [] // ✅ Use products.manage permission
    }
  ];

  // Filter actions based on current user role
  const actions = allActions.filter(action => 
    !action.roles || action.roles.length > 0
  ).map(({ roles, ...action }) => action); // Remove roles property from final actions

  return (
    <>
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

    {/* Category Add Dialog */}
    <AddCategoryDialog
      open={isAddDialogOpen}
      onOpenChange={setIsAddDialogOpen}
      onCategoryCreated={onCategoryCreated}
      onError={onError}
    />
    </>
  );
};
