'use client'

import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './dialog';
import { Button } from './button';
import { AlertTriangle, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';

export type ConfirmationType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ConfirmationType;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const getTypeConfig = (type: ConfirmationType) => {
  switch (type) {
    case 'danger':
      return {
        icon: XCircle,
        iconColor: 'text-red-500',
        buttonVariant: 'destructive' as const,
        buttonColor: 'bg-red-600 hover:bg-red-700 text-white'
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        iconColor: 'text-orange-500',
        buttonVariant: 'outline' as const,
        buttonColor: 'border-orange-300 text-orange-600 hover:bg-orange-50'
      };
    case 'info':
      return {
        icon: Info,
        iconColor: 'text-blue-500',
        buttonVariant: 'outline' as const,
        buttonColor: 'border-blue-300 text-blue-700 hover:bg-blue-50'
      };
    case 'success':
      return {
        icon: CheckCircle,
        iconColor: 'text-green-500',
        buttonVariant: 'default' as const,
        buttonColor: 'bg-green-600 hover:bg-green-700 text-white'
      };
    default:
      return {
        icon: AlertCircle,
        iconColor: 'text-gray-500',
        buttonVariant: 'outline' as const,
        buttonColor: 'border-gray-300 text-gray-600 hover:bg-gray-50'
      };
  }
};

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  type,
  title,
  description,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
  disabled = false
}) => {
  const config = getTypeConfig(type);
  const IconComponent = config.icon;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
            <div>
              <DialogTitle className="text-lg font-semibold">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="flex justify-end space-x-2 mt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading || disabled}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={isLoading || disabled}
            className={config.buttonColor}
          >
            {isLoading ? 'Processing...' : (confirmText || 'Confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
