'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardHeader,
  CardContent,
  Button,
  Input,
  Label,
  Badge,
  SearchableCountrySelect
} from '@rentalshop/ui';
import { CheckCircle2, Copy, Share2, ExternalLink } from 'lucide-react';
import { merchantsApi } from '@rentalshop/utils';
import { useLocale } from 'next-intl';
import { 
  getBusinessTypeDescription, 
  getPricingTypeDescription,
  COUNTRIES
} from '@rentalshop/constants';
import type { BusinessType, PricingType } from '@rentalshop/constants/src/pricing';
import type { CurrencyCode } from '@rentalshop/types';
import { useSettingsTranslations } from '@rentalshop/hooks';

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
  currentCurrency: CurrencyCode;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCurrencyChange: (currency: CurrencyCode) => Promise<void>;
}

// ============================================================================
// MERCHANT SECTION COMPONENT
// ============================================================================

export const MerchantSection: React.FC<MerchantSectionProps> = ({
  user,
  isEditing,
  isUpdating,
  formData,
  currentCurrency,
  onEdit,
  onSave,
  onCancel,
  onInputChange,
  onCurrencyChange
}) => {
  const t = useSettingsTranslations();
  const locale = useLocale() as 'en' | 'vi';
  const [merchantData, setMerchantData] = useState<any>(null);
  const [loadingMerchant, setLoadingMerchant] = useState(false);
  const [copied, setCopied] = useState(false);
  const fetchingRef = useRef(false);
  const currencyUpdateRef = useRef<string | null>(null); // Track last currency update to prevent loops
  
  // Auto-set currency based on language
  // EN → USD, VI → VND
  const getCurrencyForLocale = (locale: string): CurrencyCode => {
    return locale === 'vi' ? 'VND' : 'USD';
  };
  
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
  
  // Auto-update currency when locale changes
  useEffect(() => {
    if (!merchant) return; // Wait for merchant data
    
    const targetCurrency = getCurrencyForLocale(locale);
    const updateKey = `${locale}-${targetCurrency}`;
    
    // Prevent duplicate updates for the same locale-currency combination
    if (currencyUpdateRef.current === updateKey) return;
    
    // Only update if currency doesn't match locale
    if (currentCurrency !== targetCurrency) {
      console.log(`🌍 Auto-updating currency: ${currentCurrency} → ${targetCurrency} (locale: ${locale})`);
      currencyUpdateRef.current = updateKey;
      
      onCurrencyChange(targetCurrency)
        .then(() => {
          console.log(`✅ Currency updated to ${targetCurrency}`);
        })
        .catch(error => {
          console.error('Failed to auto-update currency:', error);
          currencyUpdateRef.current = null; // Reset on error to allow retry
        });
    } else {
      // Currency already matches locale, update ref to prevent unnecessary updates
      currencyUpdateRef.current = updateKey;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, merchant, currentCurrency]); // Include currentCurrency to avoid stale closure
  
  // Get public product link
  const getPublicProductLink = () => {
    if (!merchant?.tenantKey) return null;
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_CLIENT_URL || 'https://dev.anyrent.shop';
    return `${baseUrl}/${merchant.tenantKey}/products`;
  };
  
  const publicProductLink = getPublicProductLink();
  
  // Copy link to clipboard
  const handleCopyLink = async () => {
    if (!publicProductLink) return;
    try {
      await navigator.clipboard.writeText(publicProductLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };
  
  // Share link
  const handleShareLink = async () => {
    if (!publicProductLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${merchant?.name || 'Store'} - Products`,
          text: `Check out products from ${merchant?.name || 'our store'}`,
          url: publicProductLink
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback to copy
      handleCopyLink();
    }
  };
  
  
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4 pb-3">
          <h3 className="text-base font-semibold text-gray-900">{t('merchant.businessInformation')}</h3>
          {!isEditing ? (
            <Button onClick={onEdit} size="sm">
              {t('merchant.edit')}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={onSave} variant="default" size="sm" disabled={isUpdating}>
                {isUpdating ? t('merchant.saving') : t('merchant.save')}
              </Button>
              <Button onClick={onCancel} variant="outline" size="sm" disabled={isUpdating}>
                {t('merchant.cancel')}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6 pt-4">
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
                  {t('merchant.name')}
                </Label>
                {isEditing ? (
                  <Input
                    id="merchantName"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={onInputChange}
                    placeholder={t('merchant.enterBusinessName')}
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {merchant?.name || t('merchant.notProvided')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="merchantEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('merchant.email')}
                </Label>
                <div className="relative">
                  <Input
                    id="merchantEmail"
                    name="email"
                    type="email"
                    value={merchant?.email || ''}
                    placeholder={t('merchant.email')}
                    disabled={true}
                    className="bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('merchant.taxId')}
                </Label>
                {isEditing ? (
                  <Input
                    id="taxId"
                    name="taxId"
                    type="text"
                    value={formData.taxId}
                    onChange={onInputChange}
                    placeholder={t('merchant.enterTaxId')}
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {merchant?.taxId || t('merchant.notProvided')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="merchantPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('merchant.phone')}
                </Label>
                {isEditing ? (
                  <Input
                    id="merchantPhone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={onInputChange}
                    placeholder={t('merchant.enterPhone')}
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {merchant?.phone || t('merchant.notProvided')}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('merchant.businessType')}
                    </Label>
                    <div className="relative">
                      <Input
                        id="businessType"
                        name="businessType"
                        type="text"
                        value={merchant?.businessType || t('merchant.notProvided')}
                        placeholder={t('merchant.businessType')}
                        disabled={true}
                        className="bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                <p className="text-xs text-gray-500 mt-1">
                  {merchant?.businessType ? getBusinessTypeDescription(merchant.businessType as BusinessType) : t('merchant.businessType')}
                </p>
                  </div>

                  <div>
                    <Label htmlFor="pricingType" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('merchant.pricingType')}
                    </Label>
                    <div className="relative">
                      <Input
                        id="pricingType"
                        name="pricingType"
                        type="text"
                        value={merchant?.pricingType || t('merchant.notProvided')}
                        placeholder={t('merchant.pricingType')}
                        disabled={true}
                        className="bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                <p className="text-xs text-gray-500 mt-1">
                  {merchant?.pricingType ? getPricingTypeDescription(merchant.pricingType as PricingType) : t('merchant.pricingType')}
                </p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="merchantAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('merchant.address')}
                </Label>
                {isEditing ? (
                  <Input
                    id="merchantAddress"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={onInputChange}
                    placeholder={t('merchant.enterAddress')}
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {merchant?.address || t('merchant.notProvided')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="merchantCity" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('merchant.city')}
                </Label>
                {isEditing ? (
                  <Input
                    id="merchantCity"
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={onInputChange}
                    placeholder={t('merchant.enterCity')}
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {merchant?.city || t('merchant.notProvided')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="merchantState" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('merchant.state')}
                </Label>
                {isEditing ? (
                  <Input
                    id="merchantState"
                    name="state"
                    type="text"
                    value={formData.state}
                    onChange={onInputChange}
                    placeholder={t('merchant.enterState')}
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {merchant?.state || t('merchant.notProvided')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="merchantZipCode" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('merchant.zipCode')}
                </Label>
                {isEditing ? (
                  <Input
                    id="merchantZipCode"
                    name="zipCode"
                    type="text"
                    value={formData.zipCode}
                    onChange={onInputChange}
                    placeholder={t('merchant.enterZipCode')}
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {merchant?.zipCode || t('merchant.notProvided')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="merchantCountry" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('merchant.country')}
                </Label>
                {isEditing ? (
                  <SearchableCountrySelect
                    options={COUNTRIES}
                    value={formData.country}
                    onChange={(countryName) => {
                      console.log('🌍 MerchantSection: Country onChange called with:', countryName);
                      console.log('🌍 MerchantSection: Current formData.country:', formData.country);
                      // Trigger parent's onChange handler with synthetic event
                      onInputChange({ 
                        target: { name: 'country', value: countryName } 
                      } as React.ChangeEvent<HTMLInputElement>);
                      console.log('🌍 MerchantSection: onInputChange called');
                    }}
                    placeholder="Type to search countries..."
                    emptyMessage="No countries found"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md flex items-center gap-2">
                    {merchant?.country ? (
                      <>
                        {COUNTRIES.find(c => c.name === merchant.country)?.flag || ''}
                        {merchant.country}
                      </>
                    ) : (
                      t('merchant.notProvided')
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Public Product Link Card */}
      {merchant?.tenantKey && (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
              <ExternalLink className="h-5 w-5 text-blue-700" />
              <h3 className="text-lg font-semibold text-gray-900">{t('merchant.publicProductLink')}</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
              {t('merchant.publicProductLinkDesc')}
          </p>

            <div className="space-y-4">
              {/* Link Display */}
              <div className="flex items-center gap-2">
                <Input
                  value={publicProductLink || ''}
                  readOnly
                  className="flex-1 bg-gray-50 text-gray-900 font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-10 whitespace-nowrap"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t('merchant.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      {t('merchant.copy')}
                    </>
                  )}
                </Button>
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareLink}
                    className="h-10"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    {t('merchant.share')}
                  </Button>
                    )}
                  </div>

              {/* Preview Link */}
              <div className="pt-4 border-t border-gray-200">
                <a
                  href={publicProductLink || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('merchant.viewPublicPage')}
                </a>
                    </div>
                  </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
};
