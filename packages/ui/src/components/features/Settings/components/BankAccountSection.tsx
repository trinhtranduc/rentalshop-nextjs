'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  BankAccountList,
  BankAccountForm,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ConfirmationDialog,
  Button,
  useToast,
} from '@rentalshop/ui';
import { bankAccountsApi, generateBankQRCodeData } from '@rentalshop/utils';
import { useAuth, useBankAccountTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { usePermissions } from '@rentalshop/hooks';
import { Plus } from 'lucide-react';
import type { BankAccount, BankAccountInput } from '@rentalshop/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface BankAccountSectionProps {
  user: any;
}

// ============================================================================
// BANK ACCOUNT SECTION COMPONENT
// ============================================================================

export const BankAccountSection: React.FC<BankAccountSectionProps> = ({
  user
}) => {
  const { toastSuccess, toastError } = useToast();
  const t = useBankAccountTranslations();
  const tc = useCommonTranslations();
  // ✅ Use permissions hook for UI control
  const { canManageBankAccounts, canViewBankAccounts, hasPermission, permissions } = usePermissions();
  
  // Debug logging for permissions
  console.log('🔍 BankAccountSection - User:', user);
  console.log('🔍 BankAccountSection - User role:', user?.role);
  console.log('🔍 BankAccountSection - Permissions:', permissions);
  console.log('🔍 BankAccountSection - Has bankAccounts.view:', hasPermission('bankAccounts.view'));
  console.log('🔍 BankAccountSection - Has bankAccounts.manage:', hasPermission('bankAccounts.manage'));
  console.log('🔍 BankAccountSection - canViewBankAccounts:', canViewBankAccounts);
  console.log('🔍 BankAccountSection - canManageBankAccounts:', canManageBankAccounts);
  
  // ✅ If user cannot view bank accounts, don't render anything
  if (!canViewBankAccounts) {
    console.warn('⚠️ BankAccountSection - User cannot view bank accounts, returning null');
    return null;
  }

  const outletId = user?.outlet?.id || user?.outletId || 0;
  const merchantId = user?.merchant?.id || user?.merchantId || 0;

  // Debug logging for IDs
  console.log('🔍 BankAccountSection - outletId:', outletId);
  console.log('🔍 BankAccountSection - merchantId:', merchantId);
  console.log('🔍 BankAccountSection - user.outlet:', user?.outlet);
  console.log('🔍 BankAccountSection - user.merchant:', user?.merchant);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch bank accounts
  const fetchBankAccounts = async () => {
    console.log('🔍 BankAccountSection - fetchBankAccounts called with:', { merchantId, outletId });
    
    if (!merchantId || !outletId) {
      console.warn('⚠️ BankAccountSection - Missing merchantId or outletId, cannot fetch bank accounts');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('📡 BankAccountSection - Fetching bank accounts from API...');
      const response = await bankAccountsApi.getBankAccounts(merchantId, outletId);
      console.log('📡 BankAccountSection - API response:', response);
      
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

  if (!outletId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">{t('messages.noOutlet')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4 pb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{t('title')}</h3>
            <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          <BankAccountList
            bankAccounts={bankAccounts}
            onAdd={canManageBankAccounts ? handleAdd : undefined}
            onEdit={canManageBankAccounts ? handleEdit : undefined}
            onDelete={canManageBankAccounts ? handleDelete : undefined}
            loading={loading}
            showAddButton={canManageBankAccounts}
          />
        </CardContent>
      </Card>

      {/* Add Dialog */}
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('form.editTitle')}</DialogTitle>
          </DialogHeader>
          {selectedAccount && (
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
          )}
        </DialogContent>
      </Dialog>

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
    </div>
  );
};

