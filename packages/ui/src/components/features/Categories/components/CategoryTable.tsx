import React from 'react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card, CardContent } from '../../../ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../../ui/dropdown-menu';
import { Category } from '@rentalshop/types';
import { useCategoriesTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { usePermissions } from '@rentalshop/hooks';
import { Eye, Edit, Trash2, CheckCircle, XCircle, MoreVertical, FolderOpen } from 'lucide-react';

interface CategoryTableProps {
  categories: Category[];
  onCategoryAction: (action: string, categoryId: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export function CategoryTable({ 
  categories, 
  onCategoryAction, 
  sortBy = 'name', 
  sortOrder = 'asc',
  onSort 
}: CategoryTableProps) {
  const [openDropdownId, setOpenDropdownId] = React.useState<number | null>(null);
  const t = useCategoriesTranslations();
  const tc = useCommonTranslations();
  // ✅ Use permissions hook for UI control
  const { canManageProducts } = usePermissions();
  
  if (categories.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">{t('messages.noCategories')}</h3>
            <p className="text-sm">
              {t('messages.noCategoriesDescription')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        {t('status.active')}
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
        {t('status.inactive')}
      </Badge>
    );
  };

  const handleSort = (column: string) => {
    if (onSort) {
      onSort(column);
    }
  };

  return (
    <Card className="shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          {/* Table Header - Sticky */}
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            <tr>
              <th 
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-1">
                  {tc('labels.name')}
                  {sortBy === 'name' && (
                    <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {tc('labels.description')}
              </th>
              {/* Status column hidden as requested */}
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {tc('labels.status')}
              </th> */}
              <th 
                onClick={() => handleSort('createdAt')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-1">
                  {tc('labels.createdAt')}
                  {sortBy === 'createdAt' && (
                    <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {tc('labels.actions')}
              </th>
            </tr>
          </thead>

          {/* Table Body - Scrollable */}
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {categories.map((category) => (
              <tr 
                key={category.id} 
                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {category.name}
                      </div>
                      {category.isDefault && (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                          {t('labels.default')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="max-w-xs truncate">
                    {category.description || 'N/A'}
                  </div>
                </td>
                {/* Status cell hidden as requested */}
                {/* <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(category.isActive)}
                </td> */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(category.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => setOpenDropdownId(category.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end"
                      open={openDropdownId === category.id}
                      onOpenChange={(open) => setOpenDropdownId(open ? category.id : null)}
                    >
                      {/* ✅ View - Available if user can view products */}
                      <DropdownMenuItem
                        onClick={() => {
                          onCategoryAction('view', category.id);
                          setOpenDropdownId(null);
                        }}
                        className="cursor-pointer"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {t('actions.viewDetails')}
                      </DropdownMenuItem>
                      
                      {/* ✅ Edit - Only available if user can manage products */}
                      {canManageProducts && (
                      <DropdownMenuItem
                        onClick={() => {
                          onCategoryAction('edit', category.id);
                          setOpenDropdownId(null);
                        }}
                        className="cursor-pointer"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        {t('actions.edit')}
                      </DropdownMenuItem>
                      )}
                      
                      {/* Activate/Deactivate hidden as requested */}
                      {/* <DropdownMenuSeparator />
                      
                      <DropdownMenuItem
                        onClick={() => {
                          onCategoryAction(category.isActive ? 'deactivate' : 'activate', category.id);
                          setOpenDropdownId(null);
                        }}
                        className="cursor-pointer"
                      >
                        {category.isActive ? (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            {t('actions.deactivate')}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {t('actions.activate')}
                          </>
                        )}
                      </DropdownMenuItem> */}
                      
                      {/* ✅ Delete - Only available if user can manage products AND category is not default */}
                      {canManageProducts && !category.isDefault && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              onCategoryAction('delete', category.id);
                              setOpenDropdownId(null);
                            }}
                            className="cursor-pointer text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('actions.delete')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
