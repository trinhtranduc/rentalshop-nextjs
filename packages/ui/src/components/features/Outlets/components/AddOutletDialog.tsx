'use client'

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '../../../ui';
import { AddOutletForm } from './AddOutletForm';
import type { OutletCreateInput } from '@rentalshop/types';
import { useOutletsTranslations } from '@rentalshop/hooks';

interface AddOutletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOutletCreated?: (outletData: OutletCreateInput) => Promise<void>;
  onError?: (error: any) => void;
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
      // ✅ Pass error object (not string) so onError can extract code for translation
      // onOutletCreated already shows toast, so onError is only for additional handling if needed
      if (onError) {
        onError(error); // Pass full error object to preserve code field
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            {t('dialogs.addOutletTitle')}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {t('dialogs.addOutletDescription') || 'Create a new outlet for your business'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 py-4 overflow-y-auto">
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

