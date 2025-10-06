'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent,
  Button,
  Input,
  Label
} from '@rentalshop/ui';
import { merchantsApi } from '@rentalshop/utils';
import { 
  getBusinessTypeDescription, 
  getPricingTypeDescription
} from '@rentalshop/constants';
import type { BusinessType, PricingType } from '@rentalshop/constants/src/pricing';

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
    pricingType: string;
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
  const [merchantData, setMerchantData] = useState<any>(null);
  const [loadingMerchant, setLoadingMerchant] = useState(false);
  const fetchingRef = useRef(false);
  
  // Debug logging
  console.log('🔍 MerchantSection render - user:', user);
  console.log('🔍 MerchantSection render - user.merchant:', user?.merchant);
  console.log('🔍 MerchantSection render - user.merchantId:', user?.merchantId);
  console.log('🔍 MerchantSection render - user role:', user?.role);
  console.log('🔍 MerchantSection render - loadingMerchant:', loadingMerchant);
  console.log('🔍 MerchantSection render - fetchingRef.current:', fetchingRef.current);
  
  // Fetch merchant data if user has merchantId but no full merchant object
  useEffect(() => {
    const fetchMerchantData = async () => {
      // Prevent infinite loops by checking if we're already fetching
      if (user?.merchantId && !user?.merchant && !fetchingRef.current) {
        console.log('🔄 Fetching merchant data for merchantId:', user.merchantId);
        fetchingRef.current = true;
        setLoadingMerchant(true);
        
        try {
          const result = await merchantsApi.getMerchantById(user.merchantId);
          console.log('🔍 Merchant API response:', result);
          
          if (result.success && result.data) {
            // Handle nested structure: result.data.merchant or direct result.data
            const merchantInfo = (result.data as any).merchant || result.data;
            console.log('✅ Merchant data extracted:', merchantInfo);
            setMerchantData(merchantInfo);
          } else {
            console.error('❌ Failed to fetch merchant data:', result);
          }
        } catch (error) {
          console.error('💥 Error fetching merchant data:', error);
        } finally {
          setLoadingMerchant(false);
          fetchingRef.current = false;
        }
      }
    };
    
    fetchMerchantData();
    
    // Cleanup function to reset fetching ref
    return () => {
      fetchingRef.current = false;
    };
  }, [user?.merchantId, user?.merchant]); // Removed loadingMerchant from dependencies
  
  // Use merchant data from user object or fetched data
  const merchant = user?.merchant || merchantData;
  
  // Debug merchant data
  console.log('🔍 MerchantSection - Final merchant data:', {
    'user.merchant': user?.merchant,
    'merchantData': merchantData,
    'final merchant': merchant,
    'merchant.name': merchant?.name,
    'merchant.email': merchant?.email,
    'merchant.phone': merchant?.phone,
    'merchant.businessType': merchant?.businessType
  });
  
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
          {loadingMerchant ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading business information...</p>
            </div>
          ) : !merchant && !user?.merchantId ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No business information available</p>
              <p className="text-gray-400 text-sm mt-2">
                User role: {user?.role || 'Unknown'} | 
                Has merchantId: {user?.merchantId ? 'Yes' : 'No'} | 
                Has merchant object: {user?.merchant ? 'Yes' : 'No'} |
                Fetched merchant: {merchantData ? 'Yes' : 'No'}
              </p>
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
                    {merchant?.name || 'Not provided'}
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
                    value={merchant?.email || ''}
                    placeholder="Business email address"
                    disabled={true}
                    className="bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
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
                    {merchant?.taxId || 'Not provided'}
                  </p>
                )}
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
                    {merchant?.phone || 'Not provided'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
                      Business Type
                    </Label>
                    <div className="relative">
                      <Input
                        id="businessType"
                        name="businessType"
                        type="text"
                        value={merchant?.businessType || 'Not provided'}
                        placeholder="Business type"
                        disabled={true}
                        className="bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                <p className="text-xs text-gray-500 mt-1">
                  {merchant?.businessType ? getBusinessTypeDescription(merchant.businessType as BusinessType) : 'Business type description'}
                </p>
                  </div>

                  <div>
                    <Label htmlFor="pricingType" className="block text-sm font-medium text-gray-700 mb-2">
                      Pricing Type
                    </Label>
                    <div className="relative">
                      <Input
                        id="pricingType"
                        name="pricingType"
                        type="text"
                        value={merchant?.pricingType || 'Not provided'}
                        placeholder="Pricing type"
                        disabled={true}
                        className="bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                <p className="text-xs text-gray-500 mt-1">
                  {merchant?.pricingType ? getPricingTypeDescription(merchant.pricingType as PricingType) : 'Pricing type description'}
                </p>
                  </div>
                </div>
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
                    {merchant?.address || 'Not provided'}
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
                    {merchant?.city || 'Not provided'}
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
                    {merchant?.state || 'Not provided'}
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
                    {merchant?.zipCode || 'Not provided'}
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
                    {merchant?.country || 'Not provided'}
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
