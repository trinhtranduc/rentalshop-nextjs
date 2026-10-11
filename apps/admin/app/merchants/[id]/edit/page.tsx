'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,




  Button,
  Input,
  Textarea,
  Label,
  StatusBadge,
  useToast } from '@rentalshop/ui';
import { merchantsApi, formatInShopZone } from '@rentalshop/utils';
import { ArrowLeft, Save, Building2, MapPin, FileText, Info } from 'lucide-react';
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
  const { toastSuccess, toastError, removeToast } = useToast();
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

      if (result.success && result.data) {
        // API returns merchant data directly
        const merchantData = result.data;
        
        setMerchant(merchantData);
        setEditData({
          name: merchantData.name || '',
          email: merchantData.email || '',
          phone: merchantData.phone || '',
          address: merchantData.address || '',
          city: merchantData.city || '',
          state: merchantData.state || '',
          zipCode: merchantData.zipCode || '',
          country: merchantData.country || '',
          businessType: merchantData.businessType || '',
          taxId: merchantData.taxId || '',
          website: merchantData.website || '',
          description: merchantData.description || '',
          isActive: merchantData.isActive ?? true
        });
      } else {
        setError(result.message || 'Failed to fetch merchant details');
      }
    } catch (error) {
      console.error('Error fetching merchant details:', error);
      setError('Failed to fetch merchant details');
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Use centralized API client
      const result = await merchantsApi.updateMerchant(parseInt(merchantId), editData);

      if (result.success) {
        // Show success toast
        toastSuccess('Merchant updated', 'Changes saved successfully.');
        // Navigate back to merchant detail page
        router.push(`/merchants/${merchantId}`);
      } else {
        const msg = result.message || 'Failed to update merchant';
        setError(msg);
        toastError('Update failed', msg);
      }
    } catch (err) {
      console.error('Error updating merchant:', err);
      setError('Failed to update merchant');
      toastError('Update failed', err instanceof Error ? err.message : 'Unknown error');
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
      <PageWrapper className="admin-phone">
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
      <PageWrapper className="admin-phone">
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
      <PageWrapper className="admin-phone">
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
    <PageWrapper className="admin-phone">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 max-md:flex-wrap max-md:space-x-0 max-md:gap-3">
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
        <div className="space-y-4 max-md:pb-24">
          <section className="ar-form-section" aria-label="Business">
            <h3><Building2 className="w-4 h-4" /><span>Business</span></h3>
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
            </div>
          </section>

          <section className="ar-form-section" aria-label="Address">
            <h3><MapPin className="w-4 h-4" /><span>Address</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </section>

          <section className="ar-form-section" aria-label="Description & status">
            <h3><FileText className="w-4 h-4" /><span>Description & status</span></h3>
            <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
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
          </section>

          {/* Current Information Display */}
          <section className="ar-form-section" aria-label="Current information">
            <h3><Info className="w-4 h-4" /><span>Current Information</span></h3>
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-500">Created</Label>
                  <p>{formatInShopZone(merchant.createdAt, 'vi', { year: 'numeric', month: '2-digit', day: '2-digit' })} {formatInShopZone(merchant.createdAt, 'vi', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                </div>


              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="ar-form-actions max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:m-0 max-md:z-20">
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
