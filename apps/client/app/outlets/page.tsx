'use client';

import React, { useCallback, useMemo, useTransition, useRef, useState } from 'react';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Outlets,
  useToast,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ConfirmationDialog,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
  Button
} from '@rentalshop/ui';
import { Plus, Download } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth, useOutletsData, useCanExportData } from '@rentalshop/hooks';
import { outletsApi } from '@rentalshop/utils';
import type { OutletFilters, Outlet, OutletUpdateInput } from '@rentalshop/types';

interface OutletFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  description: string;
}

/**
 * ✅ MODERN NEXT.JS 13+ OUTLETS PAGE - URL STATE PATTERN
 */
export default function OutletsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const canExport = useCanExportData();
  const [isPending, startTransition] = useTransition();
  
  // Dialog states
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [outletToDisable, setOutletToDisable] = useState<Outlet | null>(null);
  const [formData, setFormData] = useState<OutletFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phone: '',
    description: ''
  });

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const merchantId = user?.merchant?.id || user?.merchantId;
  
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  const filtersRef = useRef<OutletFilters | null>(null);
  const filters: OutletFilters = useMemo(() => {
    const newFilters: OutletFilters = {
      q: search || undefined,
      merchantId: merchantId ? Number(merchantId) : undefined,
      isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
      page,
      limit,
      sortBy,
      sortOrder
    };
    
    const filterString = JSON.stringify(newFilters);
    const prevFilterString = JSON.stringify(filtersRef.current);
    
    if (filterString === prevFilterString && filtersRef.current) {
      return filtersRef.current;
    }
    
    filtersRef.current = newFilters;
    return newFilters;
  }, [search, merchantId, status, page, limit, sortBy, sortOrder]);

  const { data, loading, error } = useOutletsData({ 
    filters,
    debounceSearch: true,
    debounceMs: 500
  });

  // ============================================================================
  // URL UPDATE HELPER
  // ============================================================================
  
  const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    
    const newURL = `${pathname}?${params.toString()}`;
    startTransition(() => {
      router.push(newURL, { scroll: false });
    });
  }, [pathname, router, searchParams, startTransition]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleSearchChange = useCallback((searchValue: string) => {
    updateURL({ q: searchValue, page: 1 });
  }, [updateURL]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleSort = useCallback((column: string) => {
    const newSortBy = column;
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: newSortBy, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, updateURL]);

  const handleOutletAction = useCallback(async (action: string, outletId: number) => {
    const outlet = data?.outlets.find(o => o.id === outletId);
    
    switch (action) {
      case 'view':
        if (outlet) {
          setSelectedOutlet(outlet);
          setShowViewDialog(true);
        }
        break;
        
      case 'edit':
        // Show edit dialog
        if (outlet) {
          setSelectedOutlet(outlet);
    setFormData({
      name: outlet.name,
      address: outlet.address || '',
      city: (outlet as any).city || '',
      state: (outlet as any).state || '',
      zipCode: (outlet as any).zipCode || '',
      country: (outlet as any).country || '',
      phone: outlet.phone || '',
      description: outlet.description || ''
    });
          setShowEditDialog(true);
        }
        break;

      case 'disable':
      case 'enable':
        if (outlet) {
    if (outlet.isActive) {
      setOutletToDisable(outlet);
      setShowDisableConfirm(true);
          } else {
    try {
              const response = await outletsApi.updateOutlet(outletId, { 
                id: outletId,
        isActive: true 
      });
              if (response.success) {
        toastSuccess('Outlet enabled successfully', `Outlet "${outlet.name}" has been enabled`);
                router.refresh();
      } else {
                toastError('Failed to enable outlet', response.error || 'Unknown error occurred');
      }
    } catch (err) {
              toastError('Error enabling outlet', 'An unexpected error occurred');
            }
          }
        }
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  }, [data?.outlets, router, toastSuccess, toastError]);

  const handleConfirmDisable = useCallback(async () => {
    if (!outletToDisable) return;
    
    try {
      const response = await outletsApi.updateOutlet(outletToDisable.id, { 
        id: outletToDisable.id,
        isActive: false 
      });
      if (response.success) {
        toastSuccess('Outlet disabled successfully', `Outlet "${outletToDisable.name}" has been disabled`);
        router.refresh();
      } else {
        toastError('Failed to disable outlet', response.error || 'Unknown error occurred');
      }
    } catch (err) {
      toastError('Error disabling outlet', 'An unexpected error occurred');
    } finally {
      setShowDisableConfirm(false);
      setOutletToDisable(null);
    }
  }, [outletToDisable, router, toastSuccess, toastError]);
  
  // Handle outlet update from edit dialog
  const handleOutletUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutlet) return;
    
    try {
      const response = await outletsApi.updateOutlet(selectedOutlet.id, {
        id: selectedOutlet.id,
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
        phone: formData.phone,
        description: formData.description
      });
      
      if (response.success) {
        toastSuccess('Outlet updated successfully', `Outlet "${formData.name}" has been updated`);
        setShowEditDialog(false);
        setSelectedOutlet(null);
        router.refresh();
      } else {
        toastError('Failed to update outlet', response.error || 'Unknown error occurred');
      }
    } catch (err) {
      toastError('Error updating outlet', 'An unexpected error occurred');
    }
  }, [selectedOutlet, formData, router, toastSuccess, toastError]);

  // ============================================================================
  // TRANSFORM DATA
  // ============================================================================
  
  const outletData = useMemo(() => {
    if (!data) {
      return {
        outlets: [],
        total: 0,
        page: 1,
        totalPages: 1,
        limit: 25,
        hasMore: false
      };
    }

    return {
      outlets: data.outlets,
      total: data.total,
      page: data.currentPage,
      totalPages: data.totalPages,
      limit: data.limit,
      hasMore: data.hasMore
    };
  }, [data]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!merchantId) {
    return (
      <PageWrapper>
        <PageContent>
          <Card>
            <CardContent className="p-8 text-center text-gray-600">
              <div className="mb-4">Merchant ID not found</div>
              <div className="text-sm text-gray-500">Please log in again to access this page</div>
            </CardContent>
          </Card>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Outlets</PageTitle>
            <p className="text-sm text-gray-600">Manage your business outlets and branches</p>
          </div>
          <div className="flex gap-3">
            {canExport && (
              <Button
                onClick={() => {
                  toastSuccess('Export Feature', 'Export functionality coming soon!');
                }}
                variant="default"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            <Button 
              onClick={() => router.push('/outlets/create')}
              variant="success"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Outlet
            </Button>
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-auto">
        <Outlets
          data={outletData}
          filters={filters}
          onSearchChange={handleSearchChange}
          onOutletAction={handleOutletAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
        />
      </div>

      {/* View Outlet Dialog */}
      {selectedOutlet && (
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Outlet Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-700">Outlet Name</p>
                  <p className="mt-1 text-gray-900 font-medium">{selectedOutlet.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Phone</p>
                  <p className="mt-1 text-gray-900">{selectedOutlet.phone || 'N/A'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-700">Address</p>
                  <p className="mt-1 text-gray-900">{selectedOutlet.address || 'N/A'}</p>
                </div>
                {selectedOutlet.description && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-700">Description</p>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">{selectedOutlet.description}</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Outlet Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Outlet: {selectedOutlet?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOutletUpdate} className="space-y-4">
            <div>
              <Label htmlFor="name">Outlet Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter outlet name"
                required
              />
            </div>
            
            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
              
              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter street address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Enter city"
                  />
                </div>

                <div>
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="Enter state"
                  />
                </div>

                <div>
                  <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                    placeholder="Enter ZIP code"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Enter country"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter outlet phone number"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter outlet description"
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedOutlet(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Update Outlet
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disable Confirmation Dialog */}
      <ConfirmationDialog
        open={showDisableConfirm}
        onOpenChange={setShowDisableConfirm}
        type="warning"
        title="Disable Outlet"
        description={`Are you sure you want to disable outlet "${outletToDisable?.name}"? This will stop new orders from being created for this outlet.`}
        confirmText="Disable Outlet"
        cancelText="Cancel"
        onConfirm={handleConfirmDisable}
        onCancel={() => {
          setShowDisableConfirm(false);
          setOutletToDisable(null);
        }}
      />
    </PageWrapper>
  );
}
