'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  TableCell, 
  NumericInput
} from '../ui';
import { formatCurrency } from '../../lib';
import { uploadImage, getAuthToken, type UploadProgress } from '@rentalshop/utils';
import { useProductTranslations, useCommonTranslations } from '@rentalshop/hooks';
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
  AlertCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import type { 
  ProductInput, 
  ProductUpdateInput
} from '@rentalshop/types';

// Define Category interface locally since it's not exported from database
interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

interface ProductFormData {
  name: string;
  description: string;
  barcode: string;
  categoryId: number;
  rentPrice: number;
  salePrice: number;
  deposit: number;
  totalStock: number;
  images: string[];
  outletStock: Array<{
    outletId: number;
    stock: number;
  }>;
  sku: string;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  categories: Category[];
  outlets: Array<{ id: number; name: string; address?: string }>;
  onSubmit: (data: ProductInput) => void;
  onCancel?: () => void;
  loading?: boolean;
  title?: string;
  submitText?: string | React.ReactNode;
  mode?: 'create' | 'edit';
  merchantId?: string | number; // Add merchantId prop
  hideHeader?: boolean; // Hide header when used in dialog
  hideSubmitButton?: boolean; // Hide submit button when using external action buttons
  formId?: string; // Form ID for external submit buttons
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
  hideHeader = false,
  hideSubmitButton = false,
  formId
}) => {
  const t = useProductTranslations();
  const tc = useCommonTranslations();
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    barcode: '',
    categoryId: 0,
    rentPrice: 0,
    salePrice: 0,
    deposit: 0,
    totalStock: 0,
    images: [],
    outletStock: [],
    sku: '',
    ...initialData
  });

  

  const [errors, setValidationErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug: Log initial data changes
  useEffect(() => {
    console.log('🔍 ProductForm - initialData changed:', initialData);
    console.log('🔍 ProductForm - initialData.categoryId:', initialData.categoryId);
    console.log('🔍 ProductForm - initialData.categoryId type:', typeof initialData.categoryId);
    console.log('🔍 ProductForm - mode:', mode);
    console.log('🔍 ProductForm - outlets:', outlets);
    console.log('🔍 ProductForm - initialData.outletStock:', initialData.outletStock);
    console.log('🔍 ProductForm - formData.outletStock:', formData.outletStock);
    console.log('🔍 ProductForm - outlets.length:', outlets.length);
    console.log('🔍 ProductForm - formData.outletStock.length:', formData.outletStock.length);
    
    // Additional debugging for edit mode
    if (mode === 'edit') {
      console.log('🔍 ProductForm - EDIT MODE: Checking outlet stock coverage');
      const outletIds = outlets.map(o => o.id);
      const stockOutletIds = formData.outletStock.map(os => os.outletId);
      console.log('🔍 ProductForm - All outlet IDs:', outletIds);
      console.log('🔍 ProductForm - Stock outlet IDs:', stockOutletIds);
      
      const missingOutlets = outletIds.filter(id => !stockOutletIds.includes(id));
      if (missingOutlets.length > 0) {
        console.warn('🔍 ProductForm - WARNING: Missing outlet stock for outlets:', missingOutlets);
      }
    }
  }, [initialData, mode, outlets, formData.outletStock]);

  // Handle initialData changes and re-initialize form
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      console.log('🔍 ProductForm - Re-initializing form with new initialData:', initialData);
      setFormData({
        name: '',
        description: '',
        barcode: '',
        categoryId: 0,
        rentPrice: 0,
        salePrice: 0,
        deposit: 0,
        totalStock: 0,
        images: [],
        outletStock: [],
        sku: '',
        ...initialData
      });
    }
  }, [initialData]);

  // Initialize outlet stock and default category if not provided
  useEffect(() => {
    let updatedFormData = { ...formData };
    
    // Initialize outlet stock if not provided (only for new products, not edit mode)
    if (mode === 'create' && formData.outletStock.length === 0 && outlets.length > 0) {
      updatedFormData.outletStock = outlets.map(outlet => ({
        outletId: outlet.id,
        stock: 0,
      }));
    }
    
    // Set default category if none selected and categories are available
    if (!formData.categoryId && categories.length > 0) {
      updatedFormData.categoryId = categories[0].id;
    }
    
    // Auto-generate barcode if not provided (only for new products)
    if (mode === 'create' && !formData.barcode) {
      updatedFormData.barcode = generateBarcode();
    }
    
    // Only update if there are changes
    if (JSON.stringify(updatedFormData) !== JSON.stringify(formData)) {
      setFormData(updatedFormData);
    }
  }, [outlets, categories, formData.outletStock.length, formData.categoryId, formData.barcode, mode]);

  // Auto-sync outlet stock with totalStock if only 1 outlet (default outlet)
  useEffect(() => {
    if (outlets.length === 1 && formData.outletStock.length === 1) {
      const currentOutletStock = formData.outletStock[0].stock;
      
      // If totalStock changes and differs from outlet stock, sync it
      if (formData.totalStock !== currentOutletStock) {
        setFormData(prev => ({
          ...prev,
          outletStock: [{
            outletId: outlets[0].id,
            stock: formData.totalStock
          }]
        }));
      }
    }
  }, [formData.totalStock, outlets.length]);

  // Generate unique barcode
  const generateBarcode = (): string => {
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp}${random}`; // RS = Rental Shop prefix
  };

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
      newErrors.rentPrice = 'Rent price is required and must be greater than 0';
    }

    if (formData.salePrice <= 0) {
      newErrors.salePrice = 'Sale price is required and must be greater than 0';
    }

    if (formData.deposit < 0) {
      newErrors.deposit = 'Deposit is required and cannot be negative';
    }

    if (formData.totalStock <= 0) {
      newErrors.totalStock = 'Total stock is required and must be greater than 0';
    }

    // Check if outlets are available
    if (outlets.length === 0) {
      newErrors.outletStock = 'No outlets available. Please contact your administrator to set up outlets.';
      return false;
    }

    // Validate outlet stock - ensure outlet stock is provided
    if (formData.outletStock.length === 0) {
      newErrors.outletStock = 'Outlet stock is required. Please specify stock levels for at least one outlet.';
      return false;
    }

    // Validate outlet stock - ensure all outlets have stock values
    if (formData.outletStock.length > 0) {
      const invalidOutletStock = formData.outletStock.find(item => item.stock < 0);
      if (invalidOutletStock) {
        newErrors.outletStock = 'Outlet stock values cannot be negative';
      }
    }

    // Don't call setValidationErrors here - just return the errors
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 ProductForm: Form submitted with data:', formData);
    console.log('🔍 ProductForm - categoryId type:', typeof formData.categoryId);
    console.log('🔍 ProductForm - categoryId value:', formData.categoryId);
    
    // Validate form and set errors if validation fails
    if (!validateForm()) {
      console.log('❌ ProductForm: Validation failed');

      // Set validation errors here instead
      const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

      if (!formData.name.trim()) {
        newErrors.name = 'Product name is required';
      }

      if (!formData.categoryId) {
        newErrors.categoryId = 'Category is required';
      }

      if (formData.rentPrice <= 0) {
        newErrors.rentPrice = 'Rent price is required and must be greater than 0';
      }

      if (formData.salePrice <= 0) {
        newErrors.salePrice = 'Sale price is required and must be greater than 0';
      }

      if (formData.deposit < 0) {
        newErrors.deposit = 'Deposit is required and cannot be negative';
      }

      if (formData.totalStock <= 0) {
        newErrors.totalStock = 'Total stock is required and must be greater than 0';
      }

      // Validate outlet stock - ensure outlet stock is provided
      if (formData.outletStock.length === 0) {
        newErrors.outletStock = 'Outlet stock is required. Please specify stock levels for at least one outlet.';
        setValidationErrors(newErrors);
        return;
      }

      // Validate outlet stock - ensure all outlets have stock values
      if (formData.outletStock.length > 0) {
        const invalidOutletStock = formData.outletStock.find(item => item.stock < 0);
        if (invalidOutletStock) {
          newErrors.outletStock = 'Outlet stock values cannot be negative';
        }
      }


      setValidationErrors(newErrors);
      return;
    }
    


    const productData: ProductInput = {
      merchantId: typeof merchantId === 'string' ? parseInt(merchantId) || 0 : merchantId || 0,
      categoryId: formData.categoryId,
      name: formData.name,
      description: formData.description,
      barcode: formData.barcode,
      totalStock: formData.totalStock,
      rentPrice: formData.rentPrice,
      salePrice: formData.salePrice > 0 ? formData.salePrice : undefined,
      deposit: formData.deposit,
      images: formData.images, // Keep as array for ProductInput
      outletStock: formData.outletStock,
    };

    onSubmit(productData);
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    // Handle type conversion for specific fields
    let processedValue = value;
    
    if (field === 'categoryId') {
      // Convert string to number for categoryId
      processedValue = parseInt(value) || 0;
    } else if (field === 'rentPrice' || field === 'salePrice' || field === 'deposit') {
      // Ensure numeric fields are numbers
      processedValue = parseFloat(value) || 0;
    } else if (field === 'totalStock') {
      // Ensure stock is a number
      processedValue = parseInt(value) || 0;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));

    // Clear validation error for this field
    if (errors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };



  const updateOutletStock = (outletId: number, field: 'stock', value: number) => {
    setFormData(prev => ({
      ...prev,
      outletStock: prev.outletStock.map(item =>
        item.outletId === outletId ? { ...item, [field]: value } : item
      )
    }));
  };



  // Image handling with enhanced Cloudinary upload and progress tracking
  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    
    // Check if adding more files would exceed the 3 image limit
    if (formData.images.length >= 3) {
      console.warn('Maximum 3 images allowed');
      return;
    }
    
    const filesArray = Array.from(files);
    const filesToUpload = filesArray.slice(0, 3 - formData.images.length);
    
    // Get auth token
    const token = getAuthToken();
    if (!token) {
      console.error('No authentication token found');
      setUploadErrors(prev => ({
        ...prev,
        general: 'Authentication required. Please log in again.'
      }));
      return;
    }
    
    for (const file of filesToUpload) {
      const fileId = `${file.name}-${Date.now()}`;
      
      // Clear any previous errors for this file
      setUploadErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fileId];
        return newErrors;
      });
      
      // Add placeholder for loading state
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, `uploading-${fileId}`]
      }));
      
      try {
        // Upload with progress tracking, compression, and optimization
        const uploadResult = await uploadImage(file, token, {
          folder: 'rentalshop/products',
          maxFileSize: 5 * 1024 * 1024, // 5MB
          allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
          useBase64Fallback: true, // Enable fallback for development
          maxWidth: 1200, // Client-side resize before upload
          maxHeight: 900,
          quality: 0.85,
          // Enable advanced compression
          enableCompression: true,
          compressionQuality: 0.8, // 80% quality
          maxSizeMB: 1, // Max 1MB after compression
          onProgress: (progress: UploadProgress) => {
            setUploadProgress(prev => ({
              ...prev,
              [fileId]: progress
            }));
          }
        });
        
        if (uploadResult.success && uploadResult.data) {
          // Success - replace placeholder with actual URL
          setFormData(prev => ({
            ...prev,
            images: prev.images.map(img => 
              img === `uploading-${fileId}` ? uploadResult.data!.url : img
            )
          }));
          
          // Show success message based on upload method
          if (uploadResult.data.uploadMethod === 'base64') {
            console.warn('⚠️ Image uploaded using base64 fallback. Configure Cloudinary for production.');
          } else if (uploadResult.data.uploadMethod === 'local') {
            console.warn('⚠️ Image uploaded to local storage. Configure Cloudinary for production.');
          } else {
            console.log('✅ Image uploaded successfully to Cloudinary');
          }
          
          // Clean up progress
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
        } else {
          // Upload failed
          console.error('Upload failed:', uploadResult.error);
          setUploadErrors(prev => ({
            ...prev,
            [fileId]: uploadResult.error || 'Upload failed'
          }));
          
          // Remove placeholder
          setFormData(prev => ({
            ...prev,
            images: prev.images.filter(img => img !== `uploading-${fileId}`)
          }));
        }
      } catch (error) {
        console.error('Upload error:', error);
        setUploadErrors(prev => ({
          ...prev,
          [fileId]: error instanceof Error ? error.message : 'Upload failed'
        }));
        
        // Remove placeholder
        setFormData(prev => ({
          ...prev,
          images: prev.images.filter(img => img !== `uploading-${fileId}`)
        }));
      }
    }
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

    if (e.dataTransfer.files && e.dataTransfer.files[0] && formData.images.length < 3) {
      handleImageUpload(e.dataTransfer.files);
    }
  }, [formData.images.length]);

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

      <form id={formId} onSubmit={handleSubmit} className="space-y-6">
        {/* Product Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {t('productDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">{t('fields.name')} *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={t('fields.name')}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">{t('fields.sku')}</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder={t('fields.sku')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">{t('fields.barcode')}</label>
                <div className="flex gap-2">
                  <Input
                    value={formData.barcode}
                    onChange={(e) => handleInputChange('barcode', e.target.value)}
                    placeholder={t('fields.barcode')}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleInputChange('barcode', generateBarcode())}
                    title={t('messages.generateBarcode')}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">{t('fields.category')} *</label>
                <Select
                  value={formData.categoryId.toString()}
                  onValueChange={(value) => {
                    handleInputChange('categoryId', value);
                  }}
                >
                  <SelectTrigger className={errors.categoryId ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('fields.category')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">{t('fields.description')}</label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder={t('fields.description')}
                rows={3}
              />
            </div>

            {/* Pricing Section - Merged into Product Details */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {t('pricing.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <NumericInput
                  label={t('fields.rentPrice')}
                  value={formData.rentPrice}
                  onChange={(value) => handleInputChange('rentPrice', value)}
                  placeholder="0.00"
                  error={!!errors.rentPrice}
                  required
                  allowDecimals={true}
                  maxDecimalPlaces={2}
                />
                {errors.rentPrice && <p className="text-sm text-red-500">{errors.rentPrice}</p>}
              </div>

              <div className="space-y-2">
                <NumericInput
                  label={t('fields.salePrice')}
                  value={formData.salePrice}
                  onChange={(value) => handleInputChange('salePrice', value)}
                  placeholder="0.00"
                  error={!!errors.salePrice}
                  required
                  allowDecimals={true}
                  maxDecimalPlaces={2}
                />
                {errors.salePrice && <p className="text-sm text-red-500">{errors.salePrice}</p>}
              </div>

              <div className="space-y-2">
                <NumericInput
                  label={t('fields.deposit')}
                  value={formData.deposit}
                  onChange={(value) => handleInputChange('deposit', value)}
                  placeholder="0.00"
                  error={!!errors.deposit}
                  required
                  allowDecimals={true}
                  maxDecimalPlaces={2}
                />
                {errors.deposit && <p className="text-sm text-red-500">{errors.deposit}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <NumericInput
                  label={t('fields.stock')}
                  value={formData.totalStock}
                  onChange={(value) => handleInputChange('totalStock', value)}
                  placeholder="0"
                  error={!!errors.totalStock}
                  required
                  allowDecimals={false}
                  min={0}
                />
                {errors.totalStock && <p className="text-sm text-red-500">{errors.totalStock}</p>}
              </div>
            </div>
            </div>
          </CardContent>
        </Card>

        {/* Outlet Stock Management - Only show if merchant has multiple outlets */}
        {outlets.length > 1 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="w-5 h-5" />
                {t('inventory.outletStockDistribution')} *
              </CardTitle>
            </CardHeader>
            <CardContent>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {t('inventory.totalOutlets')}: {outlets.length} | {t('inventory.stockEntries')}: {formData.outletStock.length} | <span className="text-red-500">*</span> {t('inventory.stockRequired')}
              </p>
            </div>
            
            {outlets.length === 0 ? (
              <div className="text-center py-8">
                <Warehouse className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('inventory.noOutletsAvailable')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('inventory.needOutletMessage')}
                </p>
                <p className="text-sm text-red-500">
                  {t('inventory.contactAdmin')}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('filters.outletLabel')}</TableHead>
                      <TableHead>{t('stock.label')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.outletStock.map((outletStock) => {
                      const outlet = outlets.find(o => o.id === outletStock.outletId);
                      
                      return (
                        <TableRow key={outletStock.outletId}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-medium">{outlet?.name || 'Unknown Outlet'}</div>
                              {outlet?.address && (
                                <div className="text-sm text-text-secondary mt-1">
                                  {outlet.address}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <NumericInput
                              value={outletStock.stock}
                              onChange={(value) => updateOutletStock(outletStock.outletId, 'stock', value)}
                              min={0}
                              allowDecimals={false}
                              required
                              className="w-20"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                {/* Outlet Stock Validation Error */}
                {errors.outletStock && (
                  <div className="mt-4">
                    <p className="text-sm text-red-500">{errors.outletStock}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        ) : null}

        {/* Enhanced Image Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              {t('fields.images')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drag & Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive && formData.images.length < 3
                  ? 'border-action-primary bg-action-primary/10' 
                  : formData.images.length >= 3
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-border hover:border-action-primary/50'
              }`}
              onDragEnter={formData.images.length < 3 ? handleDrag : undefined}
              onDragLeave={formData.images.length < 3 ? handleDrag : undefined}
              onDragOver={formData.images.length < 3 ? handleDrag : undefined}
              onDrop={formData.images.length < 3 ? handleDrop : undefined}
            >
              <Upload className={`w-8 h-8 mx-auto mb-2 ${formData.images.length >= 3 ? 'text-gray-400' : 'text-text-secondary'}`} />
              <p className="text-text-primary font-medium mb-1">
                {formData.images.length >= 3 ? t('messages.maxImagesReached') : t('messages.dragDropImages')}
              </p>
              <p className="text-text-secondary text-sm mb-3">
                {t('messages.imageFormats')}
              </p>
              
              {/* File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="hidden"
                id="image-upload"
                disabled={formData.images.length >= 3}
              />
              
              {/* Browse Button */}
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={formData.images.length >= 3}
              >
                {formData.images.length >= 3 ? t('messages.maxImagesReached') : tc('buttons.browse')}
              </Button>
            </div>

            {/* Image Counter and Preview Grid */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                {formData.images.length}/3 {t('messages.imagesUploaded')}
              </p>
              {formData.images.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, images: [] }))}
                >
                  {t('messages.clearAllImages')}
                </Button>
              )}
            </div>
            
            {/* Upload Errors Display */}
            {Object.keys(uploadErrors).length > 0 && (
              <div className="space-y-2">
                {Object.entries(uploadErrors).map(([fileId, error]) => (
                  <div key={fileId} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-red-700 font-medium">{t('messages.uploadFailed')}</p>
                      <p className="text-xs text-red-600 mt-1">{error}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => setUploadErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors[fileId];
                        return newErrors;
                      })}
                      className="text-red-400 hover:text-red-600 h-6 w-6 p-0"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {formData.images.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {formData.images.map((image, index) => {
                  // Check if this is an uploading placeholder
                  const isUploading = image.startsWith('uploading-');
                  const fileId = isUploading ? image.replace('uploading-', '') : '';
                  const progress = isUploading ? uploadProgress[fileId] : null;
                  
                  return (
                    <div key={index} className="relative group">
                      {isUploading ? (
                        // Upload Progress Card
                        <div className="w-full h-24 rounded-lg border border-action-primary bg-action-primary/5 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-action-primary" />
                          {progress && (
                            <>
                              <div className="w-full px-4">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-action-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress.percentage}%` }}
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-text-secondary">
                                {progress.stage === 'preparing' && t('messages.preparing')}
                                {progress.stage === 'uploading' && `${t('messages.uploading')} ${progress.percentage}%`}
                                {progress.stage === 'processing' && t('messages.processing')}
                                {progress.stage === 'complete' && t('messages.complete')}
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        // Image Preview
                        <>
                          <img
                            src={image}
                            alt={`${t('fields.name')} ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 h-6 w-6"
                            title={t('messages.removeImage')}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>





        {/* Action Buttons */}
        {!hideSubmitButton && (
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
        )}
      </form>
    </div>
  );
};

