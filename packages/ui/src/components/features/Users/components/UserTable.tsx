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
import { User } from '@rentalshop/types';
import { Eye, Edit, Trash2, MoreVertical, UserCheck, UserX } from 'lucide-react';
import { useUsersTranslations } from '@rentalshop/hooks';

interface UserTableProps {
  users: User[];
  onUserAction: (action: string, userId: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export function UserTable({ 
  users, 
  onUserAction, 
  sortBy = 'createdAt', 
  sortOrder = 'desc',
  onSort 
}: UserTableProps) {
  const t = useUsersTranslations();
  const [openDropdownId, setOpenDropdownId] = React.useState<number | null>(null);
  
  if (users.length === 0) {
    return (
      <Card className="shadow-sm border-border">
        <CardContent className="text-center py-12">
          <div className="text-text-tertiary">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium mb-2">{t('messages.noUsers')}</h3>
            <p className="text-sm">
              {t('messages.loadingUsers')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return t('messages.na');
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      MERCHANT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      OUTLET_ADMIN: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      OUTLET_STAFF: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    
    const roleKey = role as keyof typeof t.roles;
    return (
      <Badge className={variants[role] || variants.OUTLET_STAFF}>
        {t(`roles.${roleKey}` as any) || role.replace('_', ' ')}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        {t('fields.active')}
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
        {t('fields.inactive')}
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
            {/* Table Header with Sorting - Sticky */}
            <thead className="bg-bg-secondary border-b border-border sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('fields.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('fields.role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('fields.outlet')} / {t('fields.merchant')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('fields.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('fields.createdAt')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('fields.actions')}
                </th>
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody className="bg-bg-card divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-bg-secondary transition-colors">
                  {/* User Info (Name + Email) */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-action-primary to-brand-primary flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {user.firstName?.substring(0, 1)}{user.lastName?.substring(0, 1)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-text-tertiary">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Role */}
                  <td className="px-6 py-4">
                    {getRoleBadge(user.role)}
                  </td>
                  
                  {/* Outlet / Merchant */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-primary">
                      {user.outlet?.name || user.merchant?.name || t('messages.na')}
                    </div>
                  </td>
                  
                  {/* Status */}
                  <td className="px-6 py-4">
                    {getStatusBadge(user.isActive)}
                  </td>
                  
                  {/* Created Date */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-primary">
                      {formatDate(user.createdAt)}
                    </div>
                  </td>
                
                  
                  {/* Actions - Dropdown Menu */}
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end"
                        open={openDropdownId === user.id}
                        onOpenChange={(open: boolean) => setOpenDropdownId(open ? user.id : null)}
                      >
                        <DropdownMenuItem onClick={() => {
                          onUserAction('view', user.id);
                          setOpenDropdownId(null);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('actions.viewDetails')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          onUserAction('edit', user.id);
                          setOpenDropdownId(null);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('actions.editUser')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          onUserAction(user.isActive ? 'deactivate' : 'activate', user.id);
                          setOpenDropdownId(null);
                        }}>
                          {user.isActive ? <UserX className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                          {user.isActive ? t('actions.deactivate') : t('actions.activate')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            onUserAction('delete', user.id);
                            setOpenDropdownId(null);
                          }}
                          className="text-action-danger focus:text-action-danger"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('actions.delete')}
                        </DropdownMenuItem>
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
