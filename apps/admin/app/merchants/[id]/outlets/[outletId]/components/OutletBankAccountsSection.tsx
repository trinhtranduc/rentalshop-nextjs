'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  BankAccountList,
  BankAccountForm,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ConfirmationDialog,
  useToast,
} from '@rentalshop/ui';
import { bankAccountsApi, generateBankQRCodeData } from '@rentalshop/utils';
import { useBankAccountTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { CreditCard } from 'lucide-react';
import type { BankAccount, BankAccountInput } from '@rentalshop/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface OutletBankAccountsSectionProps {
  merchantId: number;
  outletId: number;
}

// ============================================================================
// OUTLET BANK ACCOUNTS SECTION COMPONENT
// ============================================================================

export const OutletBankAccountsSection: React.FC<OutletBankAccountsSectionProps> = ({
  merchantId,
  outletId,
}) => {
  const { toastSuccess, toastError } = useToast();
  const t = useBankAccountTranslations();
  const tc = useCommonTranslations();

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch bank accounts
  const fetchBankAccounts = async () => {
    if (!merchantId || !outletId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await bankAccountsApi.getBankAccounts(merchantId, outletId);
      
      if (response.success && response.data) {
        // Generate QR codes for accounts that don't have them
        const accountsWithQR = response.data.map(account => {
          if (!account.qrCode && account.accountNumber && account.accountHolderName && account.bankName) {
            const qrCode = generateBankQRCodeData({
              accountNumber: account.accountNumber,
              accountHolderName: account.accountHolderName,
              bankName: account.bankName,
              bankCode: account.bankCode,
            });
            return { ...account, qrCode };
          }
          return account;
        });
        setBankAccounts(accountsWithQR);
      } else {
        toastError(tc('labels.error'), response.message || t('messages.loadError'));
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toastError(tc('labels.error'), t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (merchantId && outletId) {
      fetchBankAccounts();
    }
  }, [merchantId, outletId]);

  // Handle add bank account
  const handleAdd = () => {
    setSelectedAccount(null);
    setShowAddDialog(true);
  };

  // Handle edit bank account
  const handleEdit = (account: BankAccount) => {
    setSelectedAccount(account);
    setShowEditDialog(true);
  };

  // Handle delete bank account
  const handleDelete = (account: BankAccount) => {
    setSelectedAccount(account);
    setShowDeleteConfirm(true);
  };

  // Handle form submit (create)
  const handleCreateSubmit = async (data: BankAccountInput) => {
    if (!merchantId || !outletId) return;

    try {
      setFormLoading(true);
      
      const response = await bankAccountsApi.createBankAccount(merchantId, outletId, data);

      if (response.success) {
        toastSuccess(tc('labels.success'), t('messages.addSuccess'));
        setShowAddDialog(false);
        fetchBankAccounts();
      } else {
        toastError(tc('labels.error'), response.message || t('messages.addError'));
      }
    } catch (error) {
      console.error('Error creating bank account:', error);
      toastError(tc('labels.error'), t('messages.addError'));
    } finally {
      setFormLoading(false);
    }
  };

  // Handle form submit (update)
  const handleUpdateSubmit = async (data: BankAccountInput) => {
    if (!selectedAccount || !merchantId || !outletId) return;

    try {
      setFormLoading(true);
      
      const response = await bankAccountsApi.updateBankAccount(
        merchantId,
        outletId,
        selectedAccount.id,
        data
      );

      if (response.success) {
        toastSuccess(tc('labels.success'), t('messages.updateSuccess'));
        setShowEditDialog(false);
        setSelectedAccount(null);
        fetchBankAccounts();
      } else {
        toastError(tc('labels.error'), response.message || t('messages.updateError'));
      }
    } catch (error) {
      console.error('Error updating bank account:', error);
      toastError(tc('labels.error'), t('messages.updateError'));
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!selectedAccount || !merchantId || !outletId) return;

    try {
      setFormLoading(true);
      const response = await bankAccountsApi.deleteBankAccount(
        merchantId,
        outletId,
        selectedAccount.id
      );

      if (response.success) {
        toastSuccess(tc('labels.success'), t('messages.deleteSuccess'));
        setShowDeleteConfirm(false);
        setSelectedAccount(null);
        fetchBankAccounts();
      } else {
        toastError(tc('labels.error'), response.message || t('messages.deleteError'));
      }
    } catch (error) {
      console.error('Error deleting bank account:', error);
      toastError(tc('labels.error'), t('messages.deleteError'));
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Bank Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BankAccountList
            bankAccounts={bankAccounts}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
            showAddButton={true}
          />
        </CardContent>
      </Card>

      {/* Add Dialog */}
      {showAddDialog && (
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('form.addTitle')}</DialogTitle>
            </DialogHeader>
            <BankAccountForm
              onSubmit={handleCreateSubmit}
              onCancel={() => setShowAddDialog(false)}
              loading={formLoading}
              title={t('form.title')}
              submitText={t('form.add')}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {showEditDialog && selectedAccount && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('form.editTitle')}</DialogTitle>
            </DialogHeader>
            <BankAccountForm
              initialData={selectedAccount}
              onSubmit={handleUpdateSubmit}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedAccount(null);
              }}
              loading={formLoading}
              title={t('form.title')}
              submitText={t('form.update')}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title={t('messages.deleteConfirmTitle')}
        description={t('messages.deleteConfirm', { name: selectedAccount?.accountHolderName || '' })}
        confirmText={tc('buttons.delete')}
        cancelText={tc('buttons.cancel')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedAccount(null);
        }}
        isLoading={formLoading}
      />
    </>
  );
};

