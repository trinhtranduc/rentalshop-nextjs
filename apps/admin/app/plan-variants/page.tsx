'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

// Disable prerendering to avoid module resolution issues

import React, { useState, useEffect } from 'react';
import { Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button,
  StatusBadge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  Toast,
  useToast } from '@rentalshop/ui';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Package,
  Users,
  CreditCard,
  Calendar,
  Star,
  TrendingUp,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Settings,
  RotateCcw,
  Percent,
  DollarSign,
  Clock,
  RefreshCw
} from 'lucide-react';

// Import the PlanVariant type from the types package
import type { PlanVariant, Plan } from '@rentalshop/types';
import PlanVariantForm from '../components/PlanVariantForm';

export default function PlanVariantsPage() {
  const [variants, setVariants] = useState<PlanVariant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<PlanVariant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('sortOrder');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState<'active' | 'recycle'>('active');
  const [deletedVariants, setDeletedVariants] = useState<PlanVariant[]>([]);
  
  // Confirm dialog states
  const [deletingVariant, setDeletingVariant] = useState<PlanVariant | null>(null);
  const [restoringVariant, setRestoringVariant] = useState<PlanVariant | null>(null);
  const [bulkDiscountPlan, setBulkDiscountPlan] = useState<{ planId: string; discount: number } | null>(null);
  
  // Toast hook
  const { toastSuccess, showError } = useToast();

  useEffect(() => {
    fetchVariants();
    fetchPlans();
    
    // Check for planId query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get('planId');
    if (planId) {
      setPlanFilter(planId);
    }
  }, []);

  // Refetch variants when status filter changes
  useEffect(() => {
    fetchVariants();
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === 'recycle') {
      fetchDeletedVariants();
    }
  }, [activeTab]);

  const fetchVariants = async () => {
    try {
      setLoading(true);
      
      const { planVariantsApi } = await import('@rentalshop/utils');
      
      // Build filters based on current status filter
      const filters: any = {};
      if (statusFilter === 'active') {
        filters.isActive = true;
      } else if (statusFilter === 'inactive') {
        filters.isActive = false;
      }
      // If statusFilter is 'all', don't set isActive filter to get all variants
      
      const response = await planVariantsApi.getPlanVariants(filters);
      
      if (response.success && response.data) {
        setVariants(response.data.variants || []);
      } else {
        console.error('Failed to fetch plan variants:', response.error);
      }
    } catch (error) {
      console.error('Error fetching plan variants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { plansApi } = await import('@rentalshop/utils');
      const response = await plansApi.getPlans();
      
      if (response.success && response.data) {
        setPlans(response.data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchDeletedVariants = async () => {
    try {
      const { planVariantsApi } = await import('@rentalshop/utils');
      const response = await planVariantsApi.getDeletedPlanVariants();
      
      if (response.success && response.data) {
        setDeletedVariants(response.data.variants || []);
      }
    } catch (error) {
      console.error('Error fetching deleted variants:', error);
    }
  };

  const handleDelete = async (variantId: number) => {
    try {
      const { planVariantsApi } = await import('@rentalshop/utils');
      const response = await planVariantsApi.deletePlanVariant(variantId);
      
      if (response.success) {
        await fetchVariants();
        await fetchDeletedVariants();
        setDeletingVariant(null);
        toastSuccess("Plan variant deleted successfully");
      } else {
        toastError(`Failed to delete plan variant: ${response.error}`);
      }
    } catch (error) {
      console.error('Error deleting plan variant:', error);
      toastError("Error deleting plan variant");
    }
  };

  const handleRestore = async (variantId: number) => {
    try {
      const { planVariantsApi } = await import('@rentalshop/utils');
      const response = await planVariantsApi.restorePlanVariant(variantId);
      
      if (response.success) {
        await fetchVariants();
        await fetchDeletedVariants();
        setRestoringVariant(null);
        toastSuccess("Plan variant restored successfully");
      } else {
        toastError(`Failed to restore plan variant: ${response.error}`);
      }
    } catch (error) {
      console.error('Error restoring plan variant:', error);
      toastError("Error restoring plan variant");
    }
  };

  const handleBulkDiscount = async (planId: string, discount: number) => {
    try {
      const { planVariantsApi } = await import('@rentalshop/utils');
      const response = await planVariantsApi.bulkOperation('apply_discount', planId, discount);
      
      if (response.success) {
        await fetchVariants();
        setBulkDiscountPlan(null);
        toastSuccess(`Applied ${discount}% discount to variants`);
      } else {
        toastError(`Failed to apply discount: ${response.error}`);
      }
    } catch (error) {
      console.error('Error applying discount:', error);
      toastError("Error applying discount");
    }
  };

  const handleSaveVariant = async (variantData: Partial<PlanVariant>) => {
    try {
      const { planVariantsApi } = await import('@rentalshop/utils');
      
      const response = editingVariant 
        ? await planVariantsApi.updatePlanVariant(editingVariant.id, variantData as any)
        : await planVariantsApi.createPlanVariant(variantData as any);
      
      if (response.success) {
        await fetchVariants();
        setShowCreateForm(false);
        setEditingVariant(null);
        toastSuccess(editingVariant ? "Plan variant updated successfully" : "Plan variant created successfully");
      } else {
        toastError(`Failed to save plan variant: ${response.error}`);
      }
    } catch (error) {
      console.error('Error saving plan variant:', error);
      toastError("Error saving plan variant");
    }
  };

  // Filter and sort variants
  const filteredVariants = variants.filter(variant => {
    const matchesSearch = variant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         variant.plan?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'all' || variant.planId.toString() === planFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && variant.isActive) ||
                         (statusFilter === 'inactive' && !variant.isActive);
    
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const sortedVariants = [...filteredVariants].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'price':
        aValue = a.price;
        bValue = b.price;
        break;
      case 'duration':
        aValue = a.duration;
        bValue = b.duration;
        break;
      case 'discount':
        aValue = a.discount;
        bValue = b.discount;
        break;
      default:
        aValue = a.sortOrder;
        bValue = b.sortOrder;
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
            <PageTitle subtitle="Manage plan variants with different pricing and durations">
              Plan Variants Management
            </PageTitle>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Variant
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-8">
              <Button
                variant="ghost"
                onClick={() => setActiveTab('active')}
                className={`py-2 px-1 border-b-2 font-medium text-sm rounded-none ${
                  activeTab === 'active'
                    ? 'border-action-primary text-action-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                }`}
              >
                <Package className="w-4 h-4 mr-2 inline" />
                Active Variants ({variants.length})
              </Button>
              <Button
                variant="ghost"
                onClick={() => setActiveTab('recycle')}
                className={`py-2 px-1 border-b-2 font-medium text-sm rounded-none ${
                  activeTab === 'recycle'
                    ? 'border-action-primary text-action-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                }`}
              >
                <RotateCcw className="w-4 h-4 mr-2 inline" />
                Recycle Bin ({deletedVariants.length})
              </Button>
            </nav>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                <Input
                  placeholder="Search variants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sortOrder-asc">Sort Order (A-Z)</SelectItem>
                  <SelectItem value="sortOrder-desc">Sort Order (Z-A)</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="price-asc">Price (Low-High)</SelectItem>
                  <SelectItem value="price-desc">Price (High-Low)</SelectItem>
                  <SelectItem value="duration-asc">Duration (Short-Long)</SelectItem>
                  <SelectItem value="duration-desc">Duration (Long-Short)</SelectItem>
                  <SelectItem value="discount-asc">Discount (Low-High)</SelectItem>
                  <SelectItem value="discount-desc">Discount (High-Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Plan Variants Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {activeTab === 'active' ? 'Active Plan Variants' : 'Deleted Plan Variants'} ({activeTab === 'active' ? sortedVariants.length : deletedVariants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === 'active' ? (
              sortedVariants.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">No plan variants found</h3>
                  <p className="text-text-secondary mb-4">
                    {searchTerm || planFilter !== 'all' || statusFilter !== 'all' 
                      ? 'Try adjusting your filters to see more results.'
                      : 'Get started by creating your first plan variant'
                    }
                  </p>
                  {!searchTerm && planFilter === 'all' && statusFilter === 'all' && (
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Plan Variant
                    </Button>
                  )}
                </div>
              ) : (
                /* Card-style rows */
                <div className="space-y-4">
                {sortedVariants.map((variant) => (
                  <Card 
                    key={variant.id} 
                    className="hover:shadow-md transition-shadow duration-200 border-border"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        {/* Left side - Main info */}
                        <div className="flex items-center gap-4 flex-1">
                          {/* Variant Icon */}
                          <div className="w-12 h-12 bg-gradient-to-br from-action-primary to-brand-primary rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                          </div>
                          
                          {/* Variant Details */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-text-primary">
                                {variant.name}
                              </h3>
                              {variant.isPopular && (
                                <Badge variant="default" className="text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  Popular
                                </Badge>
                              )}
                              <StatusBadge 
                                status={variant.isActive ? 'active' : 'inactive'}
                              />
                            </div>
                            
                            <div className="flex items-center gap-2 mb-3">
                              <Package className="w-4 h-4 text-text-tertiary" />
                              <span className="text-sm text-text-secondary">
                                {variant.plan?.name || 'Unknown Plan'}
                              </span>
                            </div>
                            
                            {/* Variant Stats */}
                            <div className="flex items-center gap-6 text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-text-tertiary" />
                                <span className="text-text-secondary">Duration:</span>
                                <span className="font-medium text-text-primary">
                                  {variant.duration} month{variant.duration !== 1 ? 's' : ''}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4 text-text-tertiary" />
                                <span className="text-text-secondary">Price:</span>
                                <span className="font-medium text-text-primary">
                                  ${variant.price.toFixed(2)}
                                </span>
                              </div>
                              
                              {variant.discount > 0 && (
                                <div className="flex items-center gap-1">
                                  <Percent className="w-4 h-4 text-text-tertiary" />
                                  <span className="text-text-secondary">Discount:</span>
                                  <span className="font-medium text-action-success">
                                    {variant.discount}%
                                  </span>
                                </div>
                              )}
                              
                              {variant.savings > 0 && (
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-4 h-4 text-action-success" />
                                  <span className="text-text-secondary">Savings:</span>
                                  <span className="font-medium text-action-success">
                                    ${variant.savings.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Right side - Actions */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-sm text-text-secondary mr-4">
                            <Users className="w-4 h-4" />
                            <span>{variant.subscriptionCount || 0} subscriptions</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingVariant(variant)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingVariant(variant)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                            {variant.planId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBulkDiscountPlan({ planId: variant.planId.toString(), discount: 20 })}
                              >
                                Apply 20% Discount
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                </div>
              )
            ) : (
              // Recycle Bin Content
              deletedVariants.length === 0 ? (
                <div className="text-center py-12">
                  <RotateCcw className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">Recycle bin is empty</h3>
                  <p className="text-text-secondary">
                    Deleted plan variants will appear here and can be restored.
                  </p>
                </div>
              ) : (
                /* Card-style rows for deleted variants */
                <div className="space-y-4">
                  {deletedVariants.map((variant) => (
                    <Card 
                      key={variant.id} 
                      className="hover:shadow-md transition-shadow duration-200 border-border opacity-75"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          {/* Left side - Main info */}
                          <div className="flex items-center gap-4 flex-1">
                            {/* Variant Icon */}
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center">
                              <Package className="w-6 h-6 text-white" />
                            </div>
                            
                            {/* Variant Details */}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-text-primary">
                                  {variant.name}
                                </h3>
                                {variant.isPopular && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Star className="w-3 h-3 mr-1" />
                                    Popular
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs text-red-600">
                                  Deleted
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-3">
                                <Package className="w-4 h-4 text-text-tertiary" />
                                <span className="text-sm text-text-secondary">
                                  {variant.plan?.name || 'Unknown Plan'}
                                </span>
                              </div>
                              
                              {/* Variant Stats */}
                              <div className="flex items-center gap-6 text-sm">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 text-text-tertiary" />
                                  <span className="text-text-secondary">Duration:</span>
                                  <span className="font-medium text-text-primary">
                                    {variant.duration} month{variant.duration !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4 text-text-tertiary" />
                                  <span className="text-text-secondary">Price:</span>
                                  <span className="font-medium text-text-primary">
                                    ${variant.price.toFixed(2)}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4 text-text-tertiary" />
                                  <span className="text-text-secondary">Deleted:</span>
                                  <span className="font-medium text-text-primary">
                                    {variant.deletedAt ? new Date(variant.deletedAt).toLocaleDateString() : 'Unknown'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right side - Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRestoringVariant(variant)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              Restore
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Plan Variant Form */}
        <PlanVariantForm
          isOpen={showCreateForm || !!editingVariant}
          onClose={() => {
            setShowCreateForm(false);
            setEditingVariant(null);
          }}
          variant={editingVariant}
          plans={plans}
          onSave={handleSaveVariant}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletingVariant} onOpenChange={() => setDeletingVariant(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Plan Variant</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deletingVariant?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingVariant(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => deletingVariant && handleDelete(deletingVariant.id)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore Confirmation Dialog */}
        <Dialog open={!!restoringVariant} onOpenChange={() => setRestoringVariant(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restore Plan Variant</DialogTitle>
              <DialogDescription>
                Are you sure you want to restore "{restoringVariant?.name}"? This will make it active again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRestoringVariant(null)}>
                Cancel
              </Button>
              <Button 
                variant="default" 
                onClick={() => restoringVariant && handleRestore(restoringVariant.id)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                Restore
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Discount Confirmation Dialog */}
        <Dialog open={!!bulkDiscountPlan} onOpenChange={() => setBulkDiscountPlan(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply Bulk Discount</DialogTitle>
              <DialogDescription>
                Are you sure you want to apply {bulkDiscountPlan?.discount}% discount to all variants of this plan? This action will affect all variants.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDiscountPlan(null)}>
                Cancel
              </Button>
              <Button 
                variant="default" 
                onClick={() => bulkDiscountPlan && handleBulkDiscount(bulkDiscountPlan.planId, bulkDiscountPlan.discount)}
              >
                Apply Discount
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContent>
    </PageWrapper>
  );
}
