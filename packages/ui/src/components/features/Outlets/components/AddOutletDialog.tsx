'use client'

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from '@rentalshop/ui/base';
import { AddOutletForm } from './AddOutletForm';
import type { OutletCreateInput } from '@rentalshop/types';
import { useOutletsTranslations } from '@rentalshop/hooks';

interface AddOutletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOutletCreated?: (outletData: OutletCreateInput) => Promise<void>;
  onError?: (error: string) => void;
  merchantId?: number;
}

export const AddOutletDialog: React.FC<AddOutletDialogProps> = ({
  open,
  onOpenChange,
  onOutletCreated,
  onError,
  merchantId
}) => {
  const t = useOutletsTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (outletData: OutletCreateInput) => {
    try {
      setIsSubmitting(true);
      
      // Call the parent callback to create the outlet
      // The parent will handle the API call and show toasts
      if (onOutletCreated) {
        await onOutletCreated(outletData);
      }
      
      // Close dialog on success
      onOpenChange(false);
      
    } catch (error) {
      console.error('❌ AddOutletDialog: Error occurred:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : 'Failed to create outlet');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return; // Prevent cancellation while submitting
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {t('dialogs.addOutletTitle')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          <AddOutletForm
            onSave={handleSave}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            merchantId={merchantId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

