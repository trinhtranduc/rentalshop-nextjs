'use client';

import '../lists.css';
import '../details.css';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  Button,
  Card,
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
  Pagination,
  useToast
} from '@rentalshop/ui';
import { PlanTable, PlanDialog } from '@rentalshop/ui';
import { Check, Plus, Search } from 'lucide-react';
import { usePlansData } from '@rentalshop/hooks';
import type { Plan, PlanCreateInput, PlanUpdateInput } from '@rentalshop/types';
import type { PlanBillingInterval } from '@rentalshop/utils';
import { planStripePricesApi } from '@rentalshop/utils';

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
  const [loadingViewPlan, setLoadingViewPlan] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [showStripePricesDialog, setShowStripePricesDialog] = useState(false);
  const [stripePricesLoading, setStripePricesLoading] = useState(false);
  const [stripePricesSaving, setStripePricesSaving] = useState(false);
  const [stripePrices, setStripePrices] = useState<Partial<Record<PlanBillingInterval, string>>>({});
  const [stripePricesCurrency, setStripePricesCurrency] = useState<string>('');

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
      // Special handling for page: always set it, even if it's 1
      if (key === 'page') {
        const pageNum = typeof value === 'number' ? value : parseInt(String(value || '0'));
        if (pageNum > 0) {
          params.set(key, pageNum.toString());
        } else {
          params.delete(key);
        }
      } else if (value && value !== '' && value !== 'all') {
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

  // Auto-load plan when view dialog opens
  useEffect(() => {
    const loadPlanForView = async () => {
      if (!showViewDialog || !selectedPlan?.id) {
        return;
      }

      try {
        setLoadingViewPlan(true);
        const { plansApi } = await import('@rentalshop/utils');
        
        const response = await plansApi.getPlanById(selectedPlan.id);
        
        if (response.success && response.data) {
          // Transform plan data to ensure limits and features are parsed
          const planData = response.data;
          const transformedPlan: Plan = {
            ...planData,
            limits: typeof planData.limits === 'string' 
              ? JSON.parse(planData.limits) 
              : planData.limits || {},
            features: typeof planData.features === 'string'
              ? JSON.parse(planData.features || '[]')
              : (Array.isArray(planData.features) ? planData.features : [])
          };
          
          setSelectedPlan(transformedPlan);
        }
      } catch (error) {
        console.error('Error loading plan for view:', error);
        // Don't show error toast, just use existing plan data
      } finally {
        setLoadingViewPlan(false);
      }
    };

    loadPlanForView();
  }, [showViewDialog, selectedPlan?.id]);

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

  const openStripePricesDialog = useCallback(async (plan: Plan) => {
    setSelectedPlan(plan);
    setShowStripePricesDialog(true);
    setStripePricesLoading(true);
    setStripePricesCurrency(plan.currency || '');
    try {
      const resp = await planStripePricesApi.get(plan.id);
      if (resp.success && resp.data) {
        const next: Partial<Record<PlanBillingInterval, string>> = {};
        for (const item of resp.data.items || []) {
          next[item.billingInterval] = item.stripePriceId;
          if (item.currency) setStripePricesCurrency(String(item.currency));
        }
        setStripePrices(next);
      } else {
        setStripePrices({});
      }
    } catch (e) {
      console.error('Failed to load stripe prices:', e);
      setStripePrices({});
    } finally {
      setStripePricesLoading(false);
    }
  }, []);

  const handleSaveStripePrices = useCallback(async () => {
    if (!selectedPlan?.id) return;
    setStripePricesSaving(true);
    try {
      const resp = await planStripePricesApi.upsert(selectedPlan.id, {
        currency: stripePricesCurrency || undefined,
        prices: stripePrices,
      });
      if (resp.success) {
        toastSuccess('Saved', 'Stripe prices updated');
        setShowStripePricesDialog(false);
      } else {
        toastError('Save failed', resp.message || 'Could not update Stripe prices');
      }
    } catch (e) {
      console.error('Failed to save stripe prices:', e);
      toastError('Save failed', 'Could not update Stripe prices');
    } finally {
      setStripePricesSaving(false);
    }
  }, [selectedPlan?.id, stripePrices, stripePricesCurrency, toastError, toastSuccess]);

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
    <PageWrapper spacing="none" className="admin-list h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
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
      <div className="flex-shrink-0">
        <Card className="mb-3">
          <CardContent className="p-4">
            <div className="flex gap-3">
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
      <div className="flex-1 min-h-0 overflow-auto mt-2">
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

          {/* Pagination at bottom - Standard Pattern */}
          {totalPlans > 0 && data && data.total > data.limit && (
            <div className="flex-shrink-0 py-4">
              <Pagination
                currentPage={data.currentPage || data.page || 1}
                totalPages={data.totalPages || Math.ceil(data.total / data.limit)}
                total={data.total}
                limit={data.limit}
                onPageChange={handlePageChange}
                itemName="plans"
              />
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

      {/* View Plan Dialog (plan detail, #882 portal style) */}
      {selectedPlan && (
        <Dialog open={showViewDialog} onOpenChange={handleCloseViewDialog}>
          <DialogContent className="ar-dialog w-full md:max-w-lg max-h-[90vh] overflow-y-auto max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:max-w-full max-md:rounded-none max-md:border-0 max-md:top-0 max-md:left-0 max-md:translate-x-0 max-md:translate-y-0 max-md:p-4 max-md:content-start">
            <DialogHeader className="max-md:pr-10">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-xl">
                {selectedPlan.name}
                <span className={`ar-pill ar-pill-${selectedPlan.isActive ? 'success' : 'neutral'}`}>
                  {selectedPlan.isActive ? 'Active' : 'Inactive'}
                </span>
                {selectedPlan.isPopular && <span className="ar-pill ar-pill-warning">Popular</span>}
              </DialogTitle>
            </DialogHeader>

            {loadingViewPlan ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-action-primary"></div>
                  <p className="text-text-secondary">Loading plan data...</p>
                </div>
              </div>
            ) : (
            <div className="space-y-5">
              {/* Plan Info */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-ar-muted">Description</dt>
                  <dd className="mt-1 text-sm text-ar-ink">{selectedPlan.description || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-ar-muted">Base Price</dt>
                  <dd className="mt-1 text-sm font-semibold text-ar-ink tabular-nums">
                    {selectedPlan.currency} {selectedPlan.basePrice}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-ar-muted">Trial Days</dt>
                  <dd className="mt-1 text-sm text-ar-ink">{selectedPlan.trialDays} days</dd>
                </div>
              </dl>

              {/* Limits */}
              <section className="border-t border-ar-line pt-4">
                <h4 className="text-base font-semibold text-ar-ink mb-3">Limits</h4>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {([
                    ['Outlets', selectedPlan.limits?.outlets],
                    ['Users', selectedPlan.limits?.users],
                    ['Products', selectedPlan.limits?.products],
                    ['Customers', selectedPlan.limits?.customers],
                    ['Orders', selectedPlan.limits?.orders],
                  ] as Array<[string, number | undefined]>).map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-ar-line bg-ar-surface-muted px-3 py-2">
                      <dt className="text-xs font-medium text-ar-muted">{label}</dt>
                      <dd className="text-sm font-semibold text-ar-ink tabular-nums">{value || 'Unlimited'}</dd>
                    </div>
                  ))}
                </dl>
              </section>

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
                  <section className="border-t border-ar-line pt-4">
                    <h4 className="text-base font-semibold text-ar-ink mb-3">Features</h4>
                    <ul className="space-y-2">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-ar-ink-2">
                          <Check className="mt-0.5 h-4 w-4 flex-none text-ar-primary" aria-hidden />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })()}

            <div className="ar-dialog-footer flex flex-wrap justify-end gap-2 border-t border-ar-line pt-4 max-md:[&>button]:flex-1">
              <Button variant="outline" onClick={handleCloseViewDialog}>
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => openStripePricesDialog(selectedPlan)}
              >
                Stripe Prices
              </Button>
              <Button onClick={() => {
                if (selectedPlan) {
                  handleEditPlan(selectedPlan);
                }
              }}>
                Edit Plan
              </Button>
            </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Stripe Prices Dialog */}
      {selectedPlan && (
        <Dialog open={showStripePricesDialog} onOpenChange={setShowStripePricesDialog}>
          <DialogContent className="ar-dialog w-full md:max-w-lg max-h-[90vh] overflow-y-auto max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:max-w-full max-md:rounded-none max-md:border-0 max-md:top-0 max-md:left-0 max-md:translate-x-0 max-md:translate-y-0 max-md:p-4 max-md:content-start">
            <DialogHeader className="max-md:pr-10">
              <DialogTitle>Stripe Prices</DialogTitle>
            </DialogHeader>

            {stripePricesLoading ? (
              <div className="py-8 text-sm text-text-secondary">Loading...</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium">Currency (optional)</label>
                    <Input
                      value={stripePricesCurrency}
                      onChange={(e) => setStripePricesCurrency(e.target.value)}
                      placeholder="VND / USD"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={() => window.open('https://dashboard.stripe.com/test/prices', '_blank')}
                  >
                    Open Stripe
                  </Button>
                </div>

                {([
                  ['monthly', 'Monthly'],
                  ['quarterly', 'Quarterly (3 months)'],
                  ['semi_annual', 'Semi-annual (6 months)'],
                  ['annual', 'Annual (12 months)'],
                ] as Array<[PlanBillingInterval, string]>).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-sm font-medium">{label}</label>
                    <Input
                      value={stripePrices[key] || ''}
                      onChange={(e) => setStripePrices((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder="price_..."
                    />
                  </div>
                ))}

                <div className="ar-dialog-footer flex justify-end gap-2 border-t border-ar-line pt-4 max-md:[&>button]:flex-1">
                  <Button variant="outline" onClick={() => setShowStripePricesDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveStripePrices} disabled={stripePricesSaving}>
                    {stripePricesSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            )}
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
