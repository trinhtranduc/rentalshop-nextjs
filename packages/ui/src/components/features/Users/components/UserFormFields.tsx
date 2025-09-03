'use client'

import React, { useState } from 'react';
import { Eye, EyeOff, Building2, Store } from 'lucide-react';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { SearchableSelect } from '../../../ui/searchable-select';
import type { User } from '@rentalshop/types';

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
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            disabled={disabled}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
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
}

export const RoleSelect: React.FC<RoleSelectProps> = ({
  value,
  onChange,
  error,
  disabled = false
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="role">Role *</Label>
      <Select 
        value={value} 
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className={error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}>
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="OUTLET_STAFF">Outlet Staff</SelectItem>
          <SelectItem value="OUTLET_ADMIN">Outlet Admin</SelectItem>
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
}

export const MerchantSelect: React.FC<MerchantSelectProps> = ({
  value,
  onChange,
  merchants,
  loading,
  error,
  disabled = false,
  canSelect,
  currentUser
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="merchant" className="flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        Merchant {canSelect ? '*' : '(Read-only)'}
      </Label>
      {canSelect ? (
        <SearchableSelect
          key={`merchant-${merchants.length}`}
          value={value ? Number(value) : undefined}
          onChange={(val) => onChange(val.toString())}
          options={merchants.map(merchant => ({
            value: merchant.id.toString(),
            label: merchant.name
          }))}
          placeholder={loading ? "Loading merchants..." : "Search and select merchant"}
          searchPlaceholder="Search merchants..."
          emptyText="No merchants found"
          className={error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
        />
      ) : (
        <Input
          value={currentUser?.merchant?.name || ''}
          disabled
          className="bg-gray-50 text-gray-600 cursor-not-allowed"
          placeholder="Current merchant"
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
  return (
    <div className="space-y-2">
      <Label htmlFor="outlet" className="flex items-center gap-2">
        <Store className="w-4 h-4" />
        Outlet {canSelect ? '*' : '(Read-only)'}
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
            loading ? "Loading outlets..." : 
            !merchantId && canSelectMerchant ? "Select merchant first" : 
            "Search and select outlet"
          }
          searchPlaceholder="Search outlets..."
          emptyText="No outlets found"
          className={error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
        />
      ) : (
        <Input
          value={currentUser?.outlet?.name || ''}
          disabled
          className="bg-gray-50 text-gray-600 cursor-not-allowed"
          placeholder="Current outlet"
        />
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
