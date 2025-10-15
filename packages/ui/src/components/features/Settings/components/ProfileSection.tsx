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

// ============================================================================
// TYPES
// ============================================================================

export interface ProfileSectionProps {
  user: any;
  isEditing: boolean;
  isUpdating: boolean;
  formData: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// ============================================================================
// PROFILE SECTION COMPONENT
// ============================================================================

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  user,
  isEditing,
  isUpdating,
  formData,
  onEdit,
  onSave,
  onCancel,
  onInputChange
}) => {
  // Debug logging
  console.log('🔍 ProfileSection render - user:', user);
  console.log('🔍 ProfileSection render - user details:', {
    'user.id': user?.id,
    'user.email': user?.email,
    'user.firstName': user?.firstName,
    'user.lastName': user?.lastName,
    'user.phone': user?.phone,
    'user.role': user?.role
  });
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4 pb-3">
          <h3 className="text-base font-semibold text-gray-900">Personal Information</h3>
          {!isEditing ? (
            <Button onClick={onEdit} size="sm">
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={onSave} variant="default" size="sm" disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save'}
              </Button>
              <Button onClick={onCancel} variant="outline" size="sm" disabled={isUpdating}>
                Cancel
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6 pt-4">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </Label>
                {isEditing ? (
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={onInputChange}
                    placeholder="Enter your first name"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.firstName || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </Label>
                {isEditing ? (
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={onInputChange}
                    placeholder="Enter your last name"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.lastName || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={user?.email || ''}
                    placeholder="Email address"
                    disabled={true}
                    className="bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={onInputChange}
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.phone || 'Not provided'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </Label>
                <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
