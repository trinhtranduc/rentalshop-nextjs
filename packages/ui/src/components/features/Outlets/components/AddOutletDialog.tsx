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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 max-md:flex max-md:flex-col max-md:overflow-hidden max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:max-w-full max-md:rounded-none max-md:border-0 max-md:top-0 max-md:left-0 max-md:translate-x-0 max-md:translate-y-0 max-md:[&>button]:right-1.5 max-md:[&>button]:top-1.5 max-md:[&>button]:p-3.5 max-md:[&_input]:min-h-11 max-md:[&_textarea]:min-h-11 max-md:[&_button]:min-h-11 max-md:[&_[role=combobox]]:min-h-11">
        <DialogHeader className="px-6 py-4 border-b max-md:px-4 max-md:pr-14 max-md:text-left">
          <DialogTitle className="text-lg font-semibold">
            {t('dialogs.addOutletTitle')}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {t('dialogs.addOutletDescription') || 'Create a new outlet for your business'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 py-4 overflow-y-auto max-md:flex-1 max-md:min-h-0 max-md:px-4">
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

