'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ConfirmationDialog,
  Badge,
  useToast
} from '@rentalshop/ui';
import { PlanTable, PlanDialog } from '@rentalshop/ui';
import { Plus, Search, Filter } from 'lucide-react';
import { usePlansData } from '@rentalshop/hooks';
import type { Plan, PlanCreateInput, PlanUpdateInput } from '@rentalshop/types';

/**
 * ✅ MODERN PLANS PAGE (URL State Pattern)
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Clean data fetching with usePlansData hook
 * ✅ No duplicate state management
 * ✅ Server-side pagination (not client-side)
 * ✅ Request deduplication with useDedupedApi
 */
export default function PlansPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toastSuccess, toastError } = useToast();

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const status = searchParams.get('status') || 'all';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const sortBy = searchParams.get('sortBy') || 'sortOrder';
  const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

  // ============================================================================
  // DIALOG STATES
  // ============================================================================
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // ============================================================================
  // DATA FETCHING - Clean & Simple with Deduplication
  // ============================================================================
  
  // Memoize filters - usePlansData handles deduplication automatically
  const filters = useMemo(() => ({
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    page,
    limit,
    sortBy,
    sortOrder
  }), [search, status, page, limit, sortBy, sortOrder]);

  const { data, loading, error, refetch } = usePlansData({ filters });
  
  console.log('📊 Plans Page - Data state:', {
    hasData: !!data,
    plansCount: data?.plans?.length || 0,
    loading,
    error: error?.message
  });

  // ============================================================================
  // URL UPDATE HELPER - Update URL = Update Everything
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
    router.push(newURL, { scroll: false });
  }, [pathname, router, searchParams]);

  // ============================================================================
  // FILTER HANDLERS
  // ============================================================================
  
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateURL({ q: e.target.value, page: 1 });
  }, [updateURL]);

  const handleStatusFilterChange = useCallback((value: string) => {
    updateURL({ status: value, page: 1 });
  }, [updateURL]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleSort = useCallback((field: string) => {
    const newSortOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: field, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, updateURL]);

  // ============================================================================
  // PLAN ACTION HANDLERS
  // ============================================================================
  
  const handleCreatePlan = useCallback(() => {
    setSelectedPlan(null);
    setShowCreateForm(true);
  }, []);

  const handleViewPlan = useCallback((plan: Plan) => {
    setSelectedPlan(plan);
    setShowViewDialog(true);
  }, []);

  const handleEditPlan = useCallback((plan: Plan) => {
    console.log('🔧 Edit Plan clicked:', plan);
    setSelectedPlan(plan);
    setShowEditForm(true);
    setShowViewDialog(false); // Close view dialog if open
  }, []);

  const handleCloseViewDialog = useCallback(() => {
    setShowViewDialog(false);
    setSelectedPlan(null);
  }, []);

  const handleCloseEditDialog = useCallback((open: boolean) => {
    console.log('🔒 Edit Dialog onOpenChange:', open);
    if (!open) {
      setShowEditForm(false);
      setSelectedPlan(null);
    }
  }, []);

  const handleCloseCreateDialog = useCallback((open: boolean) => {
    if (!open) {
      setShowCreateForm(false);
      setSelectedPlan(null);
    }
  }, []);

  const handleDeletePlan = useCallback((plan: Plan) => {
    setDeletingPlan(plan);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingPlan) return;
    
    try {
      const { plansApi } = await import('@rentalshop/utils');
      
      const response = await plansApi.deletePlan(deletingPlan.id);
      if (response.success) {
        toastSuccess('Plan Deleted', `Plan "${deletingPlan.name}" has been deleted successfully`);
        setDeletingPlan(null);
        refetch(); // Refresh data
      } else {
        toastError('Delete Failed', response.error || 'Failed to delete plan');
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      toastError('Delete Failed', 'An error occurred while deleting the plan');
    }
  }, [deletingPlan, toastSuccess, toastError, refetch]);

  const handleSavePlan = useCallback(async (data: PlanCreateInput | PlanUpdateInput) => {
    try {
      setSavingPlan(true);
      const { plansApi } = await import('@rentalshop/utils');
      
      if (selectedPlan) {
        // Update existing plan
        const response = await plansApi.updatePlan(selectedPlan.id, data as PlanUpdateInput);
        if (response.success) {
          toastSuccess('Plan Updated', `Plan has been updated successfully`);
          setShowEditForm(false);
          setSelectedPlan(null);
          refetch(); // Refresh data
        } else {
          toastError('Update Failed', response.error || 'Failed to update plan');
        }
      } else {
        // Create new plan
        const response = await plansApi.createPlan(data as PlanCreateInput);
        if (response.success) {
          toastSuccess('Plan Created', `Plan has been created successfully`);
          setShowCreateForm(false);
          refetch(); // Refresh data
        } else {
          toastError('Create Failed', response.error || 'Failed to create plan');
        }
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      toastError('Save Failed', 'An error occurred while saving the plan');
    } finally {
      setSavingPlan(false);
    }
  }, [selectedPlan, toastSuccess, toastError, refetch]);
    
  const handleToggleStatus = useCallback(async (plan: Plan) => {
    try {
      const { plansApi } = await import('@rentalshop/utils');
      
      const response = await plansApi.updatePlan(plan.id, {
        ...plan,
        isActive: !plan.isActive
      });
      
      if (response.success) {
        toastSuccess(
          'Plan Updated',
          `Plan "${plan.name}" has been ${!plan.isActive ? 'activated' : 'deactivated'}`
        );
        refetch(); // Refresh data
      } else {
        toastError('Update Failed', response.error || 'Failed to update plan status');
      }
    } catch (error) {
      console.error('Error toggling plan status:', error);
      toastError('Update Failed', 'An error occurred while updating plan status');
    }
  }, [toastSuccess, toastError, refetch]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const plans = data?.plans || [];
  const totalPlans = data?.total || 0;

  // Debug logs
  console.log('🔍 Plans Page State:', {
    showEditForm,
    showCreateForm,
    selectedPlan: selectedPlan?.id,
    savingPlan
  });

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle subtitle="Create and manage subscription plans for merchants">
              Subscription Plans
            </PageTitle>
          </div>
            <Button onClick={handleCreatePlan}>
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
        </div>
      </PageHeader>

      {/* Fixed Filters Section */}
      <div className="flex-shrink-0 space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search plans..."
                  value={search}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
              <Select value={status} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 min-h-0 overflow-auto mt-4">
        <div className="flex flex-col h-full">
          <div className="flex-1 min-h-0">
        <PlanTable
              plans={plans}
              onView={handleViewPlan}
              onEdit={handleEditPlan}
              onDelete={handleDeletePlan}
              onToggleStatus={handleToggleStatus}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          loading={loading}
        />
          </div>

          {/* Pagination at bottom */}
          {totalPlans > 0 && data && data.total > data.limit && (
            <div className="flex-shrink-0 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {((data.currentPage - 1) * data.limit) + 1} to {Math.min(data.currentPage * data.limit, data.total)} of {data.total} plans
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.currentPage - 1)}
                    disabled={data.currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                      .filter(p => {
                        // Show first, last, current, and pages around current
                        return p === 1 || p === data.totalPages || 
                               Math.abs(p - data.currentPage) <= 1;
                      })
                      .map((p, i, arr) => (
                        <React.Fragment key={p}>
                          {i > 0 && arr[i - 1] !== p - 1 && (
                            <span className="px-2">...</span>
                          )}
                          <Button
                            variant={data.currentPage === p ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(p)}
                            className="w-10 h-9"
                          >
                            {p}
                          </Button>
                        </React.Fragment>
                      ))}
              </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.currentPage + 1)}
                    disabled={data.currentPage === data.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={!!deletingPlan}
        onOpenChange={(open) => !open && setDeletingPlan(null)}
        type="danger"
        title="Delete Plan"
        description={`Are you sure you want to delete plan "${deletingPlan?.name}"? This action cannot be undone.`}
        confirmText="Delete Plan"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingPlan(null)}
      />

      {/* View Plan Dialog */}
      {selectedPlan && (
        <Dialog open={showViewDialog} onOpenChange={handleCloseViewDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {selectedPlan.name}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-6 space-y-6">
              {/* Plan Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1 text-sm">{selectedPlan.description || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="mt-1 text-sm">
                    <Badge variant={selectedPlan.isActive ? 'default' : 'secondary'} className={selectedPlan.isActive ? 'bg-green-100 text-green-800' : ''}>
                      {selectedPlan.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Base Price</label>
                  <p className="mt-1 text-sm font-semibold">
                    {selectedPlan.currency} {selectedPlan.basePrice}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Trial Days</label>
                  <p className="mt-1 text-sm">{selectedPlan.trialDays} days</p>
                </div>
                {selectedPlan.isPopular && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Popular</label>
                    <p className="mt-1 text-sm">
                      <Badge variant="default" className="bg-yellow-100 text-yellow-800">Yes</Badge>
                    </p>
                  </div>
                )}
              </div>

              {/* Limits */}
              <div>
                <h4 className="text-lg font-semibold mb-3">Limits</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Outlets</label>
                    <p className="mt-1 text-sm font-semibold">{selectedPlan.limits?.outlets || 'Unlimited'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Users</label>
                    <p className="mt-1 text-sm font-semibold">{selectedPlan.limits?.users || 'Unlimited'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Products</label>
                    <p className="mt-1 text-sm font-semibold">{selectedPlan.limits?.products || 'Unlimited'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Customers</label>
                    <p className="mt-1 text-sm font-semibold">{selectedPlan.limits?.customers || 'Unlimited'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Orders</label>
                    <p className="mt-1 text-sm font-semibold">{selectedPlan.limits?.orders || 'Unlimited'}</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              {(() => {
                // Handle features - could be array, string (JSON), or missing
                let features: string[] = [];
                if (selectedPlan.features) {
                  if (Array.isArray(selectedPlan.features)) {
                    features = selectedPlan.features;
                  } else if (typeof selectedPlan.features === 'string') {
                    try {
                      features = JSON.parse(selectedPlan.features);
                    } catch {
                      features = [];
                    }
                  }
                }
                
                return features.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Features</h4>
                    <ul className="space-y-2">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm">
                          <span className="mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseViewDialog}>
                Close
              </Button>
              <Button onClick={() => {
                if (selectedPlan) {
                  handleEditPlan(selectedPlan);
                }
              }}>
                Edit Plan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Plan Dialog */}
      <PlanDialog
        open={showCreateForm}
        onOpenChange={handleCloseCreateDialog}
        mode="create"
        onSubmit={handleSavePlan}
        loading={savingPlan}
      />

      {/* Edit Plan Dialog */}
      <PlanDialog
        open={showEditForm}
        onOpenChange={handleCloseEditDialog}
        mode="edit"
        plan={selectedPlan || undefined}
        onSubmit={handleSavePlan}
        loading={savingPlan}
      />
    </PageWrapper>
  );
}
