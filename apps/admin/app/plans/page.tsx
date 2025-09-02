'use client';

import React, { useState, useEffect } from 'react';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button,
  PlanDialog,
  PlanForm,
  PlanTable,
  PlanFilters,
  PlanStats,
  ConfirmationDialog,
  ToastContainer,
  useToasts
} from '@rentalshop/ui';
import { PlanDetailModal } from '@rentalshop/ui';
import { plansApi } from '@rentalshop/utils';
import type { Plan, PlanFilters as PlanFiltersType } from '@rentalshop/types';
import { Plus } from 'lucide-react';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [viewingPlan, setViewingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('sortOrder');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { toasts, addToast, removeToast } = useToasts();

  useEffect(() => {
    fetchPlans();
  }, []);

  // Safety check to ensure plans is always an array
  useEffect(() => {
    if (!Array.isArray(plans)) {
      console.warn('Plans is not an array, resetting to empty array');
      setPlans([]);
    }
  }, [plans]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      const filters: PlanFiltersType = {
        search: searchTerm || undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        sortBy: sortBy as 'name' | 'price' | 'createdAt' | 'sortOrder',
        sortOrder: sortOrder,
        limit: 50
      };

      const response = await plansApi.getPlans(filters);
      
      console.log('🔍 Plans API Response:', response);
      console.log('🔍 Plans Data:', response.data);
      console.log('🔍 Plans Array:', response.data?.plans);
      
      if (response.success && response.data && Array.isArray(response.data.plans)) {
        setPlans(response.data.plans);
      } else {
        console.error('Failed to fetch plans:', response.message || 'Invalid response format');
        console.error('Response structure:', response);
        // Fallback to mock data for now
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      // Fallback to mock data for now
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handlePlanSubmit = async (data: any) => {
    try {
      if (editingPlan) {
        // Update existing plan
        const response = await plansApi.updatePlan(editingPlan.id, data);
        
        if (response.success && response.data) {
          // Update local state
          setPlans((plans || []).map(p => p.id === editingPlan.id ? response.data! : p));
          setEditingPlan(null);
        }
      } else {
        // Create new plan
        const response = await plansApi.createPlan(data);
        
        if (response.success && response.data) {
          // Add to local state
          setPlans([...(plans || []), response.data!]);
          setShowCreateForm(false);
        }
      }
    } catch (error) {
      console.error('Error submitting plan:', error);
    }
  };

  const handleToggleStatus = async (plan: Plan) => {
    try {
      const response = await plansApi.updatePlan(plan.id, {
        isActive: !plan.isActive
      });
      
      if (response.success && response.data) {
        setPlans((plans || []).map(p => p.id === plan.id ? response.data! : p));
      }
    } catch (error) {
      console.error('Error toggling plan status:', error);
    }
  };

  const handleDeletePlan = async (plan: Plan) => {
    setDeletingPlan(plan);
  };

  const confirmDeletePlan = async () => {
    if (!deletingPlan) return;

    try {
      const response = await plansApi.deletePlan(deletingPlan.id);
      
      if (response.success) {
        // Remove the plan from the local state
        setPlans((plans || []).filter(p => p.id !== deletingPlan.id));
        addToast('success', 'Plan Deleted', `The plan "${deletingPlan.name}" has been successfully deleted.`);
        setDeletingPlan(null);
      } else {
        console.error('Failed to delete plan:', response.message);
        addToast('error', 'Delete Failed', `Failed to delete plan: ${response.message}`);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
              addToast('error', 'Delete Failed', 'Error deleting plan. Please try again.');
    }
  };

  const cancelDeletePlan = () => {
    setDeletingPlan(null);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  // Filter and sort plans
  const filteredAndSortedPlans = (plans || [])
    .filter(plan => {
      const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           plan.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && plan.isActive) ||
                           (statusFilter === 'inactive' && !plan.isActive);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy as keyof Plan];
      let bValue: any = b[sortBy as keyof Plan];
      
      if (sortBy === 'price') {
        aValue = a.price;
        bValue = b.price;
      } else if (sortBy === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (sortBy === 'createdAt') {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  if (loading) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="animate-pulse">
            <div className="h-8 bg-bg-tertiary rounded w-1/4 mb-6"></div>
            <div className="h-12 bg-bg-tertiary rounded mb-6"></div>
            <div className="h-96 bg-bg-tertiary rounded"></div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex justify-between items-start">
          <div>
            <PageTitle subtitle="Create and manage subscription plans for merchants">
              Plan Management
            </PageTitle>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        {/* Filters */}
        <PlanFilters
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onSearchChange={setSearchTerm}
          onStatusFilterChange={setStatusFilter}
          onClearFilters={handleClearFilters}
        />

        {/* Plans Table */}
        <PlanTable
          plans={filteredAndSortedPlans || []}
          onView={setEditingPlan}
          onEdit={setEditingPlan}
          onDelete={handleDeletePlan}
          onToggleStatus={handleToggleStatus}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          loading={loading}
        />
      </PageContent>

      {/* Create/Edit Plan Dialog */}
      <PlanDialog
        open={showCreateForm || !!editingPlan}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateForm(false);
            setEditingPlan(null);
          }
        }}
        mode={showCreateForm ? 'create' : editingPlan ? 'edit' : 'view'}
        plan={editingPlan || undefined}
        onSubmit={handlePlanSubmit}
        loading={false}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={!!deletingPlan}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingPlan(null);
          }
        }}
        type="danger"
        title="Delete Plan"
        description={`Are you sure you want to delete the plan "${deletingPlan?.name}"? This action cannot be undone.`}
        confirmText="Delete Plan"
        cancelText="Cancel"
        onConfirm={confirmDeletePlan}
        onCancel={cancelDeletePlan}
      />

      {/* Toast Container for notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </PageWrapper>
  );
}
