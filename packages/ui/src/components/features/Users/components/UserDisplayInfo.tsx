'use client'

import React from 'react';
import { Card, CardContent, Button } from '@rentalshop/ui/base';
import type { User } from '@rentalshop/types';
import { useUsersTranslations } from '@rentalshop/hooks';

interface UserDisplayInfoProps {
  user: User;
  showActions?: boolean;
  onEdit?: () => void;
  onView?: () => void;
  onDelete?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onChangePassword?: () => void;
  isLoading?: boolean;
}

export const UserDisplayInfo: React.FC<UserDisplayInfoProps> = ({
  user,
  showActions = false,
  onEdit,
  onView,
  onDelete,
  onActivate,
  onDeactivate,
  onChangePassword,
  isLoading = false
}) => {
  const t = useUsersTranslations();
  
  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'MERCHANT':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'OUTLET_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
      case 'OUTLET_STAFF':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
      case 'CLIENT':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const getStatusBadgeStyle = (isActive: boolean) => {
    if (isActive) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
    } else {
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleKey = role as 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
    return t(`roles.${roleKey}` as any) || role;
  };

  const getStatusDisplayName = (isActive: boolean) => {
    return isActive ? t('fields.active') : t('fields.inactive');
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Personal Information */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">{t('userInformation')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.name')}</label>
              <p className="text-gray-900 font-medium">
                {`${user.firstName || ''} ${user.lastName || ''}`.trim() || t('messages.na')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.email')}</label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.phone')}</label>
              <p className="text-gray-900">{user.phone || t('messages.na')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.role')}</label>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeStyle(user.role)}`}>
                {getRoleDisplayName(user.role)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.status')}</label>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyle(user.isActive)}`}>
                {getStatusDisplayName(user.isActive)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.id')}</label>
              <p className="text-gray-500 text-sm font-mono">{user.id}</p>
            </div>
          </div>
        </div>

        {/* Outlet Information */}
        {user.outlet && (
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">{t('outletInformation')}</h3>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.outletName')}</label>
                  <p className="text-gray-900 text-base">{user.outlet.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.outletId')}</label>
                  <p className="text-gray-500 text-sm font-mono">{user.outlet.id}</p>
                </div>
                {user.outlet.merchant && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.merchantName')}</label>
                      <p className="text-gray-900 text-base">{user.outlet.merchant.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.merchantId')}</label>
                      <p className="text-gray-500 text-sm font-mono">{user.outlet.merchant.id}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Account Actions - Only show if actions are enabled */}
        {showActions && (
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">{t('accountActions')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {onChangePassword && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">{t('passwordManagement')}</h4>
                  <Button
                    variant="outline"
                    onClick={onChangePassword}
                    className="w-full flex items-center justify-start px-3 py-2 text-sm h-auto"
                    disabled={isLoading}
                  >
                    🔑 {t('actions.changePassword')}
                  </Button>
                  <p className="text-xs text-gray-500">
                    {t('messages.allowChangePassword')}
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">{t('accountStatus')}</h4>
                {user.isActive ? (
                  onDeactivate && (
                    <Button
                      variant="outline"
                      onClick={onDeactivate}
                      className="w-full flex items-center justify-start px-3 py-2 text-sm text-orange-600 border-orange-200 hover:bg-orange-50 h-auto"
                      disabled={isLoading || user.role === 'ADMIN'}
                    >
                      {isLoading ? `⏳ ${t('actions.deactivating')}` : `❌ ${t('actions.deactivateAccount')}`}
                    </Button>
                  )
                ) : (
                  onActivate && (
                    <Button
                      variant="outline"
                      onClick={onActivate}
                      className="w-full flex items-center justify-start px-3 py-2 text-sm text-green-600 border-green-200 hover:bg-green-50 h-auto"
                      disabled={isLoading}
                    >
                      {isLoading ? `⏳ ${t('actions.activating')}` : `✅ ${t('actions.activateAccount')}`}
                    </Button>
                  )
                )}
                <p className="text-xs text-gray-500">
                  {user.isActive 
                    ? t('messages.deactivateToPrevent')
                    : t('messages.activateToRestore')
                  }
                </p>
                {user.role === 'ADMIN' && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    ⚠️ {t('messages.cannotDeactivateAdminShort')}
                  </div>
                )}
              </div>
              
              {onDelete && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">{t('dangerZone')}</h4>
                  <Button
                    variant="outline"
                    onClick={onDelete}
                    className="w-full flex items-center justify-start px-3 py-2 text-sm text-red-600 border-red-200 hover:bg-red-50 h-auto"
                    disabled={isLoading || user.role === 'ADMIN'}
                  >
                    {isLoading ? `⏳ ${t('actions.deleting')}` : `🗑️ ${t('actions.deleteAccount')}`}
                  </Button>
                  <p className="text-xs text-gray-500">
                    {t('messages.permanentlyDeleteShort')}
                  </p>
                  {user.role === 'ADMIN' && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      ⚠️ {t('messages.cannotDeleteAdmin')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
