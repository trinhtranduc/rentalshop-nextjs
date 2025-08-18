'use client'

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '../ui';
import { formatCurrency } from '../../lib';
import { 
  Package, 
  DollarSign, 
  Warehouse, 
  Tag,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Upload,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import type { 
  ProductInput, 
  ProductUpdateInput
} from '@rentalshop/database';

// Define Category interface locally since it's not exported from database
interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface ProductFormData {
  name: string;
  description: string;
  barcode: string;
  categoryId: string;
  rentPrice: number;
  salePrice: number;
  deposit: number;
  totalStock: number;
  images: string[];
  isActive: boolean;
  outletStock: Array<{
    outletId: string;
    stock: number;
  }>;
  sku: string;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  categories: Category[];
  outlets: Array<{ id: string; name: string }>;
  onSubmit: (data: ProductInput) => void;
  onCancel?: () => void;
  loading?: boolean;
  title?: string;
  submitText?: string | React.ReactNode;
  mode?: 'create' | 'edit';
  merchantId?: string; // Add merchantId prop
  hideHeader?: boolean; // Hide header when used in dialog
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData = {},
  categories = [],
  outlets = [],
  onSubmit,
  onCancel,
  loading = false,
  title = 'Product Information',
  submitText = 'Save Product',
  mode = 'create',
  merchantId = '',
  hideHeader = false
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    barcode: '',
    categoryId: '',
    rentPrice: 0,
    salePrice: 0,
    deposit: 0,
    totalStock: 0,
    images: [],
    isActive: true,
    outletStock: [],
    sku: '',
    ...initialData
  });

  const [errors, setValidationErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Initialize outlet stock if not provided
  useEffect(() => {
    console.log('🔄 ProductForm useEffect - outlets:', outlets);
    console.log('🔄 ProductForm useEffect - formData.outletStock:', formData.outletStock);
    
    if (formData.outletStock.length === 0 && outlets.length > 0) {
      console.log('✅ Initializing outlet stock for', outlets.length, 'outlets');
      setFormData(prev => ({
        ...prev,
        outletStock: outlets.map(outlet => ({
          outletId: outlet.id,
          stock: 0,
        }))
      }));
    }
  }, [outlets, formData.outletStock.length]);

  // Auto-save functionality
  useEffect(() => {
    if (mode === 'edit' && formData.name && formData.categoryId) {
      const timeoutId = setTimeout(() => {
        handleAutoSave();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [formData.name, formData.description, formData.categoryId, mode]);

  const handleAutoSave = useCallback(async () => {
    // Don't validate during auto-save to avoid setState warnings
    // Just proceed with auto-save logic
    
    setAutoSaveStatus('saving');
    try {
      // Here you would call a lightweight auto-save API
      // For now, we'll just simulate it
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    } catch (error) {
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    }
  }, [formData]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    if (formData.rentPrice <= 0) {
      newErrors.rentPrice = 'Rent price must be greater than 0';
    }

    if (formData.deposit < 0) {
      newErrors.deposit = 'Deposit cannot be negative';
    }

    if (formData.totalStock < 0) {
      newErrors.totalStock = 'Total stock cannot be negative';
    }

    // Don't call setValidationErrors here - just return the errors
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form and set errors if validation fails
    if (!validateForm()) {
      // Set validation errors here instead
      const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

      if (!formData.name.trim()) {
        newErrors.name = 'Product name is required';
      }

      if (!formData.categoryId) {
        newErrors.categoryId = 'Category is required';
      }

      if (formData.rentPrice <= 0) {
        newErrors.rentPrice = 'Rent price must be greater than 0';
      }

      if (formData.deposit < 0) {
        newErrors.deposit = 'Deposit cannot be negative';
      }

      if (formData.totalStock < 0) {
        newErrors.totalStock = 'Total stock cannot be negative';
      }



      setValidationErrors(newErrors);
      return;
    }

    const productData: ProductInput = {
      merchantId: merchantId, // This should be passed from parent component
      categoryId: formData.categoryId,
      name: formData.name,
      description: formData.description,
      barcode: formData.barcode,
      totalStock: formData.totalStock,
      rentPrice: formData.rentPrice,
      salePrice: formData.salePrice > 0 ? formData.salePrice : undefined,
      deposit: formData.deposit,
      images: formData.images.join(','),
      outletStock: formData.outletStock,
    };

    onSubmit(productData);
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error for this field
    if (errors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const updateOutletStock = (outletId: string, field: 'stock', value: number) => {
    setFormData(prev => ({
      ...prev,
      outletStock: prev.outletStock.map(item =>
        item.outletId === outletId ? { ...item, [field]: value } : item
      )
    }));
  };



  // Image handling
  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, imageUrl]
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files);
    }
  }, []);

  const getProductStatus = () => {
    if (formData.totalStock === 0) return { status: 'Out of Stock', variant: 'destructive' as const };
    return { status: 'In Stock', variant: 'default' as const };
  };

  const { status, variant } = getProductStatus();



  return (
    <div className="space-y-6">
      {/* Header with Auto-save Status */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">{title}</h1>
          
            {mode === 'edit' && (
              <div className="flex items-center gap-2 mt-2">
                {autoSaveStatus === 'saving' && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-text-secondary" />
                    Auto-saving...
                  </div>
                )}
                {autoSaveStatus === 'saved' && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Auto-saved
                  </div>
                )}
                {autoSaveStatus === 'error' && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <XCircle className="w-4 h-4" />
                    Auto-save failed
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={variant} className="text-sm">
              {status}
            </Badge>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Product Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter product name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">SKU</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder="Enter SKU (optional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Barcode</label>
                <Input
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                  placeholder="Enter barcode (optional)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Category *</label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => handleInputChange('categoryId', value)}
                >
                  <SelectTrigger className={errors.categoryId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter product description"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing & Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Rent Price *</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.rentPrice}
                    onChange={(e) => handleInputChange('rentPrice', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={errors.rentPrice ? 'border-red-500' : ''}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
                    ₫
                  </span>
                </div>
                {errors.rentPrice && <p className="text-sm text-red-500">{errors.rentPrice}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Sale Price</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.salePrice}
                    onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
                    ₫
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Deposit</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.deposit}
                    onChange={(e) => handleInputChange('deposit', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={errors.deposit ? 'border-red-500' : ''}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
                    ₫
                  </span>
                </div>
                {errors.deposit && <p className="text-sm text-red-500">{errors.deposit}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Total Stock *</label>
                <Input
                  type="number"
                  value={formData.totalStock}
                  onChange={(e) => handleInputChange('totalStock', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  className={errors.totalStock ? 'border-red-500' : ''}
                />
                {errors.totalStock && <p className="text-sm text-red-500">{errors.totalStock}</p>}
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Outlet Stock Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="w-5 h-5" />
              Outlet Stock Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Total outlets: {outlets.length} | Outlet stock entries: {formData.outletStock.length}
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.outletStock.map((outletStock) => {
                  const outlet = outlets.find(o => o.id === outletStock.outletId);
                  const stockStatus = outletStock.stock === 0 ? 'Out of Stock' : 'In Stock';
                  const statusVariant = outletStock.stock === 0 ? 'destructive' : 'default';
                  
                  return (
                    <TableRow key={outletStock.outletId}>
                      <TableCell className="font-medium">
                        {outlet?.name || 'Unknown Outlet'}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={outletStock.stock}
                          onChange={(e) => updateOutletStock(outletStock.outletId, 'stock', parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-20"
                        />
                      </TableCell>

                      <TableCell>
                        <Badge variant={statusVariant} className="text-xs">
                          {stockStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            

          </CardContent>
        </Card>

        {/* Enhanced Image Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Product Images
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drag & Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-action-primary bg-action-primary/10' 
                  : 'border-border hover:border-action-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-text-secondary" />
              <p className="text-text-primary font-medium mb-1">
                Drag and drop images here, or click to browse
              </p>
              <p className="text-text-secondary text-sm mb-3">
                Supports JPG, PNG, GIF up to 10MB each
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload">
                <Button type="button" variant="outline" size="sm">
                  Browse Files
                </Button>
              </label>
            </div>

            {/* Image Preview Grid */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Product ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>





        {/* Action Buttons */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || !validateForm()}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {submitText}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
