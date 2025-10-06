'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { merchantsApi, PricingValidator } from '@rentalshop/utils';
import { BUSINESS_TYPE_DEFAULTS, PRICING_TYPE_LABELS, BUSINESS_TYPE_LABELS, PRICING_TYPE_DESCRIPTIONS } from '@rentalshop/constants';
import type { BusinessType, PricingType, MerchantPricingConfig } from '@rentalshop/constants';
import type { Merchant } from '@rentalshop/types';

export const PricingSection: React.FC = () => {
  const { user } = useAuth();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [config, setConfig] = useState<MerchantPricingConfig>(
    BUSINESS_TYPE_DEFAULTS.GENERAL
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMerchant, setLoadingMerchant] = useState(true);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Check if user has permission to access pricing configuration
  const canAccessPricing = user?.role === 'ADMIN' || user?.role === 'MERCHANT';

  // Load merchant data
  useEffect(() => {
    const loadMerchantData = async () => {
      if (!canAccessPricing) return;
      
      try {
        setLoadingMerchant(true);
        
        // For ADMIN: need to get merchant ID from somewhere (could be from URL params or context)
        // For MERCHANT: use user.merchantId
        const merchantId = user?.merchantId;
        
        if (!merchantId) {
          console.error('No merchant ID available');
          return;
        }
        
        // Get pricing config directly
        const pricingResponse = await merchantsApi.getPricingConfig(merchantId);
        
        if (pricingResponse.success && pricingResponse.data) {
          setConfig(pricingResponse.data.pricingConfig);
          
          // Also get merchant data for display
          const merchantResponse = await merchantsApi.getMerchantById(merchantId);
          if (merchantResponse.success && merchantResponse.data) {
            setMerchant(merchantResponse.data);
          }
        } else {
          // Fallback to default config
          setConfig(BUSINESS_TYPE_DEFAULTS.GENERAL);
        }
      } catch (error) {
        console.error('Failed to load merchant data:', error);
      } finally {
        setLoadingMerchant(false);
      }
    };
    
    loadMerchantData();
  }, [canAccessPricing, user?.merchantId]);

  const handleSave = async () => {
    if (!merchant?.id) return;
    
    // Validate configuration before saving
    const validation = PricingValidator.validatePricingConfig(config);
    setValidationResult(validation);
    
    if (!validation.isValid) {
      console.error('Validation failed:', validation.error);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await merchantsApi.updatePricingConfig(merchant.id, config);
      
      if (response.success) {
        // Show success toast
        console.log('Pricing configuration updated successfully');
        setValidationResult(null); // Clear validation result on success
      } else {
        throw new Error(response.message || 'Failed to update pricing configuration');
      }
    } catch (error) {
      // Show error toast
      console.error('Failed to update pricing config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBusinessTypeChange = (businessType: BusinessType) => {
    const defaults = BUSINESS_TYPE_DEFAULTS[businessType];
    setConfig(defaults);
  };

  // Show loading state
  if (loadingMerchant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pricing Configuration</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <p className="text-gray-600">Loading pricing configuration...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show access denied message if user doesn't have permission
  if (!canAccessPricing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pricing Configuration</CardTitle>
          <CardDescription>Access denied</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <p className="text-gray-600">
              You don't have permission to access pricing configuration.
              Only administrators and merchants can configure pricing settings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Configuration</CardTitle>
        <CardDescription>
          Set default pricing rules for all your products. You can change these settings anytime.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Business Type */}
        <div>
          <Label className="text-base font-medium">Business Type</Label>
          <p className="text-sm text-gray-600 mt-1 mb-3">
            Choose your business type to get recommended pricing settings
          </p>
          <Select 
            value={config.businessType} 
            onValueChange={handleBusinessTypeChange}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CLOTHING">
                <div>
                  <div className="font-medium">Clothing Rental</div>
                  <div className="text-sm text-gray-500">Dresses, suits, costumes, accessories</div>
                </div>
              </SelectItem>
              <SelectItem value="VEHICLE">
                <div>
                  <div className="font-medium">Vehicle Rental</div>
                  <div className="text-sm text-gray-500">Cars, bikes, motorcycles</div>
                </div>
              </SelectItem>
              <SelectItem value="EQUIPMENT">
                <div>
                  <div className="font-medium">Equipment Rental</div>
                  <div className="text-sm text-gray-500">Tools, machinery, equipment</div>
                </div>
              </SelectItem>
              <SelectItem value="GENERAL">
                <div>
                  <div className="font-medium">General Rental</div>
                  <div className="text-sm text-gray-500">Various items and services</div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Default Pricing Type */}
        <div>
          <Label className="text-base font-medium">Default Pricing Type</Label>
          <p className="text-sm text-gray-600 mt-1 mb-3">
            How should your products be priced by default?
          </p>
          <Select 
            value={config.defaultPricingType} 
            onValueChange={(value) => setConfig({
              ...config,
              defaultPricingType: value as PricingType
            })}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FIXED">
                <div>
                  <div className="font-medium">Fixed Price</div>
                  <div className="text-sm text-gray-500">One price per rental</div>
                </div>
              </SelectItem>
              <SelectItem value="HOURLY">
                <div>
                  <div className="font-medium">Hourly</div>
                  <div className="text-sm text-gray-500">Price per hour</div>
                </div>
              </SelectItem>
              <SelectItem value="DAILY">
                <div>
                  <div className="font-medium">Daily</div>
                  <div className="text-sm text-gray-500">Price per day</div>
                </div>
              </SelectItem>
              <SelectItem value="WEEKLY">
                <div>
                  <div className="font-medium">Weekly</div>
                  <div className="text-sm text-gray-500">Price per week</div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Business Rules */}
        <div>
          <Label className="text-base font-medium">Business Rules</Label>
          <div className="space-y-3 mt-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Rental Dates</Label>
                <p className="text-sm text-gray-600">
                  Customers must select rental dates for time-based pricing
                </p>
              </div>
              <Switch
                checked={config.businessRules.requireRentalDates}
                onCheckedChange={(checked) => setConfig({
                  ...config,
                  businessRules: { ...config.businessRules, requireRentalDates: checked }
                })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Pricing Options</Label>
                <p className="text-sm text-gray-600">
                  Display pricing options to customers
                </p>
              </div>
              <Switch
                checked={config.businessRules.showPricingOptions}
                onCheckedChange={(checked) => setConfig({
                  ...config,
                  businessRules: { ...config.businessRules, showPricingOptions: checked }
                })}
              />
            </div>
          </div>
        </div>

        {/* Duration Limits */}
        {config.defaultPricingType !== 'FIXED' && (
          <div>
            <Label className="text-base font-medium">Duration Limits</Label>
            <p className="text-sm text-gray-600 mt-1 mb-3">
              Set minimum and maximum rental durations
            </p>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <Label>Minimum Duration</Label>
                <Input
                  type="number"
                  value={config.durationLimits.minDuration}
                  onChange={(e) => setConfig({
                    ...config,
                    durationLimits: {
                      ...config.durationLimits,
                      minDuration: parseInt(e.target.value) || 1
                    }
                  })}
                  min="1"
                />
              </div>
              <div>
                <Label>Maximum Duration</Label>
                <Input
                  type="number"
                  value={config.durationLimits.maxDuration}
                  onChange={(e) => setConfig({
                    ...config,
                    durationLimits: {
                      ...config.durationLimits,
                      maxDuration: parseInt(e.target.value) || 365
                    }
                  })}
                  min="1"
                />
              </div>
              <div>
                <Label>Default Duration</Label>
                <Input
                  type="number"
                  value={config.durationLimits.defaultDuration}
                  onChange={(e) => setConfig({
                    ...config,
                    durationLimits: {
                      ...config.durationLimits,
                      defaultDuration: parseInt(e.target.value) || 1
                    }
                  })}
                  min="1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Validation Results */}
        {validationResult && (
          <div className="mt-4">
            {!validationResult.isValid && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <div className="text-red-800">
                  <div className="font-medium mb-1">❌ Configuration Error:</div>
                  <div className="text-sm">{validationResult.error}</div>
                </div>
              </div>
            )}
            {validationResult.warning && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                <div className="text-yellow-800">
                  <div className="font-medium mb-1">⚠️ Warning:</div>
                  <div className="text-sm">{validationResult.warning}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            disabled={isLoading || (validationResult && !validationResult.isValid)}
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
