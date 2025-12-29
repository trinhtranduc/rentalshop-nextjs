'use client'

import React, { useState } from 'react';
import { Eye, EyeOff, Building2, Store } from 'lucide-react';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Button } from '../../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { SearchableSelect } from '../../../ui/searchable-select';
import { cn } from '@rentalshop/ui';
import type { User } from '@rentalshop/types';
import { useUsersTranslations } from '@rentalshop/hooks';

interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  type?: 'text' | 'email' | 'password';
  showPasswordToggle?: boolean;
}


export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  placeholder,
  type = 'text',
  showPasswordToggle = false
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {required && '*'}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          disabled={disabled}
          required={required}
        />
        {showPasswordToggle && type === 'password' && (
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            disabled={disabled}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

interface RoleSelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  currentUserRole?: string;
}

export const RoleSelect: React.FC<RoleSelectProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  currentUserRole
}) => {
  console.log('🔍 RoleSelect: Current value:', value, 'Type:', typeof value);
  console.log('🔍 RoleSelect: Current user role:', currentUserRole);
  console.log('🔍 RoleSelect: Available roles for current user:', currentUserRole === 'ADMIN' ? ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'] : ['OUTLET_ADMIN', 'OUTLET_STAFF']);
  
  return (
    <div className="space-y-2">
      <Label htmlFor="role">Role *</Label>
      <Select 
        value={value || undefined} 
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className={error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}>
          <SelectValue placeholder={value ? `Current: ${value}` : "Select role"} />
        </SelectTrigger>
        <SelectContent>
          {currentUserRole === 'ADMIN' && (
            <>
              <SelectItem value="ADMIN">System Admin</SelectItem>
              <SelectItem value="MERCHANT">Merchant</SelectItem>
            </>
          )}
          <SelectItem value="OUTLET_ADMIN">Outlet Admin</SelectItem>
          <SelectItem value="OUTLET_STAFF">Outlet Staff</SelectItem>
        </SelectContent>
      </Select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

interface MerchantSelectProps {
  value: string;
  onChange: (value: string) => void;
  merchants: any[];
  loading: boolean;
  error?: string;
  disabled?: boolean;
  canSelect: boolean;
  currentUser?: User | null;
  onSearch?: (query: string) => Promise<Array<{ value: string; label: string }>>;
}

export const MerchantSelect: React.FC<MerchantSelectProps> = ({
  value,
  onChange,
  merchants,
  loading,
  error,
  disabled = false,
  canSelect,
  currentUser,
  onSearch
}) => {
  const t = useUsersTranslations();
  
  // Convert merchants to SearchableOption format
  const merchantOptions = merchants.map(merchant => ({
    value: merchant.id.toString(),
    label: merchant.name
  }));
  
  // If onSearch is provided, use it for dynamic search, otherwise use static options
  const handleSearch = onSearch ? async (query: string) => {
    const results = await onSearch(query);
    return results.map(r => ({
      value: r.value,
      label: r.label,
      type: 'default' as const
    }));
  } : undefined;
  
  return (
    <div className="space-y-2">
      <Label htmlFor="merchant" className="flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        {t('fields.merchant')} {canSelect ? '*' : `(${t('fields.readOnly')})`}
      </Label>
      {canSelect ? (
        <SearchableSelect
          key={`merchant-${merchants.length}`}
          value={value ? Number(value) : undefined}
          onChange={(val) => onChange(val.toString())}
          options={onSearch ? undefined : merchantOptions}
          onSearch={handleSearch}
          placeholder={loading ? t('placeholders.loadingMerchants') : t('placeholders.searchAndSelectMerchant')}
          searchPlaceholder={t('placeholders.searchMerchants')}
          emptyText={t('placeholders.noMerchantsFound')}
          className={error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
        />
      ) : (
        <Input
          value={currentUser?.merchant?.name || ''}
          disabled
          className="bg-gray-50 text-gray-600 cursor-not-allowed"
          placeholder={t('placeholders.currentMerchant')}
        />
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

interface OutletSelectProps {
  value: string;
  onChange: (value: string) => void;
  outlets: any[];
  loading: boolean;
  error?: string;
  disabled?: boolean;
  canSelect: boolean;
  canSelectMerchant: boolean;
  merchantId: string;
  currentUser?: User | null;
}

export const OutletSelect: React.FC<OutletSelectProps> = ({
  value,
  onChange,
  outlets,
  loading,
  error,
  disabled = false,
  canSelect,
  canSelectMerchant,
  merchantId,
  currentUser
}) => {
  const t = useUsersTranslations();
  
  return (
    <div className="space-y-2">
      <Label htmlFor="outlet" className="flex items-center gap-2">
        <Store className="w-4 h-4" />
        {t('fields.outlet')} {canSelect ? '*' : `(${t('fields.readOnly')})`}
      </Label>
      {canSelect ? (
        <SearchableSelect
          key={`outlet-${outlets.length}-${merchantId}`}
          value={value ? Number(value) : undefined}
          onChange={(val) => onChange(val.toString())}
          options={outlets.map(outlet => ({
            value: outlet.id.toString(),
            label: outlet.name
          }))}
          placeholder={
            loading ? t('placeholders.loadingOutlets') : 
            !merchantId && canSelectMerchant ? t('placeholders.selectMerchantFirst') : 
            t('placeholders.searchAndSelectOutlet')
          }
          searchPlaceholder={t('placeholders.searchOutlets')}
          emptyText={t('placeholders.noOutletsFound')}
          className={error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
        />
      ) : (
        <Input
          value={currentUser?.outlet?.name || ''}
          disabled
          className="bg-gray-50 text-gray-600 cursor-not-allowed"
          placeholder={t('placeholders.currentOutlet')}
        />
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
