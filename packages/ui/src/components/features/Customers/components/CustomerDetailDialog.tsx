'use client'

import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button
} from '@rentalshop/ui';
import { Trash2 } from 'lucide-react';
import type { Customer, Merchant } from '@rentalshop/types';
import { useCustomerTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { useFormattedFullDate } from '@rentalshop/utils/client';

interface CustomerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onDelete?: (customerId: number) => Promise<void>;
}

export const CustomerDetailDialog: React.FC<CustomerDetailDialogProps> = ({
  open,
  onOpenChange,
  customer,
  onDelete
}) => {
  const t = useCustomerTranslations();
  const tc = useCommonTranslations();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoadingMerchant, setIsLoadingMerchant] = useState(false);

  // Fetch merchant information when customer changes
  useEffect(() => {
    const fetchMerchant = async () => {
      if (!customer?.merchantId) {
        console.log('🔍 CustomerDetailDialog: No merchantId found for customer:', customer);
        setMerchant(null);
        return;
      }

      try {
        setIsLoadingMerchant(true);
        console.log('🔍 CustomerDetailDialog: Fetching merchant with ID:', customer.merchantId);
        
        const { merchantsApi } = await import('@rentalshop/utils');
        const response = await merchantsApi.getMerchantById(customer.merchantId);
        
        console.log('🔍 CustomerDetailDialog: Merchant API response:', response);
        
        if (response.success && response.data) {
          console.log('✅ CustomerDetailDialog: Merchant fetched successfully:', response.data);
          setMerchant(response.data as any); // TODO: Fix Merchant type compatibility between utils and types packages
        } else {
          console.error('❌ CustomerDetailDialog: Merchant API error:', response.error);
          setMerchant(null);
        }
      } catch (error) {
        console.error('❌ CustomerDetailDialog: Error fetching merchant:', error);
        setMerchant(null);
      } finally {
        setIsLoadingMerchant(false);
      }
    };

    fetchMerchant();
  }, [customer?.merchantId]);

  if (!customer) return null;

  // Use centralized date formatting hook (DRY principle)
  const formatDate = useFormattedFullDate;

  const getStatusBadgeStyle = (isActive: boolean) => {
    if (isActive) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
    } else {
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    }
  };

  const getStatusDisplayName = (isActive: boolean) => {
    return isActive ? t('status.active') : t('status.inactive');
  };

  const handleDelete = async () => {
    if (!customer || !onDelete) return;
    
    try {
      setIsDeleting(true);
      await onDelete(customer.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting customer:', error);
      // Error handling will be done by the parent component
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold">
              {t('customerDetails')}
            </DialogTitle>
            <DialogDescription className="mt-1">
              {t('viewCustomerInfo')}
            </DialogDescription>
          </DialogHeader>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('fields.fullName')}</label>
                  <p className="text-sm font-semibold">{`${customer.firstName} ${customer.lastName}`}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('fields.phone')}</label>
                  <p className="text-sm">{customer.phone}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('fields.email')}</label>
                  <p className="text-sm">{customer.email || <span className="text-muted-foreground italic">{t('fields.notProvided')}</span>}</p>
                </div>
                {customer.dateOfBirth && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('fields.dateOfBirth')}</label>
                    <p className="text-sm">{formatDate(customer.dateOfBirth)}</p>
                  </div>
                )}
                {merchant && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('fields.merchant')}</label>
                    <p className="text-sm">
                      {isLoadingMerchant ? (
                        <span className="text-muted-foreground italic">{t('fields.loading')}</span>
                      ) : merchant ? (
                        merchant.name
                      ) : (
                        <span className="text-muted-foreground italic">
                          {t('fields.notAvailable')} {customer.merchantId ? `(ID: ${customer.merchantId})` : '(No merchant ID)'}
                        </span>
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('stats.memberSince')}</label>
                  <p className="text-sm">{formatDate(customer.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('fields.lastUpdated')}</label>
                  <p className="text-sm">{formatDate(customer.updatedAt)}</p>
                </div>
              </div>

              {/* Address Information */}
              {(customer.address || customer.city || customer.state || customer.zipCode) && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-4">{t('addressInformation')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {customer.address && (
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('fields.streetAddress')}</label>
                        <p className="text-sm">{customer.address}</p>
                      </div>
                    )}
                    {customer.city && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('fields.city')}</label>
                        <p className="text-sm">{customer.city}</p>
                      </div>
                    )}
                    {customer.state && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('fields.state')}</label>
                        <p className="text-sm">{customer.state}</p>
                      </div>
                    )}
                    {customer.zipCode && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('fields.zipCode')}</label>
                        <p className="text-sm">{customer.zipCode}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t flex justify-between">
            <div>
              {onDelete && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t('actions.deleteCustomer')}</span>
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tc('buttons.close')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-red-600">
              {t('actions.deleteCustomer')}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              {t('messages.confirmDeleteDetails').replace('{name}', `${customer?.firstName} ${customer?.lastName}`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              {tc('buttons.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? t('deleting') : t('actions.deleteCustomer')}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
