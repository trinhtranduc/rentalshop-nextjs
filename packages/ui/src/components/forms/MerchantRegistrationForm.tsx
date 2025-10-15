'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Input, 
  Label, 
  Textarea,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui';
import { 
  Building2, 
  User, 
  MapPin, 
  CheckCircle,
  Loader2,
  DollarSign
} from 'lucide-react';
import { getCurrencyDisplay } from '@rentalshop/utils';

interface MerchantRegistrationFormData {
  // Merchant details
  merchantName: string;
  merchantEmail: string;
  merchantPhone: string;
  merchantDescription: string;
  currency: 'USD' | 'VND';
  
  // User details (merchant owner)
  userEmail: string;
  userPassword: string;
  userFirstName: string;
  userLastName: string;
  userPhone: string;
  
  // Optional outlet details
  outletName: string;
  outletAddress: string;
  outletDescription: string;
}

interface MerchantRegistrationFormProps {
  onSubmit: (data: MerchantRegistrationFormData) => Promise<void>;
  loading?: boolean;
  className?: string;
}

export const MerchantRegistrationForm: React.FC<MerchantRegistrationFormProps> = ({
  onSubmit,
  loading = false,
  className
}) => {
  const [formData, setFormData] = useState<MerchantRegistrationFormData>({
    merchantName: '',
    merchantEmail: '',
    merchantPhone: '',
    merchantDescription: '',
    currency: 'USD', // Default to USD
    userEmail: '',
    userPassword: '',
    userFirstName: '',
    userLastName: '',
    userPhone: '',
    outletName: '',
    outletAddress: '',
    outletDescription: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof MerchantRegistrationFormData, string>>>({});

  const handleInputChange = (field: keyof MerchantRegistrationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof MerchantRegistrationFormData, string>> = {};

    // Required fields
    if (!formData.merchantName.trim()) {
      newErrors.merchantName = 'Merchant name is required';
    }
    if (!formData.merchantEmail.trim()) {
      newErrors.merchantEmail = 'Merchant email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.merchantEmail)) {
      newErrors.merchantEmail = 'Invalid email format';
    }
    if (!formData.userEmail.trim()) {
      newErrors.userEmail = 'User email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.userEmail)) {
      newErrors.userEmail = 'Invalid email format';
    }
    if (!formData.userPassword.trim()) {
      newErrors.userPassword = 'Password is required';
    } else if (formData.userPassword.length < 6) {
      newErrors.userPassword = 'Password must be at least 6 characters';
    }
    if (!formData.userFirstName.trim()) {
      newErrors.userFirstName = 'First name is required';
    }
    if (!formData.userLastName.trim()) {
      newErrors.userLastName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting merchant registration:', error);
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Register Your Business
            <Badge variant="secondary" className="ml-auto">
              Free 14-Day Trial
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Merchant Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Business Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="merchantName">Business Name *</Label>
                  <Input
                    id="merchantName"
                    value={formData.merchantName}
                    onChange={(e) => handleInputChange('merchantName', e.target.value)}
                    placeholder="Your business name"
                    className={errors.merchantName ? 'border-red-500' : ''}
                  />
                  {errors.merchantName && <p className="text-sm text-red-500">{errors.merchantName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="merchantEmail">Business Email *</Label>
                  <Input
                    id="merchantEmail"
                    type="email"
                    value={formData.merchantEmail}
                    onChange={(e) => handleInputChange('merchantEmail', e.target.value)}
                    placeholder="business@example.com"
                    className={errors.merchantEmail ? 'border-red-500' : ''}
                  />
                  {errors.merchantEmail && <p className="text-sm text-red-500">{errors.merchantEmail}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="merchantPhone">Business Phone</Label>
                  <Input
                    id="merchantPhone"
                    value={formData.merchantPhone}
                    onChange={(e) => handleInputChange('merchantPhone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Currency *
                  </Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value: 'USD' | 'VND') => handleInputChange('currency', value)}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">
                        {getCurrencyDisplay('USD')} - US Dollar
                      </SelectItem>
                      <SelectItem value="VND">
                        {getCurrencyDisplay('VND')} - Vietnamese Dong
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    All prices and transactions will be in this currency
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="merchantDescription">Business Description</Label>
                <Textarea
                  id="merchantDescription"
                  value={formData.merchantDescription}
                  onChange={(e) => handleInputChange('merchantDescription', e.target.value)}
                  placeholder="Tell us about your rental business..."
                  rows={3}
                />
              </div>
            </div>

            {/* User Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4" />
                Account Owner Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userFirstName">First Name *</Label>
                  <Input
                    id="userFirstName"
                    value={formData.userFirstName}
                    onChange={(e) => handleInputChange('userFirstName', e.target.value)}
                    placeholder="John"
                    className={errors.userFirstName ? 'border-red-500' : ''}
                  />
                  {errors.userFirstName && <p className="text-sm text-red-500">{errors.userFirstName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userLastName">Last Name *</Label>
                  <Input
                    id="userLastName"
                    value={formData.userLastName}
                    onChange={(e) => handleInputChange('userLastName', e.target.value)}
                    placeholder="Doe"
                    className={errors.userLastName ? 'border-red-500' : ''}
                  />
                  {errors.userLastName && <p className="text-sm text-red-500">{errors.userLastName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userEmail">Email Address *</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={formData.userEmail}
                    onChange={(e) => handleInputChange('userEmail', e.target.value)}
                    placeholder="john@example.com"
                    className={errors.userEmail ? 'border-red-500' : ''}
                  />
                  {errors.userEmail && <p className="text-sm text-red-500">{errors.userEmail}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userPhone">Phone Number</Label>
                  <Input
                    id="userPhone"
                    value={formData.userPhone}
                    onChange={(e) => handleInputChange('userPhone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="userPassword">Password *</Label>
                <Input
                  id="userPassword"
                  type="password"
                  value={formData.userPassword}
                  onChange={(e) => handleInputChange('userPassword', e.target.value)}
                  placeholder="Create a secure password"
                  className={errors.userPassword ? 'border-red-500' : ''}
                />
                {errors.userPassword && <p className="text-sm text-red-500">{errors.userPassword}</p>}
              </div>
            </div>

            {/* Outlet Information (Optional) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                First Outlet (Optional)
              </h3>
              <p className="text-sm text-gray-600">
                You can add more outlets later. This helps you get started quickly.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="outletName">Outlet Name</Label>
                  <Input
                    id="outletName"
                    value={formData.outletName}
                    onChange={(e) => handleInputChange('outletName', e.target.value)}
                    placeholder="Main Store"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outletAddress">Address</Label>
                  <Textarea
                    id="outletAddress"
                    value={formData.outletAddress}
                    onChange={(e) => handleInputChange('outletAddress', e.target.value)}
                    placeholder="123 Main St, City, State 12345"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outletDescription">Description</Label>
                  <Textarea
                    id="outletDescription"
                    value={formData.outletDescription}
                    onChange={(e) => handleInputChange('outletDescription', e.target.value)}
                    placeholder="Describe this outlet..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Trial Information */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900">14-Day Free Trial</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Start with our Trial plan and explore all features. No credit card required.
                    Upgrade to a paid plan anytime during or after your trial.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Start Free Trial'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantRegistrationForm;
