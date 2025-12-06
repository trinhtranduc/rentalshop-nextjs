'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { usePermissions } from '@rentalshop/hooks';

/**
 * Debug component to view user permissions
 * Shows permissions from:
 * 1. localStorage (authData)
 * 2. useAuth hook (user object)
 * 3. usePermissions hook (computed permissions)
 */
export const PermissionsDebug: React.FC = () => {
  const { user } = useAuth();
  const { permissions, hasPermission, canViewBankAccounts, canManageBankAccounts } = usePermissions();
  const [localStorageData, setLocalStorageData] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authData = localStorage.getItem('authData');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          setLocalStorageData(parsed);
        } catch (e) {
          console.error('Failed to parse authData:', e);
        }
      }
    }
  }, []);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>🔍 Permissions Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Info */}
        <div>
          <h3 className="font-semibold mb-2">User Info</h3>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
            {JSON.stringify({
              id: user?.id,
              email: user?.email,
              role: user?.role,
              merchantId: user?.merchantId,
              outletId: user?.outletId,
            }, null, 2)}
          </pre>
        </div>

        {/* Permissions from useAuth (user object) */}
        <div>
          <h3 className="font-semibold mb-2">Permissions from useAuth (user.permissions)</h3>
          {user?.permissions ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Count: {user.permissions.length}
              </p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(user.permissions, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-red-500">❌ No permissions in user object!</p>
          )}
        </div>

        {/* Permissions from usePermissions hook */}
        <div>
          <h3 className="font-semibold mb-2">Permissions from usePermissions hook</h3>
          {permissions.length > 0 ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Count: {permissions.length}
              </p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(permissions, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-red-500">❌ No permissions from hook!</p>
          )}
        </div>

        {/* Permissions from localStorage */}
        <div>
          <h3 className="font-semibold mb-2">Permissions from localStorage (authData)</h3>
          {localStorageData?.user?.permissions ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Count: {localStorageData.user.permissions.length}
              </p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(localStorageData.user.permissions, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-red-500">❌ No permissions in localStorage!</p>
          )}
        </div>

        {/* Bank Account Permissions Check */}
        <div>
          <h3 className="font-semibold mb-2">Bank Account Permissions</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">bankAccounts.view:</span>
              <span className={hasPermission('bankAccounts.view') ? 'text-green-600' : 'text-red-600'}>
                {hasPermission('bankAccounts.view') ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">bankAccounts.manage:</span>
              <span className={hasPermission('bankAccounts.manage') ? 'text-green-600' : 'text-red-600'}>
                {hasPermission('bankAccounts.manage') ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">canViewBankAccounts:</span>
              <span className={canViewBankAccounts ? 'text-green-600' : 'text-red-600'}>
                {canViewBankAccounts ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">canManageBankAccounts:</span>
              <span className={canManageBankAccounts ? 'text-green-600' : 'text-red-600'}>
                {canManageBankAccounts ? '✅ Yes' : '❌ No'}
              </span>
            </div>
          </div>
        </div>

        {/* Full localStorage authData (for debugging) */}
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold text-sm">
            Full localStorage authData (click to expand)
          </summary>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto mt-2 max-h-96">
            {localStorageData ? JSON.stringify(localStorageData, null, 2) : 'No authData found'}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
};

