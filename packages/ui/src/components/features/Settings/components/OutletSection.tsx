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
import { useSettingsTranslations } from '@rentalshop/hooks';

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
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4 pb-3">
          <h3 className="text-base font-semibold text-gray-900">{t('outlet.outletInformation')}</h3>
          {!isEditing ? (
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
                {isEditing ? (
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
                {isEditing ? (
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
                {isEditing ? (
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

              <div className="md:col-span-2">
                <Label htmlFor="outletDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('outlet.description')}
                </Label>
                {isEditing ? (
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
