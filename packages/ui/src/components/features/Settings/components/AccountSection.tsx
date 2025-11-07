'use client';

import React from 'react';
import { 
  Card, 
  CardContent,
  Button,
  Separator
} from '@rentalshop/ui/base';
import { LogOut, Trash2, Key } from 'lucide-react';
import { useSettingsTranslations } from '@rentalshop/hooks';

// ============================================================================
// TYPES
// ============================================================================

export interface AccountSectionProps {
  onSignOut: () => void;
  onDeleteAccount: () => void;
  onChangePassword: () => void;
  isDeleting: boolean;
}

// ============================================================================
// ACCOUNT SECTION COMPONENT
// ============================================================================

export const AccountSection: React.FC<AccountSectionProps> = ({
  onSignOut,
  onDeleteAccount,
  onChangePassword,
  isDeleting
}) => {
  const t = useSettingsTranslations();
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Key className="h-5 w-5 text-gray-600" />
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{t('account.changePasswordTitle')}</h3>
                  <p className="text-sm text-gray-600">{t('account.changePasswordDesc')}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={onChangePassword}
              >
                {t('account.changePasswordButton')}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <LogOut className="h-5 w-5 text-gray-600" />
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{t('account.sessionTitle')}</h3>
                  <p className="text-sm text-gray-600">{t('account.sessionDesc')}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={onSignOut}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                {t('account.signOut')}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Trash2 className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="text-base font-semibold text-red-900">{t('account.deleteAccountTitle')}</h3>
                  <p className="text-sm text-red-700">{t('account.deleteAccountDesc')}</p>
                </div>
              </div>
              <Button 
                variant="destructive" 
                onClick={onDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? t('account.deleting') : t('account.deleteAccount')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
