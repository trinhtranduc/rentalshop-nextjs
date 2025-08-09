import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge } from '@rentalshop/ui';

interface Product {
  id: string;
  name: string;
  description?: string;
  totalStock: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images?: string;
  categoryId?: string;
  category?: {
    name: string;
  };
  merchant?: {
    name: string;
  };
  outletStock?: Array<{
    id: string;
    stock: number;
    available: number;
    renting: number;
    outlet: {
      id: string;
      name: string;
    };
  }>;
}

interface ProductDialogProps {
  product?: any | null | undefined;
  onSave?: (productData: any) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  mode?: 'create' | 'edit' | 'view';
}

interface OutletStockInput {
  outletId: string;
  stock: number;
}

export const ProductDialog: React.FC<ProductDialogProps> = ({
  product,
  onSave,
  open,
  onOpenChange,
  trigger,
  mode
}) => {
  const derivedMode: 'create' | 'edit' | 'view' = mode || (product ? 'edit' : 'create');
  const isView = derivedMode === 'view';
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    totalStock: 0,
    rentPrice: 0,
    salePrice: 0,
    deposit: 0,
    categoryId: '',
  });
  const [outletStock, setOutletStock] = useState<OutletStockInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);

  // Load categories and outlets on mount
  useEffect(() => {
    loadCategories();
    loadOutlets();
  }, []);

  // Update form data when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        totalStock: product.totalStock,
        rentPrice: product.rentPrice,
        salePrice: product.salePrice || 0,
        deposit: product.deposit,
        categoryId: '', // Will be set when categories load
      });
      setOutletStock(
        product.outletStock?.map((os: any) => ({
          outletId: os.outlet.id,
          stock: os.stock
        })) || []
      );
    } else {
      setFormData({
        name: '',
        description: '',
        totalStock: 0,
        rentPrice: 0,
        salePrice: 0,
        deposit: 0,
        categoryId: '',
      });
      setOutletStock([]);
    }
  }, [product]);

  const loadCategories = async () => {
    try {
      const { authenticatedFetch } = await import('@rentalshop/utils');
      const response = await authenticatedFetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCategories(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadOutlets = async () => {
    try {
      const { authenticatedFetch } = await import('@rentalshop/utils');
      const response = await authenticatedFetch('/api/outlets');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOutlets(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading outlets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isView) {
      onOpenChange(false);
      return;
    }
    
    if (!formData.name || !formData.categoryId) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.totalStock < 0 || formData.rentPrice < 0 || formData.deposit < 0) {
      alert('Please enter valid numbers');
      return;
    }

    // Validate that outlet stock allocation matches total stock
    const totalAllocatedStock = outletStock.reduce((sum, os) => sum + os.stock, 0);
    if (totalAllocatedStock !== formData.totalStock) {
      alert(`Total allocated stock (${totalAllocatedStock}) must equal total stock (${formData.totalStock})`);
      return;
    }

    setLoading(true);
    try {
      await (onSave as any)({
        name: formData.name,
        description: formData.description,
        totalStock: formData.totalStock,
        rentPrice: formData.rentPrice,
        salePrice: formData.salePrice > 0 ? formData.salePrice : undefined,
        deposit: formData.deposit,
        categoryId: formData.categoryId,
        outletStock: outletStock as any
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addOutletStock = () => {
    if (outlets.length === 0) return;
    
    const availableOutlets = outlets.filter(outlet => 
      !outletStock.some(os => os.outletId === outlet.id)
    );
    
    if (availableOutlets.length > 0) {
      setOutletStock(prev => [
        ...prev,
        {
          outletId: availableOutlets[0].id,
          stock: 0
        }
      ]);
    }
  };

  const removeOutletStock = (index: number) => {
    setOutletStock(prev => prev.filter((_, i) => i !== index));
  };

  const updateOutletStock = (index: number, field: 'outletId' | 'stock', value: string | number) => {
    setOutletStock(prev => prev.map((os, i) => 
      i === index ? { ...os, [field]: value } : os
    ));
  };

  const getTotalAllocatedStock = () => {
    return outletStock.reduce((sum, os) => sum + os.stock, 0);
  };

  const getRemainingStock = () => {
    return formData.totalStock - getTotalAllocatedStock();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isView ? 'View Product' : (product ? 'Edit Product' : 'Add New Product')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Product Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter product name"
                disabled={isView}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Category *
              </label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => handleInputChange('categoryId', value)}
                disabled={isView}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter product description"
              rows={3}
              disabled={isView}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Total Stock *
              </label>
              <Input
                type="number"
                value={formData.totalStock}
                onChange={(e) => handleInputChange('totalStock', parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
                disabled={isView}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Rent Price (per day) *
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.rentPrice}
                onChange={(e) => handleInputChange('rentPrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                disabled={isView}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Deposit *
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.deposit}
                onChange={(e) => handleInputChange('deposit', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                disabled={isView}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Sale Price (Optional)
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.salePrice}
              onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              min="0"
              disabled={isView}
            />
          </div>

          {/* Outlet Stock Allocation */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Outlet Stock Allocation *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Total: {getTotalAllocatedStock()}/{formData.totalStock}
                </span>
                {!isView && getRemainingStock() > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {getRemainingStock()} remaining
                  </Badge>
                )}
                {!isView && getRemainingStock() < 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {Math.abs(getRemainingStock())} over-allocated
                  </Badge>
                )}
                {!isView && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOutletStock}
                    disabled={outletStock.length >= outlets.length}
                    className="text-xs"
                  >
                    Add Outlet
                  </Button>
                )}
              </div>
            </div>

            {outletStock.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p>No outlets allocated. Click "Add Outlet" to start.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {outletStock.map((os, index) => {
                  const outlet = outlets.find(o => o.id === os.outletId);
                  const availableOutlets = outlets.filter(o => 
                    !outletStock.some((os2, i) => i !== index && os2.outletId === o.id)
                  );

                  return (
                    <div key={index} className="flex items-center gap-2 p-3 border border-border rounded-lg bg-bg-card">
                      <div className="flex-1">
                        <Select
                          value={os.outletId}
                          onValueChange={(value) => updateOutletStock(index, 'outletId', value)}
                          disabled={isView}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select outlet" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOutlets.map((outlet) => (
                              <SelectItem key={outlet.id} value={outlet.id}>
                                {outlet.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          value={os.stock}
                          onChange={(e) => updateOutletStock(index, 'stock', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          min="0"
                          max={formData.totalStock}
                          className="text-center"
                          disabled={isView}
                        />
                      </div>
                      {!isView && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOutletStock(index)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            {isView ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || getRemainingStock() !== 0}
                >
                  {loading ? 'Saving...' : (product ? 'Update Product' : 'Add Product')}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
