'use client';

import React, { useState } from 'react';
import { 
  Button,
  Input,
  Label
} from '@rentalshop/ui/base';
import { Eye, EyeOff } from 'lucide-react';
import { useSettingsTranslations } from '@rentalshop/hooks';

// ============================================================================
// TYPES
// ============================================================================

export interface ChangePasswordDialogProps {
  isOpen: boolean;
  isChanging: boolean;
  passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  onClose: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

// ============================================================================
// CHANGE PASSWORD DIALOG COMPONENT
// ============================================================================

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  isOpen,
  isChanging,
  passwordData,
  onClose,
  onChange,
  onSubmit
}) => {
  const t = useSettingsTranslations();
  // State for show/hide password
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">{t('changePassword.title')}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
              {t('changePassword.currentPassword')}
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                name="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={passwordData.currentPassword}
                onChange={onChange}
                placeholder={t('changePassword.currentPasswordPlaceholder')}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              {t('changePassword.newPassword')}
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={onChange}
                placeholder={t('changePassword.newPasswordPlaceholder')}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              {t('changePassword.confirmPassword')}
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={onChange}
                placeholder={t('changePassword.confirmPasswordPlaceholder')}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isChanging}
          >
            {t('changePassword.cancel')}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isChanging}
          >
            {isChanging ? t('changePassword.changing') : t('changePassword.changePassword')}
          </Button>
        </div>
      </div>
    </div>
  );
};
