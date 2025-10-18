'use client';

import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge
} from '../../../ui';
import { Package, DollarSign, Save, X, Loader2 } from 'lucide-react';
import { useProductTranslations } from '@rentalshop/hooks';
import type { Category, Outlet } from '@rentalshop/types';

interface ProductSimpleFormProps {
  initialData?: any;
  categories: Category[];
  outlets: Outlet[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  mode?: 'create' | 'edit';
}

export const ProductSimpleForm: React.FC<ProductSimpleFormProps> = ({
  initialData,
  categories,
  outlets,
  onSubmit,
  onCancel,
  mode = 'create'
}) => {
  const t = useProductTranslations();
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    barcode: initialData?.barcode || '',
    categoryId: initialData?.categoryId || (categories[0]?.id || 0),
    rentPrice: initialData?.rentPrice || 0,
    salePrice: initialData?.salePrice || 0,
    deposit: initialData?.deposit || 0,
    totalStock: initialData?.totalStock || 0,
    outletStock: initialData?.outletStock || outlets.map(outlet => ({
      outletId: outlet.id,
      stock: 0
    }))
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }
    if (formData.rentPrice <= 0) {
      newErrors.rentPrice = 'Rent price must be greater than 0';
    }
    if (formData.totalStock < 0) {
      newErrors.totalStock = 'Stock cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockChange = (outletId: number, stock: number) => {
    setFormData(prev => ({
      ...prev,
      outletStock: prev.outletStock.map(os =>
        os.outletId === outletId ? { ...os, stock } : os
      ),
      totalStock: prev.outletStock.reduce((sum, os) => 
        sum + (os.outletId === outletId ? stock : os.stock), 0
      )
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {mode === 'create' ? t('createProduct') : t('editProduct')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {mode === 'create' ? 'Add a new product to your inventory' : 'Update product information'}
            </p>
          </div>
        </div>
      </div>

      {/* Product Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t('productDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name & Barcode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('fields.name')} <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('fields.barcode')}</label>
              <Input
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Enter barcode (optional)"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('fields.description')}</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter product description"
              rows={3}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('fields.category')} <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.categoryId.toString()}
              onValueChange={(value) => setFormData({ ...formData, categoryId: parseInt(value) })}
            >
              <SelectTrigger className={errors.categoryId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-sm text-red-500 mt-1">{errors.categoryId}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {t('pricing')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('fields.rentPrice')} <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.rentPrice}
                onChange={(e) => setFormData({ ...formData, rentPrice: parseFloat(e.target.value) || 0 })}
                className={errors.rentPrice ? 'border-red-500' : ''}
              />
              {errors.rentPrice && <p className="text-sm text-red-500 mt-1">{errors.rentPrice}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('fields.salePrice')}</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.salePrice}
                onChange={(e) => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('fields.deposit')}</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.deposit}
                onChange={(e) => setFormData({ ...formData, deposit: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory by Outlet */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Inventory by Outlet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {outlets.map((outlet, index) => {
              const outletStockItem = formData.outletStock.find(os => os.outletId === outlet.id);
              const currentStock = outletStockItem?.stock || 0;

              return (
                <div key={outlet.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{outlet.name}</p>
                    {outlet.address && (
                      <p className="text-xs text-gray-500">{outlet.address}</p>
                    )}
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      min="0"
                      value={currentStock}
                      onChange={(e) => handleStockChange(outlet.id, parseInt(e.target.value) || 0)}
                      placeholder="Stock"
                      className="text-center"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Stock Summary */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Stock:</span>
              <Badge variant="default" className="text-lg px-4 py-1">
                {formData.totalStock} units
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-900 py-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="w-4 h-4 mr-2" />
          {t('buttons.cancel') || 'Cancel'}
        </Button>
        <Button
          type="submit"
          variant="default"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {mode === 'create' ? 'Creating...' : 'Updating...'}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {mode === 'create' ? t('createProduct') : t('updateProduct')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

