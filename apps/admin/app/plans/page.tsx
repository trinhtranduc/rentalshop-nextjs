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
  Badge
} from '@rentalshop/ui';
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
  Settings
} from 'lucide-react';

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  trialDays: number;
  maxOutlets: number;
  maxUsers: number;
  maxProducts: number;
  maxCustomers: number;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('sortOrder');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const response = await fetch('http://localhost:3002/api/plans', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPlans(data.data);
        }
      } else {
        console.error('Failed to fetch plans');
        // Fallback to mock data for now
        setMockData();
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      // Fallback to mock data for now
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    setPlans([
      {
        id: 1,
        name: 'Basic',
        description: 'Perfect for small rental businesses just getting started',
        price: 29,
        currency: 'USD',
        billingCycle: 'monthly',
        trialDays: 14,
        maxOutlets: 1,
        maxUsers: 3,
        maxProducts: 50,
        maxCustomers: 100,
        features: [
          'Basic inventory management',
          'Customer database',
          'Order processing',
          'Basic reporting',
          'Email support'
        ],
        isPopular: false,
        isActive: true,
        sortOrder: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        name: 'Professional',
        description: 'Ideal for growing rental businesses with multiple outlets',
        price: 79,
        currency: 'USD',
        billingCycle: 'monthly',
        trialDays: 30,
        maxOutlets: 5,
        maxUsers: 15,
        maxProducts: 200,
        maxCustomers: 500,
        features: [
          'Advanced inventory management',
          'Multi-outlet support',
          'Advanced analytics',
          'Customer loyalty program',
          'Priority support',
          'API access',
          'Custom branding'
        ],
        isPopular: true,
        isActive: true,
        sortOrder: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 3,
        name: 'Enterprise',
        description: 'For large rental operations with complex needs',
        price: 199,
        currency: 'USD',
        billingCycle: 'monthly',
        trialDays: 30,
        maxOutlets: -1, // Unlimited
        maxUsers: -1, // Unlimited
        maxProducts: -1, // Unlimited
        maxCustomers: -1, // Unlimited
        features: [
          'Unlimited everything',
          'Advanced automation',
          'White-label solution',
          'Dedicated account manager',
          'Custom integrations',
          'Advanced security',
          'SLA guarantee'
        ],
        isPopular: false,
        isActive: true,
        sortOrder: 3,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]);
  };

  const getBillingCycleText = (cycle: string) => {
    return cycle === 'monthly' ? '/month' : '/year';
  };

  const getLimitText = (limit: number) => {
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
  const filteredAndSortedPlans = plans
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

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
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
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </Button>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th 
                      className="text-left py-3 px-4 font-medium text-text-primary cursor-pointer hover:bg-bg-secondary"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Plan Name
                        {sortBy === 'name' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-text-primary cursor-pointer hover:bg-bg-secondary"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center gap-2">
                        Price
                        {sortBy === 'price' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-text-primary">Limits</th>
                    <th className="text-left py-3 px-4 font-medium text-text-primary">Features</th>
                    <th className="text-left py-3 px-4 font-medium text-text-primary">Status</th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-text-primary cursor-pointer hover:bg-bg-secondary"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-2">
                        Created
                        {sortBy === 'createdAt' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedPlans.map((plan) => (
                    <tr key={plan.id} className="border-b border-border hover:bg-bg-secondary">
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-text-primary flex items-center gap-2">
                            {plan.name}
                            {plan.isPopular && (
                              <Badge variant="default" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Popular
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-text-secondary mt-1 max-w-xs truncate">
                            {plan.description}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-text-primary">
                            {formatCurrency(plan.price, plan.currency)}
                            <span className="text-sm text-text-secondary font-normal">
                              {getBillingCycleText(plan.billingCycle)}
                            </span>
                          </div>
                          {plan.trialDays > 0 && (
                            <div className="text-xs text-action-primary mt-1">
                              {plan.trialDays}-day trial
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="w-3 h-3 text-text-tertiary" />
                            <span className="text-text-secondary">Outlets:</span>
                            <span className="font-medium">{getLimitText(plan.maxOutlets)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3 text-text-tertiary" />
                            <span className="text-text-secondary">Users:</span>
                            <span className="font-medium">{getLimitText(plan.maxUsers)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-3 h-3 text-text-tertiary" />
                            <span className="text-text-secondary">Products:</span>
                            <span className="font-medium">{getLimitText(plan.maxProducts)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3 text-text-tertiary" />
                            <span className="text-text-secondary">Customers:</span>
                            <span className="font-medium">{getLimitText(plan.maxCustomers)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-text-secondary">
                          {plan.features.length} features
                        </div>
                        <div className="text-xs text-text-tertiary mt-1">
                          {plan.features.slice(0, 2).join(', ')}
                          {plan.features.length > 2 && '...'}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge 
                          status={plan.isActive ? 'active' : 'inactive'}
                          text={plan.isActive ? 'Active' : 'Inactive'}
                        />
                      </td>
                      <td className="py-4 px-4 text-sm text-text-secondary">
                        {formatDate(plan.createdAt)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPlan(plan)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPlan(plan)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Toggle plan status
                              setPlans(plans.map(p => 
                                p.id === plan.id ? { ...p, isActive: !p.isActive } : p
                              ));
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
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
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Plan
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-action-primary">
                  {plans.length}
                </div>
                <div className="text-sm text-text-secondary">Total Plans</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-action-success">
                  {plans.filter(p => p.isActive).length}
                </div>
                <div className="text-sm text-text-secondary">Active Plans</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-secondary">
                  {plans.filter(p => p.isPopular).length}
                </div>
                <div className="text-sm text-text-secondary">Featured Plans</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-action-primary">
                  {plans.filter(p => p.trialDays > 0).length}
                </div>
                <div className="text-sm text-text-secondary">Plans with Trial</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageWrapper>
  );
}
