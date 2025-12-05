'use client';

import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button
} from '@rentalshop/ui';
import { AlertTriangle, X } from 'lucide-react';
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-action-danger" />
            {t('deleteAccountDialog.title')}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {t('deleteAccountDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto">
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
            {t('deleteAccountDialog.description')}
          </p>
            <ul className="text-sm text-text-secondary list-disc list-inside space-y-1">
            <li>{t('deleteAccountDialog.profileInfo')}</li>
            <li>{t('deleteAccountDialog.orderHistory')}</li>
            <li>{t('deleteAccountDialog.productListings')}</li>
            <li>{t('deleteAccountDialog.savedPreferences')}</li>
          </ul>
            <p className="text-sm font-semibold text-action-danger">
              {t('deleteAccountDialog.irreversibleWarning')}
          </p>
        </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button
              type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
              className="gap-2"
          >
              <X className="w-4 h-4" />
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
      </DialogContent>
    </Dialog>
  );
};
