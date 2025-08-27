'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  Button,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Textarea
} from '@rentalshop/ui';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Building2, 
  MapPin, 
  Phone,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuth } from '@rentalshop/hooks';
import { outletsApi } from '@rentalshop/utils';
import { Outlet, OutletCreateInput, OutletUpdateInput } from '@rentalshop/types';

interface OutletFormData {
  name: string;
  address: string;
  phone: string;
  description: string;
}

export default function OutletsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [formData, setFormData] = useState<OutletFormData>({
    name: '',
    address: '',
    phone: '',
    description: ''
  });

  const merchantId = user?.merchant?.id;
  
  // Debug logging
  console.log('🔍 OutletsPage render - user:', user);
  console.log('🔍 OutletsPage render - merchantId:', merchantId);
  console.log('🔍 OutletsPage render - outlets state:', outlets);
  console.log('🔍 OutletsPage render - loading state:', loading);

  useEffect(() => {
    if (!merchantId) return;
    fetchOutlets();
  }, [merchantId]);

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching outlets for merchant:', merchantId);
      
      const result = await outletsApi.getOutletsByMerchant(Number(merchantId));
      console.log('📥 Outlets API response:', result);
      
      if (result.success) {
        // API returns { success: true, data: { outlets: Outlet[], total, page, totalPages } }
        const outletsData = result.data?.outlets || [];
        console.log('✅ Setting outlets state:', outletsData);
        setOutlets(outletsData);
      } else {
        console.error('❌ Failed to fetch outlets:', result.error);
        setOutlets([]); // Ensure outlets is always an array
      }
    } catch (error) {
      console.error('💥 Error fetching outlets:', error);
      setOutlets([]); // Ensure outlets is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingOutlet) {
        // Update existing outlet
        const result = await outletsApi.updateOutlet(editingOutlet.id, {
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          description: formData.description
        });
        
        if (result.success) {
          await fetchOutlets();
          setShowAddDialog(false);
          setEditingOutlet(null);
          resetForm();
        } else {
          alert(result.error || 'Failed to update outlet');
        }
      } else {
        // Create new outlet
        const result = await outletsApi.createOutlet({
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          description: formData.description,
          merchantId: Number(merchantId)
        });
        
        if (result.success) {
          await fetchOutlets();
          setShowAddDialog(false);
          resetForm();
        } else {
          alert(result.error || 'Failed to create outlet');
        }
      }
    } catch (error) {
      console.error('Error saving outlet:', error);
      alert('An error occurred while saving the outlet');
    }
  };

  const handleEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setFormData({
      name: outlet.name,
      address: outlet.address || '',
      phone: outlet.phone || '',
      description: outlet.description || ''
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (outlet: Outlet) => {
    if (!confirm(`Are you sure you want to delete the outlet "${outlet.name}"?`)) {
      return;
    }

    try {
      const result = await outletsApi.deleteOutlet(outlet.id);
      if (result.success) {
        await fetchOutlets();
      } else {
        alert(result.error || 'Failed to delete outlet');
      }
    } catch (error) {
      console.error('Error deleting outlet:', error);
      alert('An error occurred while deleting the outlet');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      description: ''
    });
    setEditingOutlet(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

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
    <PageWrapper>
      <PageHeader>
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Outlets</PageTitle>
            <p className="text-gray-600">Manage your business outlets and branches</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                // TODO: Implement export functionality
                alert('Export functionality coming soon!');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-md flex items-center text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export
            </button>
            <Button 
              onClick={openAddDialog}
              className="bg-green-600 hover:bg-green-700 text-white h-9 px-4"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Outlet
            </Button>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-600">
              Loading outlets...
            </CardContent>
          </Card>
        ) : outlets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-600">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No Outlets Found</h3>
              <p className="text-sm text-gray-500 mb-4">
                You haven't created any outlets yet. Create your first outlet to get started.
              </p>
              <Button onClick={openAddDialog} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Outlet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(outlets) && outlets.length > 0 ? (
                    outlets.map((outlet) => (
                      <TableRow key={outlet.id}>
                        <TableCell className="font-medium">{outlet.name}</TableCell>
                        <TableCell>
                          {outlet.address ? (
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="w-4 h-4" />
                              {outlet.address}
                            </div>
                          ) : (
                            <span className="text-gray-400">No address</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {outlet.phone ? (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="w-4 h-4" />
                              {outlet.phone}
                            </div>
                          ) : (
                            <span className="text-gray-400">No phone</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={outlet.isActive ? "default" : "destructive"}>
                            {outlet.isActive ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            {outlet.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {new Date(outlet.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(outlet)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(outlet)}
                              className="flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2 text-gray-500">
                          <Building2 className="w-8 h-8" />
                          {loading ? 'Loading outlets...' : 'No outlets found'}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Outlet Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingOutlet ? 'Edit Outlet' : 'Add New Outlet'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter outlet address"
                  rows={3}
                />
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
                    setShowAddDialog(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingOutlet ? 'Update Outlet' : 'Create Outlet'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageContent>
    </PageWrapper>
  );
}
