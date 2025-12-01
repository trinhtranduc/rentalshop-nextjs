'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Edit, Trash2, CreditCard, Building2 } from 'lucide-react';
import { useToast } from '../../../ui/toast';
import { useBankAccountTranslations } from '@rentalshop/hooks';
import type { BankAccount } from '@rentalshop/utils';

interface BankAccountCardProps {
  bankAccount: BankAccount;
  onEdit?: (account: BankAccount) => void;
  onDelete?: (account: BankAccount) => void;
  showActions?: boolean;
}

export const BankAccountCard: React.FC<BankAccountCardProps> = ({
  bankAccount,
  onEdit,
  onDelete,
  showActions = true
}) => {
  const { toastSuccess } = useToast();
  const t = useBankAccountTranslations();

  const handleCopyAccountNumber = () => {
    navigator.clipboard.writeText(bankAccount.accountNumber);
    toastSuccess(t('card.copied'), t('card.accountNumberCopied'));
  };

  const handleCopyQRCode = () => {
    if (bankAccount.qrCode) {
      navigator.clipboard.writeText(bankAccount.qrCode);
      toastSuccess(t('card.copied'), t('card.qrCodeCopied'));
    }
  };

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5" />
              {bankAccount.accountHolderName}
            </CardTitle>
            {bankAccount.isDefault && (
              <Badge variant="default" className="mt-2">
                {t('card.default')}
              </Badge>
            )}
          </div>
          {showActions && (
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(bankAccount)}
                  className="h-8 w-8"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(bankAccount)}
                  className="h-8 w-8 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">{t('card.accountNumber')}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-base font-semibold">{bankAccount.accountNumber}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyAccountNumber}
                  className="h-6 w-6"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">{t('card.bank')}</p>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="w-4 h-4 text-gray-400" />
                <p className="text-base">{bankAccount.bankName}</p>
                {bankAccount.bankCode && (
                  <Badge variant="outline" className="ml-2">
                    {bankAccount.bankCode}
                  </Badge>
                )}
              </div>
            </div>

            {bankAccount.branch && (
              <div>
                <p className="text-sm text-gray-500">{t('card.branch')}</p>
                <p className="text-base mt-1">{bankAccount.branch}</p>
              </div>
            )}

            {bankAccount.notes && (
              <div>
                <p className="text-sm text-gray-500">{t('card.notes')}</p>
                <p className="text-sm mt-1 text-gray-600">{bankAccount.notes}</p>
              </div>
            )}
          </div>

            {bankAccount.qrCode && (
            <div className="flex flex-col items-center justify-center space-y-3 pt-4 md:pt-0 md:border-l md:border-gray-200 md:pl-6">
              <div className="p-4 bg-white rounded-lg border-2 border-gray-200 flex-shrink-0 w-fit mx-auto">
                  <QRCodeSVG
                    value={bankAccount.qrCode}
                    size={160}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyQRCode}
                className="w-full max-w-xs"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {t('card.copyQRCode')}
                </Button>
              <p className="text-xs text-gray-500 text-center max-w-xs px-4">
                  {t('card.scanQRHint')}
                </p>
            </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
};

