'use client';

import React from 'react';
import { 
  Card, 
  CardHeader,
  CardContent,
  Button,
  Input,
  Label
} from '@rentalshop/ui';
import { useSettingsTranslations, usePermissions } from '@rentalshop/hooks';

// ============================================================================
// TYPES
// ============================================================================

export interface OutletSectionProps {
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
    description: string;
  };
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// ============================================================================
// OUTLET SECTION COMPONENT
// ============================================================================

export const OutletSection: React.FC<OutletSectionProps> = ({
  user,
  isEditing,
  isUpdating,
  formData,
  onEdit,
  onSave,
  onCancel,
  onInputChange
}) => {
  const t = useSettingsTranslations();
  // ✅ Use permissions hook to check if user can manage outlets
  const { canManageOutlets, hasPermission, permissions } = usePermissions();
  
  // Debug logging for permissions
  console.log('🔍 OutletSection - User:', user);
  console.log('🔍 OutletSection - User role:', user?.role);
  console.log('🔍 OutletSection - Permissions:', permissions);
  console.log('🔍 OutletSection - Has outlet.manage:', hasPermission('outlet.manage'));
  console.log('🔍 OutletSection - canManageOutlets:', canManageOutlets);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4 pb-3">
          <h3 className="text-base font-semibold text-gray-900">{t('outlet.outletInformation')}</h3>
          {/* ✅ Only show edit button if user can manage outlets */}
          {canManageOutlets && (
            !isEditing ? (
              <Button onClick={onEdit} size="sm">
                {t('outlet.edit')}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={onSave} variant="default" size="sm" disabled={isUpdating}>
                  {isUpdating ? t('outlet.saving') : t('outlet.save')}
                </Button>
                <Button onClick={onCancel} variant="outline" size="sm" disabled={isUpdating}>
                  {t('outlet.cancel')}
                </Button>
              </div>
            )
          )}
        </CardHeader>
        <CardContent className="p-6 pt-4">
          {!user?.outlet ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{t('outlet.noOutletInfo')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="outletName" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('outlet.name')}
                </Label>
                {isEditing && canManageOutlets ? (
                  <Input
                    id="outletName"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={onInputChange}
                    placeholder={t('outlet.enterOutletName')}
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.outlet?.name || t('outlet.notProvided')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="outletPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('outlet.phone')}
                </Label>
                {isEditing && canManageOutlets ? (
                  <Input
                    id="outletPhone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={onInputChange}
                    placeholder={t('outlet.enterOutletPhone')}
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.outlet?.phone || t('outlet.notProvided')}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="outletAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('outlet.address')}
                </Label>
                {isEditing && canManageOutlets ? (
                  <Input
                    id="outletAddress"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={onInputChange}
                    placeholder={t('outlet.enterOutletAddress')}
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.outlet?.address || t('outlet.notProvided')}
                  </p>
                )}
              </div>

              {/* City, State, ZIP Code - In one row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-2">
                <div>
                  <Label htmlFor="outletCity" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('outlet.city') || 'City'}
                  </Label>
                  {isEditing && canManageOutlets ? (
                    <Input
                      id="outletCity"
                      name="city"
                      type="text"
                      value={formData.city}
                      onChange={onInputChange}
                      placeholder={t('outlet.enterCity') || 'Enter city'}
                    />
                  ) : (
                    <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                      {user?.outlet?.city || t('outlet.notProvided')}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="outletState" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('outlet.state') || 'State/Province'}
                  </Label>
                  {isEditing && canManageOutlets ? (
                    <Input
                      id="outletState"
                      name="state"
                      type="text"
                      value={formData.state}
                      onChange={onInputChange}
                      placeholder={t('outlet.enterState') || 'Enter state'}
                    />
                  ) : (
                    <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                      {user?.outlet?.state || t('outlet.notProvided')}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="outletZipCode" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('outlet.zipCode') || 'ZIP/Postal Code'}
                  </Label>
                  {isEditing && canManageOutlets ? (
                    <Input
                      id="outletZipCode"
                      name="zipCode"
                      type="text"
                      value={formData.zipCode}
                      onChange={onInputChange}
                      placeholder={t('outlet.enterZipCode') || 'Enter ZIP code'}
                    />
                  ) : (
                    <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                      {user?.outlet?.zipCode || t('outlet.notProvided')}
                    </p>
                  )}
                </div>
              </div>

              {/* Country */}
              <div className="md:col-span-2">
                <Label htmlFor="outletCountry" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('outlet.country') || 'Country'}
                </Label>
                {isEditing && canManageOutlets ? (
                  <Input
                    id="outletCountry"
                    name="country"
                    type="text"
                    value={formData.country}
                    onChange={onInputChange}
                    placeholder={t('outlet.enterCountry') || 'Enter country'}
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.outlet?.country || t('outlet.notProvided')}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="outletDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('outlet.description')}
                </Label>
                {isEditing && canManageOutlets ? (
                  <Input
                    id="outletDescription"
                    name="description"
                    type="text"
                    value={formData.description}
                    onChange={onInputChange}
                    placeholder={t('outlet.enterDescription')}
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.outlet?.description || t('outlet.notProvided')}
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
