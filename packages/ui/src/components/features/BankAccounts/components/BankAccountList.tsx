'use client';

import React from 'react';
import { BankAccountCard } from './BankAccountCard';
import { Button } from '../../../ui/button';
import { Plus } from 'lucide-react';
import { useBankAccountTranslations } from '@rentalshop/hooks';
import type { BankAccount } from '@rentalshop/utils';

interface BankAccountListProps {
  bankAccounts: BankAccount[];
  onAdd?: () => void;
  onEdit?: (account: BankAccount) => void;
  onDelete?: (account: BankAccount) => void;
  loading?: boolean;
  showAddButton?: boolean;
}

export const BankAccountList: React.FC<BankAccountListProps> = ({
  bankAccounts,
  onAdd,
  onEdit,
  onDelete,
  loading = false,
  showAddButton = true
}) => {
  const t = useBankAccountTranslations();
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (bankAccounts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('list.emptyTitle')}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {t('list.emptyDescription')}
          </p>
          {showAddButton && onAdd && (
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4 mr-2" />
              {t('list.addButton')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showAddButton && onAdd && (
        <div className="flex justify-end">
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 mr-2" />
            {t('list.addButton')}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.map((account) => (
          <BankAccountCard
            key={account.id}
            bankAccount={account}
            onEdit={onEdit}
            onDelete={onDelete}
            showActions={!!onEdit || !!onDelete}
          />
        ))}
      </div>
    </div>
  );
};

