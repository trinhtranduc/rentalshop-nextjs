'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge
} from '@rentalshop/ui';
import { 
  X, 
  Calculator, 
  Percent, 
  DollarSign, 
  Clock,
  Package,
  Star,
  TrendingUp,
  Check
} from 'lucide-react';
import type { PlanVariant, Plan } from '@rentalshop/types';

interface PlanVariantFormProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: PlanVariant | null;
  plans: Plan[];
  onSave: (variant: Partial<PlanVariant>) => void;
}

export default function PlanVariantForm({ 
  isOpen, 
  onClose, 
  variant, 
  plans, 
  onSave 
}: PlanVariantFormProps) {
  const [formData, setFormData] = useState({
    planId: '',
    name: '',
    duration: 1,
    price: 0,
    basePrice: 0,
    discount: 0,
    isActive: true,
    isPopular: false,
    sortOrder: 0
  });
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [calculatedSavings, setCalculatedSavings] = useState(0);

  useEffect(() => {
    if (variant) {
      setFormData({
        planId: variant.planId.toString(),
        name: variant.name,
        duration: variant.duration,
        price: variant.price,
        basePrice: variant.plan?.basePrice || 0,
        discount: variant.discount,
        isActive: variant.isActive,
        isPopular: variant.isPopular,
        sortOrder: variant.sortOrder
      });
    } else {
      setFormData({
        planId: '',
        name: '',
        duration: 1,
        price: 0,
        basePrice: 0,
        discount: 0,
        isActive: true,
        isPopular: false,
        sortOrder: 0
      });
    }
  }, [variant, isOpen]);

  useEffect(() => {
    // Calculate price and savings when basePrice or discount changes
    if (formData.basePrice > 0) {
      const price = formData.basePrice * (1 - formData.discount / 100);
      const savings = formData.basePrice - price;
      setCalculatedPrice(price);
      setCalculatedSavings(savings);
    }
  }, [formData.basePrice, formData.discount]);

  const handlePlanChange = (planId: string) => {
    const selectedPlan = plans.find(plan => plan.id.toString() === planId);
    if (selectedPlan) {
      setFormData(prev => ({
        ...prev,
        planId,
        basePrice: selectedPlan.basePrice,
        name: `${selectedPlan.name} - ${prev.duration} Month${prev.duration !== 1 ? 's' : ''}`
      }));
    }
  };

  const handleDurationChange = (duration: number) => {
    const selectedPlan = plans.find(plan => plan.id.toString() === formData.planId);
    if (selectedPlan) {
      setFormData(prev => ({
        ...prev,
        duration,
        name: `${selectedPlan.name} - ${duration} Month${duration !== 1 ? 's' : ''}`
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const variantData = {
      ...formData,
      planId: formData.planId,
      price: formData.price || calculatedPrice,
      savings: calculatedSavings
    };
    
    onSave(variantData);
  };

  const selectedPlan = plans.find(plan => plan.id.toString() === formData.planId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {variant ? 'Edit Plan Variant' : 'Create Plan Variant'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Plan Selection */}
          <div className="space-y-2">
            <Label htmlFor="planId">Plan *</Label>
            <Select value={formData.planId} onValueChange={handlePlanChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map(plan => (
                  <SelectItem key={plan.id} value={plan.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{plan.name}</span>
                      <Badge variant="outline">${plan.basePrice}/month</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (months) *</Label>
            <Select 
              value={formData.duration.toString()} 
              onValueChange={(value) => handleDurationChange(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Month</SelectItem>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">12 Months</SelectItem>
                <SelectItem value="24">24 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Variant Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Variant Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., 3 Months, 6 Months, Annual"
              required
            />
          </div>

          {/* Pricing Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Base Price Display */}
              {selectedPlan && (
                <div className="flex items-center gap-2 p-3 bg-bg-secondary rounded-lg">
                  <DollarSign className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm text-text-secondary">Base Price:</span>
                  <span className="font-medium">${selectedPlan.basePrice.toFixed(2)}/month</span>
                </div>
              )}

              {/* Discount */}
              <div className="space-y-2">
                <Label htmlFor="discount">Discount (%)</Label>
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-text-secondary" />
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.discount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      discount: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="0"
                    className="flex-1"
                  />
                  <span className="text-sm text-text-secondary">%</span>
                </div>
              </div>

              {/* Calculated Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">Final Price</span>
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    ${calculatedPrice.toFixed(2)}
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Savings</span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    ${calculatedSavings.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Custom Price Override */}
              <div className="space-y-2">
                <Label htmlFor="price">Custom Price (optional)</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-text-secondary" />
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      price: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="Leave empty to use calculated price"
                  />
                </div>
                <p className="text-xs text-text-secondary">
                  Leave empty to use the calculated price based on discount
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  sortOrder: parseInt(e.target.value) || 0 
                }))}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      isActive: e.target.checked 
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">Active</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      isPopular: e.target.checked 
                    }))}
                    className="rounded"
                  />
                  <Star className="w-4 h-4" />
                  <span className="text-sm">Popular</span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit">
              <Check className="w-4 h-4 mr-2" />
              {variant ? 'Update Variant' : 'Create Variant'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
