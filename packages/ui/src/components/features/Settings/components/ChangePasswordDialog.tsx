'use client';

import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label
} from '@rentalshop/ui';
import { Eye, EyeOff, X } from 'lucide-react';
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            {t('changePassword.title')}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {t('changePassword.description') || 'Update your account password'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto">
        <div className="space-y-4">
          <div>
              <Label htmlFor="currentPassword" className="text-xs font-medium text-muted-foreground mb-1.5 block">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-text-primary transition-colors"
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
              <Label htmlFor="newPassword" className="text-xs font-medium text-muted-foreground mb-1.5 block">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-text-primary transition-colors"
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
              <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground mb-1.5 block">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-text-primary transition-colors"
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

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button
              type="button"
            variant="outline"
            onClick={onClose}
            disabled={isChanging}
              className="gap-2"
          >
              <X className="w-4 h-4" />
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
      </DialogContent>
    </Dialog>
  );
};
