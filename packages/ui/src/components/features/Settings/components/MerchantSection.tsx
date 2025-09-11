'use client';

import React from 'react';
import { 
  Card, 
  CardContent,
  Button,
  Input,
  Label
} from '@rentalshop/ui';

// ============================================================================
// TYPES
// ============================================================================

export interface MerchantSectionProps {
  user: any;
  isEditing: boolean;
  isUpdating: boolean;
  formData: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    businessType: string;
    taxId: string;
  };
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// ============================================================================
// MERCHANT SECTION COMPONENT
// ============================================================================

export const MerchantSection: React.FC<MerchantSectionProps> = ({
  user,
  isEditing,
  isUpdating,
  formData,
  onEdit,
  onSave,
  onCancel,
  onInputChange
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Information</h2>
          <p className="text-gray-600">Manage your business details and settings</p>
        </div>
        {!isEditing ? (
          <div className="flex gap-2">
            <Button onClick={onEdit}>
              Edit Business Info
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={onSave} variant="default" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button onClick={onCancel} variant="outline" disabled={isUpdating}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          {!user?.merchant ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No business information available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="merchantName" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </Label>
                {isEditing ? (
                  <Input
                    id="merchantName"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={onInputChange}
                    placeholder="Enter business name"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.merchant?.name || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="merchantEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Email
                </Label>
                <div className="relative">
                  <Input
                    id="merchantEmail"
                    name="email"
                    type="email"
                    value={user?.merchant?.email || ''}
                    placeholder="Business email address"
                    disabled={true}
                    className="bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      Cannot be changed
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Business email addresses cannot be changed for security reasons
                </p>
              </div>

              <div>
                <Label htmlFor="merchantPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Phone
                </Label>
                {isEditing ? (
                  <Input
                    id="merchantPhone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={onInputChange}
                    placeholder="Enter business phone"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.merchant?.phone || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type
                </Label>
                {isEditing ? (
                  <Input
                    id="businessType"
                    name="businessType"
                    type="text"
                    value={formData.businessType}
                    onChange={onInputChange}
                    placeholder="Enter business type"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.merchant?.businessType || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID
                </Label>
                {isEditing ? (
                  <Input
                    id="taxId"
                    name="taxId"
                    type="text"
                    value={formData.taxId}
                    onChange={onInputChange}
                    placeholder="Enter tax ID"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.merchant?.taxId || 'Not provided'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="merchantAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address
                </Label>
                {isEditing ? (
                  <Input
                    id="merchantAddress"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={onInputChange}
                    placeholder="Enter business address"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.merchant?.address || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="merchantCity" className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </Label>
                {isEditing ? (
                  <Input
                    id="merchantCity"
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={onInputChange}
                    placeholder="Enter city"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.merchant?.city || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="merchantState" className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </Label>
                {isEditing ? (
                  <Input
                    id="merchantState"
                    name="state"
                    type="text"
                    value={formData.state}
                    onChange={onInputChange}
                    placeholder="Enter state"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.merchant?.state || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="merchantZipCode" className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </Label>
                {isEditing ? (
                  <Input
                    id="merchantZipCode"
                    name="zipCode"
                    type="text"
                    value={formData.zipCode}
                    onChange={onInputChange}
                    placeholder="Enter ZIP code"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.merchant?.zipCode || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="merchantCountry" className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </Label>
                {isEditing ? (
                  <Input
                    id="merchantCountry"
                    name="country"
                    type="text"
                    value={formData.country}
                    onChange={onInputChange}
                    placeholder="Enter country"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.merchant?.country || 'Not provided'}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
