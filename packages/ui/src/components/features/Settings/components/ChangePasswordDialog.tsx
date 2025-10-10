'use client';

import React from 'react';
import { 
  Button,
  Input,
  Label
} from '@rentalshop/ui';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={onChange}
              placeholder="Enter your current password"
            />
          </div>

          <div>
            <Label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={onChange}
              placeholder="Enter your new password"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={onChange}
              placeholder="Confirm your new password"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isChanging}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isChanging}
          >
            {isChanging ? 'Changing...' : 'Change Password'}
          </Button>
        </div>
      </div>
    </div>
  );
};
