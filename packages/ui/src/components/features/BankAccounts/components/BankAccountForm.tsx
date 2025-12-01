'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Switch } from '../../../ui/switch';
import { SearchableSelect, type SearchableOption } from '../../../ui/searchable-select';
import { getBankCode, VIETNAM_BANK_CODES } from '@rentalshop/utils';
import { useBankAccountTranslations, useCommonTranslations } from '@rentalshop/hooks';
import type { BankAccountInput } from '@rentalshop/utils';

interface BankAccountFormProps {
  initialData?: Partial<BankAccountInput & { id?: number }>;
  onSubmit: (data: BankAccountInput) => void;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
  submitText?: string;
  errorMessage?: string;
}

// Convert bank names to SearchableOption format
const getBankOptions = (): SearchableOption[] => {
  return Object.keys(VIETNAM_BANK_CODES)
    .sort()
    .map((bankName, index) => ({
      value: String(index), // Use index as value for SearchableSelect
      label: bankName,
      type: 'default' as const,
    }));
};

// Map to store bank name by index
const BANK_NAME_BY_INDEX = Object.keys(VIETNAM_BANK_CODES).sort().reduce((acc, bankName, index) => {
  acc[index] = bankName;
  return acc;
}, {} as Record<number, string>);

// Map to store index by bank name
const INDEX_BY_BANK_NAME = Object.keys(VIETNAM_BANK_CODES).sort().reduce((acc, bankName, index) => {
  acc[bankName] = index;
  return acc;
}, {} as Record<string, number>);

export const BankAccountForm: React.FC<BankAccountFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  title,
  submitText,
  errorMessage
}) => {
  const t = useBankAccountTranslations();
  const tc = useCommonTranslations();
  
  const [formData, setFormData] = useState<BankAccountInput>({
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    bankCode: '',
    branch: '',
    isDefault: false,
    notes: '',
    ...initialData
  });

  const [errors, setErrors] = useState<Partial<Record<keyof BankAccountInput, string>>>({});

  // Get bank options as SearchableOption[]
  const bankOptions = useMemo(() => getBankOptions(), []);

  // Get current bank index from bank name
  const currentBankIndex = useMemo(() => {
    if (formData.bankName) {
      return INDEX_BY_BANK_NAME[formData.bankName] ?? undefined;
    }
    return undefined;
  }, [formData.bankName]);

  // Use useMemo to create stable reference for initialData comparison
  const initialDataKey = useMemo(() => {
    if (!initialData || !initialData.id) return 'new';
    return `edit-${initialData.id}`;
  }, [initialData?.id]);

  // Only update form data when initialData actually changes (by ID)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData({
        accountHolderName: initialData.accountHolderName || '',
        accountNumber: initialData.accountNumber || '',
        bankName: initialData.bankName || '',
        bankCode: initialData.bankCode || '',
        branch: initialData.branch || '',
        isDefault: initialData.isDefault || false,
        notes: initialData.notes || '',
      });
    } else {
      // Reset form when no initialData (add mode)
      setFormData({
        accountHolderName: '',
        accountNumber: '',
        bankName: '',
        bankCode: '',
        branch: '',
        isDefault: false,
        notes: '',
      });
    }
  }, [initialDataKey]); // Only depend on the key, not the whole object

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof BankAccountInput, string>> = {};

    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = t('form.errors.accountHolderNameRequired');
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = t('form.errors.accountNumberRequired');
    } else if (!/^\d{8,16}$/.test(formData.accountNumber)) {
      newErrors.accountNumber = t('form.errors.accountNumberInvalid');
    }

    if (!formData.bankName.trim()) {
      newErrors.bankName = t('form.errors.bankNameRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof BankAccountInput, value: any) => {
    // Auto-fill bank code when bank name changes
    if (field === 'bankName' && value) {
      const bankCode = getBankCode(value);
      setFormData((prev: BankAccountInput) => ({ 
        ...prev, 
        [field]: value,
        bankCode 
      }));
    } else {
      setFormData((prev: BankAccountInput) => ({ ...prev, [field]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev: Partial<Record<keyof BankAccountInput, string>>) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {errorMessage}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{title || t('form.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountHolderName">
                {t('form.accountHolderName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="accountHolderName"
                value={formData.accountHolderName}
                onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                placeholder={t('form.accountHolderNamePlaceholder')}
                className={errors.accountHolderName ? 'border-red-500' : ''}
              />
              {errors.accountHolderName && (
                <p className="text-sm text-red-500">{errors.accountHolderName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">
                {t('form.accountNumber')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="accountNumber"
                value={formData.accountNumber}
                onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                placeholder={t('form.accountNumberPlaceholder')}
                className={errors.accountNumber ? 'border-red-500' : ''}
              />
              {errors.accountNumber && (
                <p className="text-sm text-red-500">{errors.accountNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">
                {t('form.bankName')} <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                value={currentBankIndex}
                onChange={(index) => {
                  const bankName = BANK_NAME_BY_INDEX[index];
                  if (bankName) {
                    handleInputChange('bankName', bankName);
                  }
                }}
                options={bankOptions}
                placeholder={t('form.bankNamePlaceholder')}
                searchPlaceholder={t('form.bankNamePlaceholder') || 'Tìm kiếm ngân hàng...'}
                emptyText={t('form.errors.bankNameRequired') || 'Không tìm thấy ngân hàng'}
                className={errors.bankName ? 'border-red-500' : ''}
              />
              {errors.bankName && (
                <p className="text-sm text-red-500">{errors.bankName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankCode">{t('form.bankCode')}</Label>
              <Input
                id="bankCode"
                value={formData.bankCode || ''}
                onChange={(e) => handleInputChange('bankCode', e.target.value)}
                placeholder={t('form.bankCodePlaceholder')}
                readOnly
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">{t('form.branch')}</Label>
              <Input
                id="branch"
                value={formData.branch || ''}
                onChange={(e) => handleInputChange('branch', e.target.value)}
                placeholder={t('form.branchPlaceholder')}
              />
            </div>

            <div className="space-y-2 flex items-center">
              <Switch
                id="isDefault"
                checked={formData.isDefault || false}
                onCheckedChange={(checked) => handleInputChange('isDefault', checked)}
              />
              <Label htmlFor="isDefault" className="ml-2 cursor-pointer">
                {t('form.isDefault')}
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('form.notes')}</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder={t('form.notesPlaceholder')}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {tc('buttons.cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? t('form.saving') : (submitText || t('form.submit'))}
        </Button>
      </div>
    </form>
  );
};

