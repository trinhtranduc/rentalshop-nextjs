'use client';

import React, { useState, useEffect } from 'react';
import { getAuthToken } from '@rentalshop/utils';
import { useParams, useRouter } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
  Label,
  StatusBadge,
  ToastContainer,
  useToasts
} from '@rentalshop/ui';
import { merchantsApi } from '@rentalshop/utils';
import { ArrowLeft, Save, Building2 } from 'lucide-react';
import type { Merchant } from '@rentalshop/types';

interface MerchantEditData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  businessType: string;
  taxId: string;
  website: string;
  description?: string;
  isActive: boolean;
}

export default function EditMerchantPage() {
  const { toasts, showSuccess, showError, removeToast } = useToasts();
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;
  
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<MerchantEditData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    businessType: '',
    taxId: '',
    website: '',
    description: '',
    isActive: true
  });

  useEffect(() => {
    fetchMerchantData();
  }, [merchantId]);

  const fetchMerchantData = async () => {
    try {
      setLoading(true);
      
      // Use centralized API client
      const result = await merchantsApi.getMerchantDetail(parseInt(merchantId));

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMerchant(data.data.merchant);
          setEditData({
            name: data.data.merchant.name,
            email: data.data.merchant.email,
            phone: data.data.merchant.phone || '',
            address: data.data.merchant.address || '',
            city: data.data.merchant.city || '',
            state: data.data.merchant.state || '',
            zipCode: data.data.merchant.zipCode || '',
            country: data.data.merchant.country || '',
            businessType: data.data.merchant.businessType || '',
            taxId: data.data.merchant.taxId || '',
            website: data.data.merchant.website || '',
            description: data.data.merchant.description || '',
            isActive: data.data.merchant.isActive
          });
        } else {
          setError(data.message || 'Failed to fetch merchant details');
        }
      } else {
        console.error('Failed to fetch merchant details');
        // Fallback to mock data for now
      }
    } catch (error) {
      console.error('Error fetching merchant details:', error);
      setError('Failed to fetch merchant details');
      // Fallback to mock data for now
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Get auth token from localStorage
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token found');
        setError('Authentication required');
        return;
      }

      const response = await fetch(`http://localhost:3002/api/merchants/${merchantId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Show success toast
          showSuccess('Merchant updated', 'Changes saved successfully.');
          // Navigate back to merchant detail page
          router.push(`/merchants/${merchantId}`);
        } else {
          const msg = data.message || 'Failed to update merchant';
          setError(msg);
          showError('Update failed', msg);
        }
      } else {
        console.error('Failed to update merchant');
        setError('Failed to update merchant');
        showError('Update failed', 'Server returned an error.');
      }
    } catch (error) {
      console.error('Error updating merchant:', error);
      setError('Failed to update merchant');
      showError('Update failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/merchants/${merchantId}`);
  };

  const handleInputChange = (field: keyof MerchantEditData, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Edit Merchant</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8">Loading merchant details...</div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Edit Merchant</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8 text-red-500">Error: {error}</div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (!merchant) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Edit Merchant</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8">Merchant not found</div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/merchants/${merchantId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Merchant
            </Button>
            <PageTitle>Edit Merchant</PageTitle>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div className="space-y-6">
          {/* Merchant Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Merchant Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Business Name *</Label>
                    <Input
                      id="name"
                      value={editData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter business name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Business Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter business email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Business Phone</Label>
                    <Input
                      id="phone"
                      value={editData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter business phone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessType">Business Type</Label>
                    <Input
                      id="businessType"
                      value={editData.businessType}
                      onChange={(e) => handleInputChange('businessType', e.target.value)}
                      placeholder="Enter business type"
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxId">Tax ID</Label>
                    <Input
                      id="taxId"
                      value={editData.taxId}
                      onChange={(e) => handleInputChange('taxId', e.target.value)}
                      placeholder="Enter tax ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={editData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="Enter website URL"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Business Address</Label>
                    <Input
                      id="address"
                      value={editData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Enter business address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={editData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={editData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">Zip Code</Label>
                    <Input
                      id="zipCode"
                      value={editData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      placeholder="Enter zip code"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={editData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="Enter country"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Enter description"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={editData.isActive}
                      onChange={(e) => handleInputChange('isActive', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                  {editData.isActive ? (
                    <StatusBadge status="active" variant="default" />
                  ) : (
                    <StatusBadge status="inactive" variant="default" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Information Display */}
          <Card>
            <CardHeader>
              <CardTitle>Current Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-500">Created</Label>
                  <p>{new Date(merchant.createdAt).toLocaleString()}</p>
                </div>


              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </PageContent>
    </PageWrapper>
  );
}
