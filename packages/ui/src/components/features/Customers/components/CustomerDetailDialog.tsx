'use client'

import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { User, UserX, Building, Calendar, Phone, Mail, Home, FileText, Trash2 } from 'lucide-react';
import type { Customer, Merchant } from '@rentalshop/types';

interface CustomerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onDelete?: (customerId: number) => Promise<void>;
}

export const CustomerDetailDialog: React.FC<CustomerDetailDialogProps> = ({
  open,
  onOpenChange,
  customer,
  onDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoadingMerchant, setIsLoadingMerchant] = useState(false);

  // Fetch merchant information when customer changes
  useEffect(() => {
    const fetchMerchant = async () => {
      if (!customer?.merchantId) {
        console.log('🔍 CustomerDetailDialog: No merchantId found for customer:', customer);
        setMerchant(null);
        return;
      }

      try {
        setIsLoadingMerchant(true);
        console.log('🔍 CustomerDetailDialog: Fetching merchant with ID:', customer.merchantId);
        
        const { merchantsApi } = await import('@rentalshop/utils');
        const response = await merchantsApi.getMerchantById(customer.merchantId);
        
        console.log('🔍 CustomerDetailDialog: Merchant API response:', response);
        
        if (response.success && response.data) {
          console.log('✅ CustomerDetailDialog: Merchant fetched successfully:', response.data);
          setMerchant(response.data as any); // TODO: Fix Merchant type compatibility between utils and types packages
        } else {
          console.error('❌ CustomerDetailDialog: Merchant API error:', response.error);
          setMerchant(null);
        }
      } catch (error) {
        console.error('❌ CustomerDetailDialog: Error fetching merchant:', error);
        setMerchant(null);
      } finally {
        setIsLoadingMerchant(false);
      }
    };

    fetchMerchant();
  }, [customer?.merchantId]);

  if (!customer) return null;

  const formatDate = (date: Date | string) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeStyle = (isActive: boolean) => {
    if (isActive) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
    } else {
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    }
  };

  const getStatusDisplayName = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const handleDelete = async () => {
    if (!customer || !onDelete) return;
    
    try {
      setIsDeleting(true);
      await onDelete(customer.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting customer:', error);
      // Error handling will be done by the parent component
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Customer Details
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                View customer information and details
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            {/* Customer Overview */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                  Customer Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <p className="text-gray-900 text-base font-medium">{`${customer.firstName} ${customer.lastName}`}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <p className="text-gray-900 text-base">{customer.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <p className="text-gray-900 text-base">{customer.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <p className="text-gray-900 text-base">
                      {customer.dateOfBirth ? formatDate(customer.dateOfBirth) : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyle(customer.isActive)}`}>
                      {getStatusDisplayName(customer.isActive)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer ID</label>
                    <p className="text-gray-500 text-sm font-mono">{customer.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
                    <p className="text-gray-900 text-base">{formatDate(customer.createdAt)}</p>
                  </div>
                                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Updated</label>
                  <p className="text-gray-900 text-base">{formatDate(customer.updatedAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Merchant</label>
                  <p className="text-gray-900 text-base">
                    {isLoadingMerchant ? (
                      <span className="text-gray-500">Loading...</span>
                    ) : merchant ? (
                      merchant.name
                    ) : (
                      <span className="text-gray-500">
                        Not available {customer.merchantId ? `(ID: ${customer.merchantId})` : '(No merchant ID)'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

            {/* Address Information */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                    <p className="text-gray-900 text-base">
                      {customer.address || 'No address provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <p className="text-gray-900 text-base">
                      {customer.city || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                    <p className="text-gray-900 text-base">
                      {customer.state || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ZIP/Postal Code</label>
                    <p className="text-gray-900 text-base">
                      {customer.zipCode || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <p className="text-gray-900 text-base">
                      {customer.country || 'Not specified'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
          <DialogFooter className="flex justify-between">
            <div>
              {onDelete && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Customer</span>
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-red-600">
              Delete Customer
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Are you sure you want to delete <strong>{customer?.firstName} {customer?.lastName}</strong>? 
              This action cannot be undone and will permanently remove all customer data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Customer'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
