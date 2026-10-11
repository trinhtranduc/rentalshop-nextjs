'use client'

import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { usersApi } from '@rentalshop/utils';
import { Eye, EyeOff } from 'lucide-react';
import { useUsersTranslations, useCommonTranslations } from '@rentalshop/hooks';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  userName: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  open,
  onOpenChange,
  userId,
  userName,
  onSuccess,
  onError
}) => {
  const t = useUsersTranslations();
  const tc = useCommonTranslations();
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const togglePasswordVisibility = (field: 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = t('messages.newPasswordRequired');
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = t('messages.passwordMinLength');
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = t('messages.confirmPasswordRequired');
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('messages.passwordsDoNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await usersApi.changePassword(
        userId,
        formData.newPassword
      );

      if (response.success) {
        onSuccess?.();
        onOpenChange(false);
        // Reset form
        setFormData({
          newPassword: '',
          confirmPassword: ''
        });
        setErrors({});
      } else {
        onError?.(response.error || t('messages.passwordChangeFailed'));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form
    setFormData({
      newPassword: '',
      confirmPassword: ''
    });
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-md:flex max-md:flex-col max-md:overflow-y-auto max-md:p-4 max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:max-w-full max-md:rounded-none max-md:border-0 max-md:top-0 max-md:left-0 max-md:translate-x-0 max-md:translate-y-0 max-md:[&>button]:right-1.5 max-md:[&>button]:top-1.5 max-md:[&>button]:p-3.5 max-md:[&_input]:min-h-11 max-md:[&_textarea]:min-h-11 max-md:[&_button]:min-h-11 max-md:[&_[role=combobox]]:min-h-11">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {t('dialogs.changePasswordTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-1">
            {t('dialogs.changePasswordDescription')}: <span className="font-medium">{userName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="max-md:flex max-md:flex-1 max-md:flex-col">
          <div className="mt-6 space-y-4 max-md:flex-1">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('dialogs.newPassword')} *</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder={t('placeholders.enterNewPassword')}
                  className={errors.newPassword ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 h-6 w-6 p-0 max-md:h-11 max-md:w-11 max-md:right-0"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-red-600">{errors.newPassword}</p>
              )}
              <p className="text-xs text-gray-500">{t('messages.passwordMinLength')}</p>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('dialogs.confirmNewPassword')} *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder={t('placeholders.confirmNewPassword')}
                  className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 h-6 w-6 p-0 max-md:h-11 max-md:w-11 max-md:right-0"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-end space-x-2 mt-6 max-md:sticky max-md:bottom-0 max-md:-mx-4 max-md:-mb-4 max-md:flex-row max-md:space-x-0 max-md:gap-2 max-md:border-t max-md:bg-bg-card max-md:px-4 max-md:pt-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:[&>button]:flex-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {tc('buttons.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-blue-700 hover:bg-blue-700"
            >
              {isLoading ? t('actions.changingPassword') : t('actions.changePassword')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
