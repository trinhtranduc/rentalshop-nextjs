'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Card,
  CardContent,
} from '../../../ui';
import { QRCodeSVG } from 'qrcode.react';
import { Copy } from 'lucide-react';
import { useOrderTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { useToast } from '../../../ui/toast';
import { useFormatCurrency } from '@rentalshop/ui';
// @ts-ignore - TypeScript may not recognize the export yet
import { generateVietQRString } from '@rentalshop/utils';
// @ts-ignore - TypeScript may not recognize the export yet  
import type { BankAccountReference } from '@rentalshop/types';

interface PaymentQRCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccount: BankAccountReference;
  amount: number;
  orderNumber: string;
}

export const PaymentQRCodeDialog: React.FC<PaymentQRCodeDialogProps> = ({
  isOpen,
  onClose,
  bankAccount,
  amount,
  orderNumber,
}) => {
  const t = useOrderTranslations();
  const tc = useCommonTranslations();
  const { toastSuccess } = useToast();
  const formatCurrency = useFormatCurrency();

  const transferDescription = t('payment.transferDescription', { orderNumber });

  // Generate VietQR EMV QR Code string
  // Only include amount in QR code if it's greater than 0
  const qrCodeString = React.useMemo(() => {
    try {
      return generateVietQRString(
        {
          accountNumber: bankAccount.accountNumber,
          accountHolderName: bankAccount.accountHolderName,
          bankName: bankAccount.bankName,
          bankCode: bankAccount.bankCode,
        },
        amount > 0 ? amount : undefined, // Only include amount if > 0
        transferDescription
      );
    } catch (error) {
      console.error('Error generating VietQR string:', error);
      return null;
    }
  }, [bankAccount, amount, transferDescription]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toastSuccess(tc('common.copied'), label);
  };

  // Show error message if QR code generation failed
  if (!qrCodeString) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('payment.qrCodeTitle')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center py-8">
              <p className="text-sm text-red-600 mb-2">
                {t('payment.qrCodeError') || 'Không thể tạo QR code. Vui lòng thử lại sau.'}
              </p>
              <p className="text-xs text-gray-500">
                {t('payment.bankSupportNote')}
              </p>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={onClose} variant="outline">
                {tc('buttons.close')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('payment.qrCodeTitle')}</DialogTitle>
        </DialogHeader>
        
        {/* Two Column Layout: QR Code Left, Info Right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column: QR Code */}
          <div className="flex flex-col items-center justify-start">
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
              <QRCodeSVG
                value={qrCodeString}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>

          {/* Right Column: Bank Account Information */}
          <div className="flex flex-col space-y-3">
            {/* Bank Name */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500 font-medium">
                {t('payment.bankName')}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-900 font-medium">{bankAccount.bankName}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleCopy(bankAccount.bankName, t('payment.bankName'))}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Account Number */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500 font-medium">
                {t('payment.accountNumber')}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-900 font-mono">{bankAccount.accountNumber}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleCopy(bankAccount.accountNumber, t('payment.accountNumber'))}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Account Holder Name */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500 font-medium">
                {t('payment.accountHolderName')}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-900 break-words">{bankAccount.accountHolderName}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 flex-shrink-0"
                  onClick={() => handleCopy(bankAccount.accountHolderName, t('payment.accountHolderName'))}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Amount (only show if > 0) */}
            {amount > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-medium">
                  {t('payment.amount')}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-900 font-semibold">
                    {formatCurrency(amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleCopy(amount.toString(), t('payment.amount'))}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Transfer Description */}
            {transferDescription && (
              <div className="flex flex-col gap-1 pt-2 border-t border-gray-200">
                <span className="text-xs text-gray-500 font-medium">
                  {t('payment.content')}
                </span>
                <div className="flex items-start gap-1.5">
                  <span className="text-sm text-gray-900 break-words flex-1">
                    {transferDescription}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 flex-shrink-0"
                    onClick={() => handleCopy(transferDescription, t('payment.content'))}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Bank Support Note */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 italic">
                {t('payment.bankSupportNote')}
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg mt-4">
          <p className="font-medium mb-3 text-gray-900">{t('payment.qrCodeInstructions')}</p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>{t('payment.qrCodeStep1')}</li>
            <li>{t('payment.qrCodeStep2')}</li>
            <li>{t('payment.qrCodeStep3')}</li>
          </ol>
          <div className="mt-4 pt-3 border-t border-blue-200">
            <p className="text-xs text-gray-600 italic">
              ⚠️ {t('payment.qrCodeNote')}
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-4">
          <Button onClick={onClose} variant="outline">
            {tc('buttons.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

