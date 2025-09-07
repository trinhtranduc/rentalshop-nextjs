'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
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
  Textarea,
  Label,
  PlanForm,
  LimitInput
} from '@rentalshop/ui';
import { 
  Plus, 
  Package,
  Users,
  CreditCard,
  Calendar,
  Star,
  TrendingUp,
  Search,
  Settings2,
  DollarSign
} from 'lucide-react';

// Import the Plan type from the types package
import type { Plan } from '@rentalshop/types';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [viewingPlan, setViewingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<Partial<Plan>>({
    name: '',
    description: '',
    basePrice: 0,
    currency: 'USD',
    trialDays: 14,
    limits: {
      outlets: 1,
      users: 3,
      products: 100,
      customers: -1 // Unlimited customers by default
    },
    features: [],
    isActive: true,
    isPopular: false,
    sortOrder: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('sortOrder');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchPlans();
  }, []);

  // Refetch plans when status filter changes
  useEffect(() => {
    fetchPlans();
  }, [statusFilter]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      const { plansApi } = await import('@rentalshop/utils');
      
      // Build filters based on current status filter
      const filters: any = {};
      if (statusFilter === 'active') {
        filters.isActive = true;
      } else if (statusFilter === 'inactive') {
        filters.isActive = false;
      } else if (statusFilter === 'all') {
        // For 'all', we need to make two API calls to get both active and inactive
        // Or modify the API to accept a special parameter
        filters.includeInactive = true;
      }
      
      const response = await plansApi.getPlans(filters);
      
      if (response.success && response.data) {
        // The API returns PlansResponse with nested structure
        const plansData = response.data.plans || [];
        setPlans(Array.isArray(plansData) ? plansData : []);
      } else {
        console.error('Failed to fetch plans:', response.error);
        // Fallback to mock data for now
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      // Fallback to mock data for now
    } finally {
      setLoading(false);
    }
  };
  

  const getLimitText = (limit: number | undefined) => {
    if (limit === undefined || limit === null) return 'Not set';
    return limit === -1 ? 'Unlimited' : limit.toString();
  };

  const formatCurrency = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter and sort plans
  const filteredAndSortedPlans = (Array.isArray(plans) ? plans : [])
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
      
      if (sortBy === 'basePrice') {
        aValue = a.basePrice;
        bValue = b.basePrice;
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

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleCreatePlan = () => {
    setFormData({
      name: '',
      description: '',
      basePrice: 0,
      currency: 'USD',
      trialDays: 0,
      limits: {
        outlets: 1,
        users: 3,
        products: 100,
        customers: 500
      },
      features: [],
      isActive: true,
      isPopular: false,
      sortOrder: 0
    });
    setEditingPlan(null);
    setShowCreateForm(true);
  };

  const handleSavePlan = async () => {
    try {
      const { plansApi } = await import('@rentalshop/utils');
      
      if (editingPlan) {
        // Update existing plan
        const response = await plansApi.updatePlan(editingPlan.publicId, formData as any);
        if (response.success) {
          await fetchPlans(); // Refresh the list
        } else {
          alert('Failed to update plan: ' + response.error);
          return;
        }
      } else {
        // Create new plan
        const response = await plansApi.createPlan(formData as any);
        if (response.success) {
          await fetchPlans(); // Refresh the list
        } else {
          alert('Failed to create plan: ' + response.error);
          return;
        }
      }
      
      // Close dialog and reset form
      setShowCreateForm(false);
      setEditingPlan(null);
      setFormData({});
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Error saving plan');
    }
  };

  const handleDeletePlan = async () => {
    if (!deletingPlan) return;
    
    try {
      const { plansApi } = await import('@rentalshop/utils');
      
      const response = await plansApi.deletePlan(deletingPlan.publicId);
      if (response.success) {
        await fetchPlans(); // Refresh the list
        setDeletingPlan(null);
      } else {
        alert('Failed to delete plan: ' + response.error);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Error deleting plan');
    }
  };

  const handleCloseDialogs = () => {
    setShowCreateForm(false);
    setEditingPlan(null);
    setViewingPlan(null);
    setDeletingPlan(null);
    setFormData({
      name: '',
      description: '',
      basePrice: 0,
      currency: 'USD',
      trialDays: 14,
      limits: {
        outlets: 1,
        users: 3,
        products: 100,
        customers: -1 // Unlimited customers by default
      },
      features: [],
      isActive: true,
      isPopular: false,
      sortOrder: 0
    });
  };

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
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => window.open('/plans-preview', '_blank')}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Preview All Plans
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/plan-variants'}
            >
              <Settings2 className="w-4 h-4 mr-2" />
              Manage Variants
            </Button>
            <Button onClick={handleCreatePlan}>
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-4 h-4" />
                  <Input
                    placeholder="Search plans..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Plans Table */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Card-style rows */}
            <div className="space-y-4">
              {filteredAndSortedPlans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className="hover:shadow-md transition-shadow duration-200 border-border"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      {/* Left side - Main info */}
                      <div className="flex items-center gap-4 flex-1">
                        {/* Plan Icon */}
                        <div className="w-12 h-12 bg-gradient-to-br from-action-primary to-brand-primary rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-white" />
                        </div>
                        
                        {/* Plan Details */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-text-primary">
                              {plan.name}
                            </h3>
                            {plan.isPopular && (
                              <Badge variant="default" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Popular
                              </Badge>
                            )}
                            <StatusBadge 
                              status={plan.isActive ? 'active' : 'inactive'}
                            />
                          </div>
                          
                          <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                            {plan.description}
                          </p>
                          
                          {/* Plan Stats */}
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-text-tertiary" />
                              <span className="text-text-secondary">Price:</span>
                              <span className="font-medium text-text-primary">
                                {formatCurrency(plan.basePrice, plan.currency)}/month
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Settings2 className="w-4 h-4 text-text-tertiary" />
                              <span className="text-text-secondary">Order:</span>
                              <span className="font-medium text-text-primary">
                                #{plan.sortOrder}
                              </span>
                            </div>
                            
                            {plan.trialDays > 0 && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-text-tertiary" />
                                <span className="text-text-secondary">Trial:</span>
                                <span className="font-medium text-action-primary">
                                  {plan.trialDays} days
                                </span>
                              </div>
                            )}
                            
                            
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-text-tertiary" />
                              <span className="text-text-secondary">Users:</span>
                              <span className="font-medium text-text-primary">
                                {getLimitText(plan.limits?.users)}
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
                          onClick={() => setViewingPlan(plan)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPlan(plan);
                            setFormData(plan);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingPlan(plan)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    
                    {/* Additional Info Row */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4 text-text-tertiary" />
                            <span className="text-text-secondary">Outlets:</span>
                            <span className="font-medium">{getLimitText(plan.limits?.outlets)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CreditCard className="w-4 h-4 text-text-tertiary" />
                            <span className="text-text-secondary">Products:</span>
                            <span className="font-medium">{getLimitText(plan.limits?.products)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-text-tertiary" />
                            <span className="text-text-secondary">Customers:</span>
                            <span className="font-medium">{getLimitText(plan.limits?.customers)}</span>
                          </div>
                        </div>
                        
                        <div className="text-text-tertiary">
                          Created {formatDate(plan.createdAt.toString())}
                        </div>
                      </div>
                      
                      {/* Features Preview */}
                      <div className="mt-2">
                        <span className="text-xs text-text-secondary">
                          Features: {plan.features.slice(0, 3).join(', ')}
                          {plan.features.length > 3 && ` +${plan.features.length - 3} more`}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {filteredAndSortedPlans.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">No plans found</h3>
                <p className="text-text-secondary mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first subscription plan'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={handleCreatePlan}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Plan
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>

      {/* Create/Edit Plan Dialog */}
      <Dialog open={showCreateForm || !!editingPlan} onOpenChange={handleCloseDialogs}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </DialogTitle>
            <DialogDescription>
              {editingPlan ? 'Update the plan details below.' : 'Fill in the details to create a new subscription plan.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter plan name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  value={formData.basePrice !== undefined ? formData.basePrice : ''}
                  onChange={(e) => setFormData({...formData, basePrice: parseFloat(e.target.value) || 0})}
                  placeholder="29.99"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe what this plan includes"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive || false}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="h-4 w-4 text-action-primary focus:ring-action-primary border-gray-300 rounded"
                />
                <Label htmlFor="isActive" className="text-sm font-medium">
                  Active Plan
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={formData.isPopular || false}
                  onChange={(e) => setFormData({...formData, isPopular: e.target.checked})}
                  className="h-4 w-4 text-action-primary focus:ring-action-primary border-gray-300 rounded"
                />
                <Label htmlFor="isPopular" className="text-sm font-medium flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  Most Popular Plan
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trialDays">Trial Days</Label>
                <Input
                  id="trialDays"
                  type="number"
                  value={formData.trialDays !== undefined ? formData.trialDays : ''}
                  onChange={(e) => setFormData({...formData, trialDays: parseInt(e.target.value) || 0})}
                  placeholder="14"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  value={formData.currency || 'USD'} 
                  onValueChange={(value) => setFormData({...formData, currency: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder !== undefined ? formData.sortOrder : ''}
                  onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})}
                  placeholder="1"
                />
                <p className="text-xs text-text-tertiary">Lower numbers appear first</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <LimitInput
                id="maxOutlets"
                label="Max Outlets"
                value={formData.limits?.outlets !== undefined ? formData.limits.outlets : 1}
                onChange={(value) => setFormData({...formData, limits: {...(formData.limits || {outlets: 1, users: 3, products: 100, customers: -1}), outlets: value}})}
                placeholder="-1 (unlimited)"
                helpText="Use -1 for unlimited"
              />
              <LimitInput
                id="maxUsers"
                label="Max Users"
                value={formData.limits?.users !== undefined ? formData.limits.users : 3}
                onChange={(value) => setFormData({...formData, limits: {...(formData.limits || {outlets: 1, users: 3, products: 100, customers: -1}), users: value}})}
                placeholder="-1 (unlimited)"
                helpText="Use -1 for unlimited"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <LimitInput
                id="maxProducts"
                label="Max Products"
                value={formData.limits?.products !== undefined ? formData.limits.products : 100}
                onChange={(value) => setFormData({...formData, limits: {...(formData.limits || {outlets: 1, users: 3, products: 100, customers: -1}), products: value}})}
                placeholder="-1 (unlimited)"
                helpText="Use -1 for unlimited"
              />
              <LimitInput
                id="maxCustomers"
                label="Max Customers"
                value={formData.limits?.customers !== undefined ? formData.limits.customers : 100}
                onChange={(value) => setFormData({...formData, limits: {...(formData.limits || {outlets: 1, users: 3, products: 100, customers: -1}), customers: value}})}
                placeholder="-1 (unlimited)"
                helpText="Use -1 for unlimited"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">Features (one per line)</Label>
              <Textarea
                id="features"
                value={Array.isArray(formData.features) ? formData.features.join('\n') : ''}
                onChange={(e) => setFormData({...formData, features: e.target.value.split('\n').filter(f => f.trim())})}
                placeholder="Basic order management&#10;Customer management&#10;Product catalog"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialogs}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan}>
              {editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Plan Dialog */}
      <Dialog open={!!viewingPlan} onOpenChange={() => setViewingPlan(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plan Details</DialogTitle>
            <DialogDescription>
              View the complete details of this subscription plan.
            </DialogDescription>
          </DialogHeader>
          
          {viewingPlan && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Plan Name</Label>
                  <p className="text-lg font-semibold">{viewingPlan.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Base Price</Label>
                  <p className="text-lg font-semibold">
                    {formatCurrency(viewingPlan.basePrice, viewingPlan.currency)}/month
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-text-secondary">Description</Label>
                <p className="text-text-primary">{viewingPlan.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Trial Days</Label>
                  <p className="text-text-primary">{viewingPlan.trialDays} days</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Currency</Label>
                  <p className="text-text-primary">{viewingPlan.currency}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Max Outlets</Label>
                  <p className="text-text-primary">{getLimitText(viewingPlan.limits?.outlets)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Max Users</Label>
                  <p className="text-text-primary">{getLimitText(viewingPlan.limits?.users)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Max Products</Label>
                  <p className="text-text-primary">{getLimitText(viewingPlan.limits?.products)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Max Customers</Label>
                  <p className="text-text-primary">{getLimitText(viewingPlan.limits?.customers)}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-text-secondary">Features</Label>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {Array.isArray(viewingPlan.features) && viewingPlan.features.map((feature, index) => (
                    <li key={index} className="text-text-primary">{feature}</li>
                  ))}
                </ul>
              </div>

            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingPlan(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Dialog */}
      <Dialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingPlan?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPlan(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePlan}>
              Delete Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
