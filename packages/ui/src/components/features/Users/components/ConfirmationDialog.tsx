'use client'

import React from 'react';
import { 
  Button,
  Input,
  Label,
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@rentalshop/ui';
import { AlertTriangle, Trash2, UserX, Lock } from 'lucide-react';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  icon?: React.ReactNode;
  confirmVariant?: 'default' | 'destructive' | 'outline';
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  type,
  title,
  description,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  icon,
  confirmVariant = 'default'
}) => {
  if (!open) return null;

  const getIconAndColors = () => {
    switch (type) {
      case 'danger':
        return {
          icon: icon || <Trash2 className="h-6 w-6 text-red-600" />,
          bgColor: 'bg-red-100',
          textColor: 'text-red-600'
        };
      case 'warning':
        return {
          icon: icon || <UserX className="h-6 w-6 text-orange-600" />,
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-600'
        };
      case 'info':
        return {
          icon: icon || <Lock className="h-6 w-6 text-blue-600" />,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-600'
        };
      default:
        return {
          icon: icon || <AlertTriangle className="h-6 w-6 text-gray-600" />,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600'
        };
    }
  };

  const { icon: dialogIcon, bgColor, textColor } = getIconAndColors();

  const getConfirmButtonVariant = () => {
    if (confirmVariant !== 'default') return confirmVariant;
    return type === 'danger' ? 'destructive' : 'default';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${bgColor}`}>
            {dialogIcon}
          </div>
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            {description}
          </p>
          
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {cancelText}
            </Button>
            <Button
              variant={getConfirmButtonVariant()}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
