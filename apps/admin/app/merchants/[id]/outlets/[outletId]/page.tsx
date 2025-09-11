'use client';

import React, { useState, useEffect } from 'react';
import { getAuthToken } from '@rentalshop/utils';
import { useParams, useRouter } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
  Label,
  StatusBadge,
  ToastContainer,
  useToasts
} from '@rentalshop/ui';
import { Building2, Edit, ArrowLeft, Users, Package, ShoppingCart } from 'lucide-react';
import type { Outlet } from '@rentalshop/types';

interface OutletDetail {
  id: number;
  name: string;
  address: string;
  phone: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
  };
}

export default function OutletDetailPage() {
  const { toasts, showSuccess, showError, removeToast } = useToasts();
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;
  const outletId = params.outletId as string;
  
  const [outlet, setOutlet] = useState<OutletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<OutletDetail>>({});

  useEffect(() => {
    fetchOutletDetail();
  }, [outletId]);

  const fetchOutletDetail = async () => {
    try {
      setLoading(true);
      
      // Get auth token from localStorage
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token found');
        setError('Authentication required');
        return;
      }

      const response = await fetch(`http://localhost:3002/api/merchants/${merchantId}/outlets/${outletId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOutlet(data.data);
          setEditData(data.data);
        } else {
          setError(data.message || 'Failed to fetch outlet details');
        }
      } else {
        console.error('Failed to fetch outlet details');
        // Fallback to mock data for now
      }
    } catch (error) {
      console.error('Error fetching outlet details:', error);
      setError('Failed to fetch outlet details');
      // Fallback to mock data for now
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Get auth token from localStorage
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token found');
        setError('Authentication required');
        return;
      }

      const response = await fetch(`http://localhost:3002/api/merchants/${merchantId}/outlets/${outletId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOutlet(data.data);
          setIsEditing(false);
          // Show success toast
          showSuccess('Outlet updated', 'Changes saved successfully.');
        } else {
          const msg = data.message || 'Failed to update outlet';
          setError(msg);
          showError('Update failed', msg);
        }
      } else {
        console.error('Failed to update outlet');
        setError('Failed to update outlet');
        showError('Update failed', 'Server returned an error.');
      }
    } catch (error) {
      console.error('Error updating outlet:', error);
      setError('Failed to update outlet');
      showError('Update failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleCancel = () => {
    setEditData(outlet || {});
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof OutletDetail, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleViewUsers = () => {
    router.push(`/merchants/${merchantId}/outlets/${outletId}/users`);
  };

  const handleViewProducts = () => {
    router.push(`/merchants/${merchantId}/outlets/${outletId}/products`);
  };

  const handleViewOrders = () => {
    router.push(`/merchants/${merchantId}/outlets/${outletId}/orders`);
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Outlet Details</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8">Loading outlet details...</div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Outlet Details</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8 text-red-500">Error: {error}</div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (!outlet) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Outlet Details</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8">Outlet not found</div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/merchants/${merchantId}/outlets`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Outlets
            </Button>
            <PageTitle>{outlet.name}</PageTitle>
          </div>
          <div className="flex space-x-2">
            {!isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Outlet
              </Button>
            )}
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div className="space-y-6">
          {/* Outlet Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Outlet Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={editData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={editData.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleSave}>Save Changes</Button>
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Name</Label>
                      <p className="text-lg font-medium">{outlet.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Phone</Label>
                      <p className="text-lg">{outlet.phone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium text-gray-500">Address</Label>
                      <p className="text-lg">{outlet.address}</p>
                    </div>
                    {outlet.description && (
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium text-gray-500">Description</Label>
                        <p className="text-lg">{outlet.description}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <StatusBadge 
                      status={outlet.isActive ? 'active' : 'inactive'}
                      variant={outlet.isActive ? 'success' : 'destructive'}
                    >
                      {outlet.isActive ? 'Active' : 'Inactive'}
                    </StatusBadge>
                    {outlet.isDefault && (
                      <StatusBadge status="default" variant="default">
                        Default Outlet
                      </StatusBadge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Users
                </CardTitle>
                <Users className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {outlet.stats.totalUsers}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total staff members
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleViewUsers}
                >
                  View Users
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Products
                </CardTitle>
                <Package className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {outlet.stats.totalProducts}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Available items
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleViewProducts}
                >
                  View Products
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Orders
                </CardTitle>
                <ShoppingCart className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {outlet.stats.totalOrders}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total orders
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleViewOrders}
                >
                  View Orders
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>Timestamps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created</Label>
                  <p className="text-lg">{new Date(outlet.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                  <p className="text-lg">{new Date(outlet.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageWrapper>
  );
}
