'use client';

import React from 'react';
import { Button } from '@rentalshop/ui/base';
import { useSettingsTranslations } from '@rentalshop/hooks';

// ============================================================================
// TYPES
// ============================================================================

export interface DeleteAccountDialogProps {
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

// ============================================================================
// DELETE ACCOUNT DIALOG COMPONENT
// ============================================================================

export const DeleteAccountDialog: React.FC<DeleteAccountDialogProps> = ({
  isOpen,
  isDeleting,
  onClose,
  onConfirm
}) => {
  const t = useSettingsTranslations();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">{t('deleteAccountDialog.title')}</h3>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            {t('deleteAccountDialog.description')}
          </p>
          <ul className="mt-3 text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>{t('deleteAccountDialog.profileInfo')}</li>
            <li>{t('deleteAccountDialog.orderHistory')}</li>
            <li>{t('deleteAccountDialog.productListings')}</li>
            <li>{t('deleteAccountDialog.savedPreferences')}</li>
          </ul>
          <p className="mt-3 text-sm text-gray-600">
            <strong>{t('deleteAccountDialog.irreversibleWarning')}</strong>
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            {t('deleteAccountDialog.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? t('deleteAccountDialog.deleting') : t('deleteAccountDialog.deleteAccount')}
          </Button>
        </div>
      </div>
    </div>
  );
};
