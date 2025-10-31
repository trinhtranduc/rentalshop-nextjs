// ============================================================================
// ADMIN SUBSCRIPTION EXTENSION MODAL
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Separator,
  Badge
} from '@rentalshop/ui';
import { 
  Calendar, 
  DollarSign,
  User,
  Building,
  Clock,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { Subscription, Plan } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface AdminExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtend: (data: ExtensionData) => void;
  subscription: Subscription | null;
  loading?: boolean;
}

export interface ExtensionData {
  subscriptionId: number;
  newEndDate: Date;
  amount: number;
  method: string;
  description: string;
}

// ============================================================================
// PAYMENT METHODS
// ============================================================================

const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', description: 'Customer transferred money directly' },
  { value: 'CASH', label: 'Cash Payment', description: 'Cash payment received' },
  { value: 'CHECK', label: 'Check Payment', description: 'Check payment received' },
  { value: 'MANUAL_EXTENSION', label: 'Manual Extension', description: 'Admin granted extension' },
  { value: 'CREDIT', label: 'Account Credit', description: 'Applied account credit' }
];

// ============================================================================
// COMPONENT
// ============================================================================

export const AdminExtensionModal: React.FC<AdminExtensionModalProps> = ({
  isOpen,
  onClose,
  onExtend,
  subscription,
  loading = false
}) => {
  const [formData, setFormData] = useState<ExtensionData>({
    subscriptionId: 0,
    newEndDate: new Date(),
    amount: 0,
    method: 'BANK_TRANSFER',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when subscription changes
  useEffect(() => {
    if (subscription) {
      const currentEndDate = subscription.endDate || subscription.nextBillingDate;
      const newEndDate = new Date(currentEndDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1); // Default to 1 month extension

      setFormData({
        subscriptionId: subscription.id,
        newEndDate,
        amount: subscription.amount,
        method: 'BANK_TRANSFER',
        description: `Manual extension for ${subscription.merchant?.name || 'merchant'}`
      });
    }
  }, [subscription]);

  const handleInputChange = (field: keyof ExtensionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.newEndDate) {
      newErrors.newEndDate = 'End date is required';
    } else if (formData.newEndDate <= new Date()) {
      newErrors.newEndDate = 'End date must be in the future';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.method) {
      newErrors.method = 'Payment method is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onExtend(formData);
    }
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getDaysDifference = (date1: Date, date2: Date) => {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (!subscription) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Extend Subscription
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Subscription Info */}
          <Card className="bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-4 w-4" />
                Current Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Merchant</label>
                  <p className="font-medium">{subscription.merchant?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Plan</label>
                  <p className="font-medium">{subscription.plan?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Current Status</label>
                  <Badge variant={subscription.status === 'EXPIRED' ? 'destructive' : 'default'}>
                    {subscription.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Current End Date</label>
                  <p className="font-medium">
                    {subscription.endDate ? formatDate(subscription.endDate) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extension Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Extension Details</h3>
            
            {/* New End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                New End Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formatDate(formData.newEndDate)}
                onChange={(e) => handleInputChange('newEndDate', new Date(e.target.value))}
                className={errors.newEndDate ? 'border-red-500' : ''}
              />
              {errors.newEndDate && (
                <p className="text-sm text-red-500">{errors.newEndDate}</p>
              )}
              {formData.newEndDate && (
                <p className="text-sm text-gray-600">
                  Extension period: {getDaysDifference(new Date(), formData.newEndDate)} days
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                  className={`pl-10 ${errors.amount ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount}</p>
              )}
              <p className="text-sm text-gray-600">
                Amount: {formatCurrency(formData.amount, subscription.currency)}
              </p>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <Select 
                value={formData.method} 
                onValueChange={(value) => handleInputChange('method', value)}
              >
                <SelectTrigger className={errors.method ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      <div>
                        <div className="font-medium">{method.label}</div>
                        <div className="text-sm text-gray-600">{method.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.method && (
                <p className="text-sm text-red-500">{errors.method}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter payment details, reference number, or notes..."
                className={errors.description ? 'border-red-500' : ''}
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
            </div>
          </div>

          {/* Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Extension Period:</span>
                  <span>{getDaysDifference(new Date(), formData.newEndDate)} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">New End Date:</span>
                  <span className="font-semibold">{formatDate(formData.newEndDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Amount:</span>
                  <span className="font-semibold text-blue-700">
                    {formatCurrency(formData.amount, subscription.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Payment Method:</span>
                  <span>{PAYMENT_METHODS.find(m => m.value === formData.method)?.label}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-700 hover:bg-blue-700"
            >
              {loading ? 'Processing...' : 'Extend Subscription'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
