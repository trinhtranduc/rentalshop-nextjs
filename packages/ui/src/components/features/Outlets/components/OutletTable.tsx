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
import { Outlet } from '@rentalshop/types';
import { Eye, Edit, XCircle, CheckCircle, MoreVertical, Building2, CreditCard } from 'lucide-react';
import { useOutletsTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { useFormattedFullDate } from '@rentalshop/utils/client';

interface OutletTableProps {
  outlets: Outlet[];
  onOutletAction: (action: string, outletId: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export function OutletTable({ 
  outlets, 
  onOutletAction, 
  sortBy = 'createdAt', 
  sortOrder = 'desc',
  onSort 
}: OutletTableProps) {
  const t = useOutletsTranslations();
  const tc = useCommonTranslations();
  const [openDropdownId, setOpenDropdownId] = React.useState<number | null>(null);
  
  if (outlets.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">{t('messages.noOutlets')}</h3>
            <p className="text-sm">
              {t('messages.tryAdjustingSearch')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use centralized date formatting hook (DRY principle)
  const formatDate = useFormattedFullDate;

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        {tc('labels.active')}
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
        {tc('labels.inactive')}
      </Badge>
    );
  };

  const handleSort = (column: string) => {
    if (onSort) {
      onSort(column);
    }
  };

  return (
    <Card className="shadow-sm border-border flex flex-col h-full">
      <CardContent className="p-0 flex-1 overflow-hidden">
        {/* Table with scroll - flex layout */}
        <div className="flex-1 overflow-auto h-full">
          <table className="w-full">
            {/* Table Header - Sticky */}
            <thead className="bg-bg-secondary border-b border-border sticky top-0 z-10">
            <tr>
              <th 
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-bg-tertiary"
              >
                <div className="flex items-center gap-1">
                  {tc('labels.name')}
                  {sortBy === 'name' && (
                    <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                {tc('labels.address')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                {t('fields.phone')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                {tc('labels.status')}
              </th>
              <th 
                onClick={() => handleSort('createdAt')}
                className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-bg-tertiary"
              >
                <div className="flex items-center gap-1">
                  {tc('labels.createdAt')}
                  {sortBy === 'createdAt' && (
                    <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                {tc('labels.actions')}
              </th>
            </tr>
          </thead>
          
            {/* Table Body */}
            <tbody className="bg-bg-card divide-y divide-border">
              {outlets.map((outlet) => (
                <tr key={outlet.id} className="hover:bg-bg-secondary transition-colors">
                  {/* Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-text-primary">
                          {outlet.name}
                        </div>
                        {outlet.isDefault && (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                            {t('labels.default')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {/* Address */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-primary">
                      {outlet.address || t('fields.notAvailable')}
                    </div>
                  </td>
                  
                  {/* Contact */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-primary">
                      {outlet.phone || t('fields.notAvailable')}
                    </div>
                  </td>
                  
                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(outlet.isActive)}
                  </td>
                  
                  {/* Created Date */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-text-primary">
                      {formatDate(outlet.createdAt)}
                    </div>
                  </td>
                
                {/* Actions - Dropdown Menu */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setOpenDropdownId(outlet.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end"
                      open={openDropdownId === outlet.id}
                      onOpenChange={(open: boolean) => setOpenDropdownId(open ? outlet.id : null)}
                    >
                      <DropdownMenuItem onClick={() => {
                        onOutletAction('view', outlet.id);
                        setOpenDropdownId(null);
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        {t('actions.viewDetails')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        onOutletAction('edit', outlet.id);
                        setOpenDropdownId(null);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('actions.editOutlet')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        onOutletAction('manageBanks', outlet.id);
                        setOpenDropdownId(null);
                      }}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        {t('actions.manageBankAccounts')}
                      </DropdownMenuItem>
                      
                      {/* Only show enable/disable for non-default outlets */}
                      {!outlet.isDefault && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              onOutletAction(outlet.isActive ? 'disable' : 'enable', outlet.id);
                              setOpenDropdownId(null);
                            }}
                            className={outlet.isActive ? "text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300" : "text-green-600 dark:text-green-400 focus:text-green-700 dark:focus:text-green-300"}
                          >
                            {outlet.isActive ? <XCircle className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                            {outlet.isActive ? t('actions.disableOutlet') : t('actions.enableOutlet')}
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
      </CardContent>
    </Card>
  );
}
