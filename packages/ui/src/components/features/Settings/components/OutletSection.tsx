'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardHeader,
  CardContent,
  Button,
  Input,
  Label
} from '@rentalshop/ui';
import { CheckCircle2, Copy, Users, ExternalLink } from 'lucide-react';
// ❌ REMOVED: merchantsApi import - no longer needed
// tenantKey is now available from user.outlet.merchant.tenantKey (from login response)
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
  
  // Get tenantKey from outlet.merchant.tenantKey (no need to fetch merchant detail)
  // Priority: user.outlet.merchant.tenantKey > user.merchant.tenantKey > fetch merchant detail
  const getTenantKeyFromOutlet = () => {
    // First try: Get from outlet.merchant.tenantKey (from outlet response)
    if (user?.outlet?.merchant?.tenantKey) {
      return user.outlet.merchant.tenantKey;
    }
    // Second try: Get from user.merchant.tenantKey (from user object)
    if (user?.merchant?.tenantKey) {
      return user.merchant.tenantKey;
    }
    return null;
  };

  const tenantKey = getTenantKeyFromOutlet();
  
  // ❌ REMOVED: No longer fetch merchant detail API
  // tenantKey is now available from user.outlet.merchant.tenantKey (from login response)
  // This eliminates unnecessary API call to /api/merchants/[id]
  
  const [copiedReferralCode, setCopiedReferralCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Get merchant object with tenantKey (no need to fetch from API)
  const merchant = tenantKey ? { tenantKey } : null;
  
  // Debug tenantKey source
  console.log('🔍 OutletSection - TenantKey source:', {
    'user.outlet.merchant.tenantKey': user?.outlet?.merchant?.tenantKey,
    'user.merchant.tenantKey': user?.merchant?.tenantKey,
    'tenantKey (final)': tenantKey,
    'merchant.tenantKey': merchant?.tenantKey,
    'Will show referral card': !!merchant?.tenantKey
  });
  
  // Get public product link from login response (preferred) or calculate from tenantKey
  const getPublicProductLink = () => {
    // First try: Use from login response
    if (user?.outlet?.merchant?.publicProductLink) {
      return user.outlet.merchant.publicProductLink;
    }
    // Fallback: Calculate from tenantKey
    if (!merchant?.tenantKey) return null;
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop';
    return `${baseUrl}/${merchant.tenantKey}/products`;
  };
  
  const publicProductLink = getPublicProductLink();
  
  // Get referral link from login response (preferred) or use tenantKey
  const referralLink = user?.outlet?.merchant?.referralLink || merchant?.tenantKey;
  
  // Copy referral code to clipboard
  const handleCopyReferralCode = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedReferralCode(true);
      setTimeout(() => setCopiedReferralCode(false), 2000);
    } catch (error) {
      console.error('Failed to copy referral code:', error);
    }
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    if (!publicProductLink) return;
    try {
      await navigator.clipboard.writeText(publicProductLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };
  
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

      {/* Referral Code Card - Always show, display "Chưa có" if no tenantKey */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-green-700" />
            <h3 className="text-lg font-semibold text-gray-900">{t('merchant.referralCode') || 'Referral Code'}</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {t('merchant.referralCodeDesc') || 'Share this code with others to refer them to our platform. You will receive commission for successful referrals.'}
          </p>

          <div className="space-y-4">
            {/* Referral Code Display */}
            <div className="flex items-center gap-2">
              <Input
                value={referralLink || t('merchant.notProvided') || 'Chưa có'}
                readOnly
                onClick={referralLink ? handleCopyReferralCode : undefined}
                className={`flex-1 bg-gray-50 text-gray-900 font-mono text-sm ${
                  referralLink 
                    ? 'cursor-pointer hover:bg-gray-100 transition-colors' 
                    : 'cursor-default text-gray-400'
                }`}
                title={referralLink ? "Click to copy referral code" : "Referral code not available"}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyReferralCode}
                disabled={!referralLink}
                className="h-10 whitespace-nowrap"
              >
                {copiedReferralCode ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t('merchant.copied') || 'Copied!'}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    {t('merchant.copy') || 'Copy'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Public Product Link Card - Always show, display "Chưa có" if no tenantKey */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ExternalLink className="h-5 w-5 text-blue-700" />
            <h3 className="text-lg font-semibold text-gray-900">{t('merchant.publicProductLink') || 'Public Product Link'}</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {t('merchant.publicProductLinkDesc') || 'Share this link to allow customers to view your products publicly.'}
          </p>

          <div className="space-y-4">
            {/* Link Display */}
            <div className="flex items-center gap-2">
              <Input
                value={publicProductLink || t('merchant.notProvided') || 'Chưa có'}
                readOnly
                onClick={publicProductLink ? handleCopyLink : undefined}
                className={`flex-1 bg-gray-50 text-gray-900 font-mono text-sm ${
                  publicProductLink 
                    ? 'cursor-pointer hover:bg-gray-100 transition-colors' 
                    : 'cursor-default text-gray-400'
                }`}
                title={publicProductLink ? "Click to copy link" : "Public product link not available"}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                disabled={!publicProductLink}
                className="h-10 whitespace-nowrap"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t('merchant.copied') || 'Copied!'}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    {t('merchant.copy') || 'Copy'}
                  </>
                )}
              </Button>
            </div>

            {/* Clickable Link - Only show if link is available */}
            {publicProductLink && (
              <div className="pt-4 border-t border-gray-200">
                <a
                  href={publicProductLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('merchant.viewPublicPage') || 'View Public Page'}
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
