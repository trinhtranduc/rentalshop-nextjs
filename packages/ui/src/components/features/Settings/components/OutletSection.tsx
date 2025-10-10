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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Outlet Information</h2>
          <p className="text-gray-600">Manage your outlet details and settings</p>
        </div>
        {!isEditing ? (
          <Button onClick={onEdit}>
            Edit Outlet Info
          </Button>
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
          {!user?.outlet ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No outlet information available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="outletName" className="block text-sm font-medium text-gray-700 mb-2">
                  Outlet Name
                </Label>
                {isEditing ? (
                  <Input
                    id="outletName"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={onInputChange}
                    placeholder="Enter outlet name"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.outlet?.name || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="outletPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Outlet Phone
                </Label>
                {isEditing ? (
                  <Input
                    id="outletPhone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={onInputChange}
                    placeholder="Enter outlet phone"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.outlet?.phone || 'Not provided'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="outletAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Outlet Address
                </Label>
                {isEditing ? (
                  <Input
                    id="outletAddress"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={onInputChange}
                    placeholder="Enter outlet address"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.outlet?.address || 'Not provided'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="outletDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </Label>
                {isEditing ? (
                  <Input
                    id="outletDescription"
                    name="description"
                    type="text"
                    value={formData.description}
                    onChange={onInputChange}
                    placeholder="Enter outlet description"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.outlet?.description || 'Not provided'}
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
