'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';
// Disable prerendering to avoid module resolution issues

import React, { useState, useEffect } from 'react';
import { PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button,
  BillingCycleTable,
  BillingCycleForm,
  BillingCycleDetailDialog,
  ConfirmationDialog,
  useToast } from '@rentalshop/ui';
import { billingCyclesApi } from '@rentalshop/utils';
import { Plus, Search, Filter } from 'lucide-react';

export default function BillingCyclesPage() {
  const [billingCycles, setBillingCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCycle, setEditingCycle] = useState<any | null>(null);
  const [deletingCycle, setDeletingCycle] = useState<any | null>(null);
  const [viewingCycle, setViewingCycle] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('sortOrder');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { toastSuccess, toastError, toastWarning, toastInfo, removeToast } = useToast();

  useEffect(() => {
    fetchBillingCycles();
  }, []);

  const fetchBillingCycles = async () => {
    try {
      setLoading(true);
      
      const filters = {
        search: searchTerm || undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        sortBy: sortBy as any,
        sortOrder: sortOrder,
        limit: 50
      };

      const response = await billingCyclesApi.getBillingCycles(filters);
      
      if (response.success && response.data) {
        setBillingCycles(response.data.billingCycles || []);
      } else {
        console.error('Failed to fetch billing cycles:', response.message);
        toastError('Error', 'Failed to fetch billing cycles');
      }
    } catch (err) {
      console.error('Error fetching billing cycles:', err);
      toastError('Error', 'Failed to fetch billing cycles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCycle = async (data: any) => {
    try {
      const response = await billingCyclesApi.createBillingCycle(data);
      
      if (response.success) {
        setBillingCycles(prev => [response.data, ...prev]);
        setShowCreateForm(false);
        toastSuccess('Success', 'Billing cycle created successfully');
      } else {
        toastError('Error', response.message || 'Failed to create billing cycle');
      }
    } catch (err) {
      console.error('Error creating billing cycle:', err);
      toastError('Error', 'Failed to create billing cycle');
    }
  };

  const handleUpdateCycle = async (data: any) => {
    if (!editingCycle) return;
    
    try {
      const response = await billingCyclesApi.updateBillingCycle(editingCycle.id, data);
      
      if (response.success) {
        setBillingCycles(prev => 
          prev.map(cycle => 
            cycle.id === editingCycle.id ? response.data : cycle
          )
        );
        setEditingCycle(null);
        toastSuccess('Success', 'Billing cycle updated successfully');
      } else {
        toastError('Error', response.message || 'Failed to update billing cycle');
      }
    } catch (err) {
      console.error('Error updating billing cycle:', err);
      toastError('Error', 'Failed to update billing cycle');
    }
  };

  const handleDeleteCycle = async () => {
    if (!deletingCycle) return;
    
    try {
      const response = await billingCyclesApi.deleteBillingCycle(deletingCycle.id);
      
      if (response.success) {
        setBillingCycles(prev => prev.filter(cycle => cycle.id !== deletingCycle.id));
        setDeletingCycle(null);
        toastSuccess('Success', 'Billing cycle deleted successfully');
      } else {
        toastError('Error', response.message || 'Failed to delete billing cycle');
      }
    } catch (err) {
      console.error('Error deleting billing cycle:', err);
      toastError('Error', 'Failed to delete billing cycle');
    }
  };

  const handleToggleStatus = async (cycle: any) => {
    try {
      const response = await billingCyclesApi.updateBillingCycle(cycle.id, {
        isActive: !cycle.isActive
      });
      
      if (response.success) {
        setBillingCycles(prev => 
          prev.map(c => 
            c.id === cycle.id ? { ...c, isActive: !c.isActive } : c
          )
        );
        toastSuccess('Success', `Billing cycle ${cycle.isActive ? 'deactivated' : 'activated'} successfully`);
      } else {
        toastError('Error', response.message || 'Failed to update billing cycle status');
      }
    } catch (err) {
      console.error('Error updating billing cycle status:', err);
      toastError('Error', 'Failed to update billing cycle status');
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

  const filteredAndSortedCycles = billingCycles
    .filter(cycle => {
      if (statusFilter === 'active') return cycle.isActive;
      if (statusFilter === 'inactive') return !cycle.isActive;
      return true;
    })
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between">
          <PageTitle>Billing Cycles</PageTitle>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Billing Cycle
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search billing cycles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-bg-card text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Billing Cycles Table */}
        <BillingCycleTable
          billingCycles={filteredAndSortedCycles}
          onView={setViewingCycle}
          onEdit={setEditingCycle}
          onToggleStatus={handleToggleStatus}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          loading={loading}
        />

        {/* Create/Edit Form Dialog */}
        {(showCreateForm || editingCycle) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {editingCycle ? 'Edit Billing Cycle' : 'Create Billing Cycle'}
                </h2>
              </div>
              <div className="p-6">
                <BillingCycleForm
                  initialData={editingCycle || {}}
                  onSubmit={editingCycle ? handleUpdateCycle : handleCreateCycle}
                  onCancel={() => {
                    setShowCreateForm(false);
                    setEditingCycle(null);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Billing Cycle Detail Dialog */}
        <BillingCycleDetailDialog
          open={!!viewingCycle}
          onOpenChange={(open) => { if (!open) setViewingCycle(null); }}
          billingCycle={viewingCycle}
          onToggleStatus={handleToggleStatus}
          onEdit={setEditingCycle}
          onDelete={setDeletingCycle}
          loading={loading}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          open={!!deletingCycle}
          onOpenChange={(open) => { if (!open) setDeletingCycle(null); }}
          type="danger"
          title="Delete Billing Cycle"
          description={`Are you sure you want to delete the billing cycle "${deletingCycle?.name}"? This action cannot be undone.`}
          confirmText="Delete Billing Cycle"
          cancelText="Cancel"
          onConfirm={handleDeleteCycle}
          onCancel={() => setDeletingCycle(null)}
        />

        {/* Toast Notifications */}
      </PageContent>
    </PageWrapper>
  );
}
